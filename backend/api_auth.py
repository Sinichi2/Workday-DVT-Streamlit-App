"""
Auth, proxied.

The browser used to call Supabase Auth directly, which meant the project URL
and anon key had to ship in the JS bundle. These endpoints move that server
side: the frontend posts credentials here, we talk to GoTrue, and only the
resulting session comes back.

Worth being honest about what this does and does not achieve. It removes the
Supabase config from the bundle and gives you one place to add rate limiting,
audit or lockout. It does NOT hide the access token — the browser has to hold
something to prove who it is on the next request. That is true of every design.
"""
from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, Field

from emails import Email

import httpx

from auth import CurrentUser, User
from supa import ANON_KEY, AUTH, Supa, _fail, gotrue

router = APIRouter(prefix="/auth", tags=["auth"])

MIN_PASSWORD = 12


class Credentials(BaseModel):
    email: Email
    # Enforced here as well as in the UI: a client-side check is a courtesy,
    # not a control.
    password: str = Field(min_length=MIN_PASSWORD)


class SignUp(Credentials):
    first_name: str = ""
    last_name: str = ""
    #: Where the confirmation link should land. Sent by the browser so the app
    #: works from any origin; Supabase still rejects anything not on the
    #: project's Redirect URLs allow-list.
    redirect_to: str | None = None


@router.post("/signup")
async def signup(body: SignUp):
    data = await gotrue(
        "signup",
        {
            "email": body.email,
            "password": body.password,
            # The handle_new_user trigger reads these into the profile row.
            "data": {"first_name": body.first_name, "last_name": body.last_name},
        },
        redirect_to=body.redirect_to,
    )
    # No session means the project requires email confirmation.
    return {"session": data.get("access_token") and data or None, "confirm_email": not data.get("access_token")}


@router.post("/signin")
async def signin(body: Credentials):
    data = await gotrue("token?grant_type=password", {"email": body.email, "password": body.password})
    return _session(data)


@router.post("/refresh")
async def refresh(refresh_token: str = Body(embed=True)):
    data = await gotrue("token?grant_type=refresh_token", {"refresh_token": refresh_token})
    return _session(data)


@router.post("/signout")
async def signout(user: User = CurrentUser):
    try:
        await gotrue("logout", {}, token=user.token)
    except HTTPException as e:
        # GoTrue 401/403s a token it has already revoked — a second sign-out, or
        # one racing an expiry. The session is gone either way, which is what
        # the caller asked for, so reporting failure would be a lie.
        if e.status_code not in (401, 403):
            raise
    return {"ok": True}


class ResetRequest(BaseModel):
    email: Email
    redirect_to: str | None = None


@router.post("/reset")
async def request_reset(body: ResetRequest):
    await gotrue("recover", {"email": body.email}, redirect_to=body.redirect_to)
    # Always the same answer. Confirming which addresses have accounts turns
    # this endpoint into an account-enumeration oracle.
    return {"ok": True}


class NewPassword(BaseModel):
    password: str = Field(min_length=MIN_PASSWORD)


@router.put("/password")
async def set_password(body: NewPassword, user: User = CurrentUser):
    """Used by the reset flow: the recovery link signs the user in with a
    short-lived session, and this sets the new password with it."""
    return await _update_user({"password": body.password}, user.token)


@router.get("/me")
async def me(user: User = CurrentUser):
    """Profile + workspace for the signed-in caller. One call so the client
    doesn't have to stitch three requests together on every load."""
    supa = Supa(user.token)
    profiles = await supa.select("profiles", {"id": f"eq.{user.id}", "select": "*", "limit": "1"})
    memberships = await supa.select(
        "workspace_members", {"select": "role,workspace_id,workspaces(*)", "limit": "1"}
    )

    profile = profiles[0] if profiles else None
    workspace = memberships[0]["workspaces"] if memberships else None
    role = memberships[0]["role"] if memberships else None

    # First sign-in has no workspace yet. The on_workspace_created trigger
    # makes the creator its owner, so this one insert is the whole setup.
    if profile and not workspace:
        created = await supa.insert("workspaces", {"name": "My Workspace", "created_by": user.id})
        workspace = created[0] if created else None
        role = "owner"

    return {"profile": profile, "workspace": workspace, "workspace_role": role}


async def _update_user(patch: dict, token: str) -> dict:
    async with httpx.AsyncClient(timeout=20.0) as c:
        r = await c.put(
            f"{AUTH}/user",
            json=patch,
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
    if r.status_code >= 400:
        raise _fail(r)
    return {"ok": True}


def _session(data: dict) -> dict:
    """Only the fields the client needs. GoTrue returns more than that."""
    return {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "expires_at": data.get("expires_at"),
        "user": {"id": (data.get("user") or {}).get("id"), "email": (data.get("user") or {}).get("email")},
    }
