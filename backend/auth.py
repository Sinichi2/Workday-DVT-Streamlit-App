"""
Supabase auth for the engine API.

The engine processes uploaded HR extracts, so it must not be an open endpoint.
Every request carries the caller's Supabase access token; we verify it against
the project's JWKS and hand the endpoint the user id.

Verification is local — a JWKS fetch (cached) and a signature check, no network
round-trip to Supabase per request. Supabase signs with ES256 asymmetric keys,
so the service key never needs to leave the server to validate anything.
"""
from __future__ import annotations

import os
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, Request
from jwt import PyJWKClient

SUPABASE_URL = os.environ.get("VALIGO_SUPABASE_URL", "").rstrip("/")
JWKS_URL = os.environ.get("VALIGO_SUPABASE_JWKS_URL") or (
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""
)
# Supabase issues tokens with aud "authenticated" for signed-in users.
AUDIENCE = "authenticated"
ISSUER = f"{SUPABASE_URL}/auth/v1" if SUPABASE_URL else None

# Escape hatch for running the engine locally with no Supabase project wired up.
# Defaults to OFF so forgetting to configure auth fails closed, not open.
ALLOW_ANONYMOUS = os.environ.get("VALIGO_ALLOW_ANONYMOUS", "").lower() in {"1", "true", "yes"}


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    if not JWKS_URL:
        raise RuntimeError("VALIGO_SUPABASE_JWKS_URL (or _URL) is not configured")
    # PyJWKClient caches keys and refetches on an unknown kid, which is what
    # makes key rotation a non-event here.
    return PyJWKClient(JWKS_URL, cache_keys=True)


class User:
    """The verified caller. Only what the endpoints actually need."""

    def __init__(self, id: str, email: str | None, role: str | None, token: str):
        self.id = id
        self.email = email
        self.role = role
        self.token = token

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"User(id={self.id!r}, email={self.email!r})"


def _bearer(request: Request) -> str | None:
    header = request.headers.get("authorization") or ""
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def verify_token(token: str) -> User:
    """Decode and verify a Supabase access token. Raises 401 on any problem."""
    try:
        key = _jwks_client().get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            key,
            algorithms=["ES256", "RS256"],
            audience=AUDIENCE,
            issuer=ISSUER,
            # Defaults verify exp/nbf/iat; spelled out so a future edit can't
            # quietly relax expiry checking.
            options={"require": ["exp", "sub"], "verify_exp": True, "verify_aud": True},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Sign in again.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    except Exception as e:  # JWKS fetch failure, misconfiguration
        raise HTTPException(status_code=503, detail=f"Auth unavailable: {type(e).__name__}")

    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token has no subject")
    return User(id=sub, email=claims.get("email"), role=claims.get("role"), token=token)


async def current_user(request: Request) -> User:
    """FastAPI dependency. Put this on every endpoint that touches user data."""
    token = _bearer(request)
    if token is None:
        if ALLOW_ANONYMOUS:
            return User(id="anonymous", email=None, role=None, token="")
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return verify_token(token)


CurrentUser = Depends(current_user)
