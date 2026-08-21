"""
Data endpoints.

Everything the browser used to fetch from PostgREST now comes through here.
Each handler builds a Supa bound to the caller's JWT, so row-level security
still decides what comes back — this layer shapes and names things, it does not
grant access.

Two consequences worth knowing:
  * An admin sees more from the same endpoint than a subscriber does, because
    is_admin() widens the policy, not because of a branch in Python.
  * A handler that forgets a filter returns fewer rows, not somebody else's.
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from emails import Email

from auth import CurrentUser, User
from supa import Supa

router = APIRouter(tags=["data"])

SOURCE_BUCKET = "source-files"
ARTICLE_BUCKET = "article-images"
IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


# ------------------------------------------------------------------ profiles

@router.get("/profiles")
async def list_profiles(user: User = CurrentUser):
    """Admins get everyone; anyone else gets exactly themselves. That split is
    the RLS policy, not a check here."""
    return await Supa(user.token).select("profiles", {"select": "*", "order": "created_at.desc"})


class ProfilePatch(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    job_title: str | None = None
    timezone: str | None = None
    date_format: str | None = None
    role: str | None = None
    notify: dict[str, Any] | None = None


@router.patch("/profiles/{profile_id}")
async def update_profile(profile_id: str, body: ProfilePatch, user: User = CurrentUser):
    patch = body.model_dump(exclude_none=True)
    if not patch:
        raise HTTPException(status_code=400, detail="Nothing to update")
    # `role` is deliberately NOT filtered out here. The protect_profile_columns
    # trigger pins it for non-admins in the database, which holds no matter
    # what this endpoint sends.
    rows = await Supa(user.token).update("profiles", {"id": f"eq.{profile_id}"}, patch)
    if not rows:
        raise HTTPException(status_code=403, detail="Not allowed to update that profile")
    return rows[0]


# ---------------------------------------------------------------- workspaces

@router.get("/workspaces/members")
async def workspace_members(user_id: str | None = None, user: User = CurrentUser):
    params = {"select": "role,workspace_id,workspaces(name)"}
    if user_id:
        params["user_id"] = f"eq.{user_id}"
    return await Supa(user.token).select("workspace_members", params)


# ---------------------------------------------------------------------- runs

@router.get("/runs")
async def list_runs(
    workspace_id: str | None = None,
    created_by: str | None = None,
    limit: int = 200,
    user: User = CurrentUser,
):
    params: dict[str, Any] = {
        "select": "id,source_name,source_path,status,total_rows,rows_passing,rows_failing,"
        "quality_score,rules_used,created_at,workspaces(name),profiles(email)",
        "order": "created_at.desc",
        "limit": str(max(1, min(limit, 500))),
    }
    if workspace_id:
        params["workspace_id"] = f"eq.{workspace_id}"
    if created_by:
        params["created_by"] = f"eq.{created_by}"
    return await Supa(user.token).select("runs", params)


class RunStart(BaseModel):
    workspace_id: str
    source_name: str


@router.post("/runs")
async def create_run(body: RunStart, user: User = CurrentUser):
    rows = await Supa(user.token).insert(
        "runs",
        {
            "workspace_id": body.workspace_id,
            # Taken from the verified token, never from the request body — a
            # client must not be able to attribute a run to someone else.
            "created_by": user.id,
            "source_name": body.source_name,
            "status": "running",
        },
    )
    if not rows:
        raise HTTPException(status_code=403, detail="Not allowed to start a run in that workspace")
    return rows[0]


class RunFinish(BaseModel):
    rules_used: str = "bundled_workday_hcm"
    total_rows: int = 0
    rows_passing: int = 0
    rows_failing: int = 0
    findings: list[dict[str, Any]] = []


@router.post("/runs/{run_id}/complete")
async def complete_run(run_id: str, body: RunFinish, user: User = CurrentUser):
    supa = Supa(user.token)
    await supa.update(
        "runs",
        {"id": f"eq.{run_id}"},
        {
            "status": "complete",
            "rules_used": body.rules_used,
            "total_rows": body.total_rows,
            "rows_passing": body.rows_passing,
            "rows_failing": body.rows_failing,
        },
    )
    if body.findings:
        # run_id comes from the path, so a client cannot smuggle findings onto
        # a run it does not own — RLS checks the run behind it either way.
        rows = [{**f, "run_id": run_id} for f in body.findings]
        await supa.insert("findings", rows, returning=False)
    return {"ok": True}


@router.post("/runs/{run_id}/fail")
async def fail_run(run_id: str, message: str = Body(embed=True), user: User = CurrentUser):
    await Supa(user.token).update(
        "runs", {"id": f"eq.{run_id}"}, {"status": "failed", "error_message": message[:500]}
    )
    return {"ok": True}


@router.get("/runs/{run_id}/findings")
async def run_findings(run_id: str, limit: int = 500, user: User = CurrentUser):
    return await Supa(user.token).select(
        "findings",
        {
            "run_id": f"eq.{run_id}",
            "select": "id,row_num,field,rule_id,current_value,issue,severity,suggested_fix,fixed_value",
            "order": "row_num",
            "limit": str(max(1, min(limit, 1000))),
        },
    )


class Fix(BaseModel):
    row_num: int
    field: str
    value: str


@router.post("/runs/{run_id}/fixes")
async def save_fixes(run_id: str, fixes: list[Fix], user: User = CurrentUser):
    supa = Supa(user.token)
    from datetime import datetime, timezone as tz

    now = datetime.now(tz.utc).isoformat()
    for f in fixes:
        await supa.update(
            "findings",
            {"run_id": f"eq.{run_id}", "row_num": f"eq.{f.row_num}", "field": f"eq.{f.field}"},
            {"fixed_value": f.value, "fixed_at": now, "fixed_by": user.id},
        )
    return {"updated": len(fixes)}


# ------------------------------------------------------------------- storage

@router.post("/runs/{run_id}/source")
async def upload_source(
    run_id: str,
    workspace_id: str = Form(...),
    file: UploadFile = File(...),
    user: User = CurrentUser,
):
    """Object key is <workspace>/<run>/<filename> — the storage policy reads
    that first segment, so the key layout IS the authorization model."""
    data = await file.read()
    safe = (file.filename or "upload.csv").replace("/", "-")
    path = f"{workspace_id}/{run_id}/{safe}"
    supa = Supa(user.token)
    await supa.upload(SOURCE_BUCKET, path, data, file.content_type or "text/csv")
    await supa.update("runs", {"id": f"eq.{run_id}"}, {"source_path": path})
    return {"path": path}


@router.get("/storage/source-url")
async def source_url(path: str, user: User = CurrentUser):
    return {"url": await Supa(user.token).signed_url(SOURCE_BUCKET, path, 60)}


@router.post("/article-images")
async def upload_article_image(file: UploadFile = File(...), user: User = CurrentUser):
    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller")
    if (file.content_type or "") not in IMAGE_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported image type: {file.content_type}")
    safe = (file.filename or "image").replace("/", "-")
    path = f"{uuid.uuid4().hex[:12]}-{safe}"
    supa = Supa(user.token)
    await supa.upload(ARTICLE_BUCKET, path, data, file.content_type or "image/png")
    return {"url": supa.public_url(ARTICLE_BUCKET, path)}


# ------------------------------------------------------------------- tickets

@router.get("/tickets")
async def list_tickets(user_id: str | None = None, user: User = CurrentUser):
    params = {
        "select": "*,profiles(email,first_name,last_name)",
        "order": "created_at.desc",
    }
    if user_id:
        params["user_id"] = f"eq.{user_id}"
    return await Supa(user.token).select("support_tickets", params)


class NewTicket(BaseModel):
    subject: str
    description: str = ""
    priority: str = "Normal"
    workspace_id: str | None = None
    context: dict[str, Any] = {}


@router.post("/tickets")
async def create_ticket(body: NewTicket, user: User = CurrentUser):
    rows = await Supa(user.token).insert(
        "support_tickets",
        {**body.model_dump(), "user_id": user.id},
    )
    return rows[0] if rows else {}


@router.patch("/tickets/{ticket_id}")
async def set_ticket_status(ticket_id: str, status: str = Body(embed=True), user: User = CurrentUser):
    if status not in {"open", "pending", "resolved"}:
        raise HTTPException(status_code=400, detail="Unknown status")
    rows = await Supa(user.token).update("support_tickets", {"id": f"eq.{ticket_id}"}, {"status": status})
    if not rows:
        raise HTTPException(status_code=403, detail="Only staff can change ticket status")
    return rows[0]


# -------------------------------------------------------------- help content

@router.get("/help/articles")
async def list_articles(published_only: bool = True, user: User = CurrentUser):
    params: dict[str, Any] = {"select": "*", "order": "position"}
    if published_only:
        params["published"] = "eq.true"
    return await Supa(user.token).select("help_articles", params)


@router.put("/help/articles")
async def save_article(body: dict[str, Any], user: User = CurrentUser):
    rows = await Supa(user.token).upsert("help_articles", body, on_conflict="slug")
    if not rows:
        raise HTTPException(status_code=403, detail="Only staff can publish articles")
    return rows[0]


@router.delete("/help/articles/{slug}")
async def delete_article(slug: str, user: User = CurrentUser):
    await Supa(user.token).delete("help_articles", {"slug": f"eq.{slug}"})
    return {"ok": True}


@router.get("/help/faqs")
async def list_faqs(published_only: bool = True, user: User = CurrentUser):
    params: dict[str, Any] = {"select": "*", "order": "position"}
    if published_only:
        params["published"] = "eq.true"
    return await Supa(user.token).select("help_faqs", params)


@router.post("/help/faqs")
async def create_faq(body: dict[str, Any], user: User = CurrentUser):
    rows = await Supa(user.token).insert("help_faqs", body)
    if not rows:
        raise HTTPException(status_code=403, detail="Only staff can add FAQs")
    return rows[0]


@router.delete("/help/faqs/{faq_id}")
async def delete_faq(faq_id: str, user: User = CurrentUser):
    await Supa(user.token).delete("help_faqs", {"id": f"eq.{faq_id}"})
    return {"ok": True}


# ------------------------------------------------------------------ contact

class ContactRequest(BaseModel):
    name: str
    email: Email
    company: str = ""
    interest: str = ""
    message: str = ""


@router.post("/contact")
async def submit_contact(body: ContactRequest):
    """The only endpoint with no auth: it backs the public marketing form.
    Anonymous callers may insert and may not read — otherwise the contact form
    would double as a scraper for every lead in the table."""
    await Supa().insert("contact_requests", body.model_dump(), returning=False)
    return {"ok": True}


@router.get("/contact")
async def list_contact(user: User = CurrentUser):
    return await Supa(user.token).select("contact_requests", {"select": "*", "order": "created_at.desc"})


# -------------------------------------------------------------------- admin

@router.get("/admin/overview")
async def admin_overview(user: User = CurrentUser):
    """Counts for the admin console. RLS means a non-admin gets their own
    narrow numbers rather than an error, which is the correct outcome."""
    supa = Supa(user.token)
    return {
        "users": await supa.count("profiles"),
        "workspaces": await supa.count("workspaces"),
        "runs": await supa.count("runs"),
        "open_tickets": await supa.count("support_tickets", {"status": "eq.open"}),
        "new_enquiries": await supa.count("contact_requests", {"handled": "eq.false"}),
    }
