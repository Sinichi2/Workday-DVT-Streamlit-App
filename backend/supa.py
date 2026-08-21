"""
Supabase access, server-side only.

The browser no longer talks to Supabase at all — it calls this API, and this
module is the single place that reaches PostgREST, Storage and GoTrue.

The important choice here: requests carry the CALLER'S JWT, not the service
key. The service key bypasses row-level security entirely, which would make
every endpoint below solely responsible for authorization — one missing check
and a tenant leaks. Forwarding the user's token keeps Postgres enforcing the
same policies it always did, so this layer is a choke point rather than a new
trust boundary.

`service()` exists for the few operations that legitimately need to act outside
any user's rights. Reach for it deliberately, never as a convenience.
"""
from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import HTTPException

SUPABASE_URL = os.environ.get("VALIGO_SUPABASE_URL", "").rstrip("/")
ANON_KEY = os.environ.get("VALIGO_SUPABASE_PUBLISHABLE_KEY", "")
SERVICE_KEY = os.environ.get("VALIGO_SUPABASE_SECRET_KEY", "")

REST = f"{SUPABASE_URL}/rest/v1"
AUTH = f"{SUPABASE_URL}/auth/v1"
STORAGE = f"{SUPABASE_URL}/storage/v1"

_TIMEOUT = httpx.Timeout(20.0, connect=10.0)


class Supa:
    """PostgREST/Storage bound to one identity for the life of a request."""

    def __init__(self, token: str | None = None, *, privileged: bool = False):
        if not SUPABASE_URL or not ANON_KEY:
            raise HTTPException(status_code=503, detail="Supabase is not configured")
        key = SERVICE_KEY if privileged else ANON_KEY
        # apikey identifies the project; Authorization decides who you are.
        # Anonymous callers fall back to the anon key, which RLS treats as the
        # `anon` role — exactly what the public contact form needs.
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {token or key}",
            "Content-Type": "application/json",
        }

    # ---------------------------------------------------------------- REST

    async def select(self, table: str, params: dict[str, Any] | None = None) -> list[dict]:
        return await self._request("GET", f"{REST}/{table}", params=params)

    async def insert(self, table: str, rows: Any, *, returning: bool = True) -> list[dict]:
        headers = {"Prefer": "return=representation" if returning else "return=minimal"}
        return await self._request("POST", f"{REST}/{table}", json=rows, headers=headers)

    async def upsert(self, table: str, rows: Any, *, on_conflict: str) -> list[dict]:
        return await self._request(
            "POST",
            f"{REST}/{table}",
            json=rows,
            params={"on_conflict": on_conflict},
            headers={"Prefer": "resolution=merge-duplicates,return=representation"},
        )

    async def update(self, table: str, params: dict[str, Any], patch: dict) -> list[dict]:
        return await self._request(
            "PATCH", f"{REST}/{table}", params=params, json=patch,
            headers={"Prefer": "return=representation"},
        )

    async def delete(self, table: str, params: dict[str, Any]) -> list[dict]:
        return await self._request("DELETE", f"{REST}/{table}", params=params)

    async def count(self, table: str, params: dict[str, Any] | None = None) -> int:
        """Row count without transferring the rows."""
        p = {**(params or {}), "select": "id"}
        async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
            r = await c.get(
                f"{REST}/{table}", params=p,
                headers={**self.headers, "Prefer": "count=exact", "Range": "0-0"},
            )
        if r.status_code >= 400:
            raise _fail(r)
        # PostgREST reports the total after the slash in Content-Range: 0-0/12
        rng = r.headers.get("content-range", "")
        return int(rng.split("/")[-1]) if "/" in rng and rng.split("/")[-1] != "*" else 0

    # ------------------------------------------------------------- storage

    async def upload(self, bucket: str, path: str, data: bytes, content_type: str) -> None:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
            r = await c.post(
                f"{STORAGE}/object/{bucket}/{path}",
                content=data,
                headers={**self.headers, "Content-Type": content_type, "x-upsert": "true"},
            )
        if r.status_code >= 400:
            raise _fail(r)

    async def signed_url(self, bucket: str, path: str, seconds: int = 60) -> str:
        """Private buckets are only readable through one of these, and it
        expires — these are HR extracts, not public assets."""
        async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
            r = await c.post(
                f"{STORAGE}/object/sign/{bucket}/{path}",
                json={"expiresIn": seconds},
                headers=self.headers,
            )
        if r.status_code >= 400:
            raise _fail(r)
        return f"{STORAGE}{r.json()['signedURL']}"

    def public_url(self, bucket: str, path: str) -> str:
        return f"{STORAGE}/object/public/{bucket}/{path}"

    # -------------------------------------------------------------- internal

    async def _request(self, method: str, url: str, **kw) -> list[dict]:
        headers = {**self.headers, **kw.pop("headers", {})}
        async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
            r = await c.request(method, url, headers=headers, **kw)
        if r.status_code >= 400:
            raise _fail(r)
        if not r.content:
            return []
        body = r.json()
        return body if isinstance(body, list) else [body]


def service() -> Supa:
    """Service-key client. Bypasses RLS — justify every use."""
    if not SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Service key is not configured")
    return Supa(privileged=True)


async def gotrue(path: str, payload: dict, token: str | None = None) -> dict:
    """Auth calls. Kept server-side so the anon key never ships to a browser."""
    if not SUPABASE_URL or not ANON_KEY:
        raise HTTPException(status_code=503, detail="Supabase is not configured")
    headers = {"apikey": ANON_KEY, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=_TIMEOUT) as c:
        r = await c.post(f"{AUTH}/{path}", json=payload, headers=headers)
    if r.status_code >= 400:
        raise _fail(r)
    return r.json() if r.content else {}


def _fail(r: httpx.Response) -> HTTPException:
    """Surface Supabase's own message, which is usually the useful one, but
    never leak a 5xx body — that can carry connection details."""
    try:
        body = r.json()
        detail = body.get("message") or body.get("msg") or body.get("error_description") or body.get("hint")
    except Exception:
        detail = None
    if r.status_code >= 500:
        detail = "Upstream error"
    return HTTPException(status_code=r.status_code, detail=detail or r.reason_phrase or "Request failed")
