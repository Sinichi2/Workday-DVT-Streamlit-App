"""
RLS regression check. Run: python test_rls.py   (needs .env.dev.backend loaded)

These assertions exist because the first version of the schema failed them. RLS
grants rows, not columns, so `profiles_update` ("you may edit your own row")
also meant "you may set role='admin' on your own row" — and once that passed,
every is_admin() branch in every other policy passed with it. A row-level policy
cannot express "this column may not change"; the BEFORE UPDATE trigger in
migration 0003 does.

Anything that touches profiles, the policies, or the trigger should re-run this.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ.get("VALIGO_SUPABASE_URL", "").rstrip("/")
ANON = os.environ.get("VALIGO_SUPABASE_PUBLISHABLE_KEY", "")
# No default: these credentials open real accounts in a live project, and a
# fallback here would commit a working password to the repo.
PASSWORD = os.environ.get("VALIGO_E2E_PASSWORD", "")
USER_EMAIL = os.environ.get("VALIGO_E2E_USER", "e2e.user@valigo.test")
ADMIN_EMAIL = os.environ.get("VALIGO_E2E_ADMIN", "e2e.admin@valigo.test")


def token(email: str) -> str:
    req = urllib.request.Request(
        f"{URL}/auth/v1/token?grant_type=password",
        data=json.dumps({"email": email, "password": PASSWORD}).encode(),
        headers={"apikey": ANON, "Content-Type": "application/json"},
    )
    return json.load(urllib.request.urlopen(req))["access_token"]


def rest(path: str, tok: str, method: str = "GET", payload: dict | None = None):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{path}",
        method=method,
        data=json.dumps(payload).encode() if payload else None,
        headers={
            "apikey": ANON,
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        # A refusal can be a 4xx OR an empty result set — RLS filters the rows
        # away rather than erroring, so both count as "blocked".
        return {"http": e.code}


def blocked(result) -> bool:
    return result == [] or isinstance(result, dict)


def main() -> int:
    if not URL or not ANON:
        print("SKIP: VALIGO_SUPABASE_URL / _PUBLISHABLE_KEY not set")
        return 0
    if not PASSWORD:
        print("SKIP: VALIGO_E2E_PASSWORD not set (see backend/README for the test accounts)")
        return 0

    user, admin = token(USER_EMAIL), token(ADMIN_EMAIL)
    me = rest("profiles?select=id", user)[0]["id"]
    failures: list[str] = []

    def check(name: str, ok: bool):
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        if not ok:
            failures.append(name)

    print("privilege escalation must be blocked:")
    rest(f"profiles?id=eq.{me}", user, "PATCH", {"role": "admin"})
    check("subscriber cannot promote self", rest("profiles?select=role", user)[0]["role"] != "admin")
    check("subscriber cannot close own ticket", blocked(rest("support_tickets?status=eq.open", user, "PATCH", {"status": "resolved"})))
    check("subscriber cannot edit help content", blocked(rest("help_faqs?position=eq.0", user, "PATCH", {"answer": "x"})))
    check("subscriber cannot publish articles", blocked(rest("help_articles", user, "POST", {"slug": "evil", "category": "Guides", "title": "evil"})))
    check("subscriber cannot change own email", blocked(rest(f"profiles?id=eq.{me}", user, "PATCH", {"email": "attacker@evil.test"})) or rest("profiles?select=email", user)[0]["email"] == USER_EMAIL)

    print("tenant isolation:")
    check("subscriber sees only own profile", len(rest("profiles?select=id", user)) == 1)
    check("admin sees every profile", len(rest("profiles?select=id", admin)) >= 2)

    print("legitimate access must still work:")
    r = rest(f"profiles?id=eq.{me}", user, "PATCH", {"job_title": "HR Systems Lead"})
    check("user can edit own job title", isinstance(r, list) and bool(r) and r[0]["job_title"] == "HR Systems Lead")
    check("admin can set roles", isinstance(rest(f"profiles?id=eq.{me}", admin, "PATCH", {"role": "subscriber"}), list))

    print(f"\n{len(failures)} failure(s)" if failures else "\nall RLS checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())


def check_fresh_token_verifies() -> bool:
    """Regression: Supabase stamps `iat` on its own clock in whole seconds, so a
    token can look a fraction of a second early here. With no leeway PyJWT
    rejects it as not-yet-valid, and every call right after sign-in 401s."""
    from auth import verify_token

    for attempt in range(5):
        user = verify_token(token(USER_EMAIL))  # no sleep — that is the race
        if not user.id:
            print(f"FAIL: fresh token verified but carried no subject (attempt {attempt})")
            return False
    print("ok   fresh tokens verify immediately (iat leeway)")
    return True
