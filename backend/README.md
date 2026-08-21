# Valigo engine API

FastAPI wrapper around the four engines (profiling, mapping, validation,
compare). **Stateless by design** — it processes an upload, returns JSON, and
keeps nothing. Persistence lives in Supabase, written by the browser under RLS.

## Run it

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # or bin/python on unix
set -a && . ./.env.dev.backend && set +a                  # loads Supabase config
.venv/Scripts/python -m uvicorn main:app --reload --port 8000
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness. **Open** — a load balancer has no session. |
| POST | `/profile` | Summarise a dataset: counts, blanks, duplicates, flagged issues. |
| POST | `/transform` | Apply a mapping workbook, return the target-shape preview. |
| POST | `/validate` | Run rules over a dataset. Falls back to the bundled Workday HCM set. |
| POST | `/compare` | Diff expected vs actual on a key column. |
| POST | `/columns` | Column headers only — powers the Compare key picker. |

Everything except `/health` requires a **Supabase access token** as
`Authorization: Bearer <jwt>`. It is verified locally against the project JWKS
(`auth.py`) — no per-request round trip to Supabase, and key rotation is a
non-event.

`VALIGO_ALLOW_ANONYMOUS=1` disables that check for local work without a
Supabase project. It defaults to **off** so a misconfigured deploy fails closed
rather than serving the engine unauthenticated.

## Environment

Set in `.env.dev.backend` (gitignored):

| Variable | Purpose |
|---|---|
| `VALIGO_SUPABASE_URL` | Project URL. Also derives the JWKS URL and issuer. |
| `VALIGO_SUPABASE_JWKS_URL` | Optional override for the JWKS endpoint. |
| `VALIGO_SUPABASE_PUBLISHABLE_KEY` | Anon key. Safe to ship — RLS is the protection, not key secrecy. |
| `VALIGO_SUPABASE_SECRET_KEY` | Service role. **Server only, never in the browser.** |
| `VALIGO_SUPABASE_DATABASE_PW` | Direct Postgres password, for applying migrations. |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins. `*` is local-dev only. |

## Database

Migrations are in [`../supabase/migrations/`](../supabase/migrations), applied
in order. `0001` is the schema, RLS and storage bucket; `0003` is a security fix
worth reading before you touch the profiles policies.

## test_rls.py

Regression check for row-level security — privilege escalation, tenant
isolation, and that legitimate access still works. **Run it after changing any
policy, the `profiles` table, or the `protect_profile_columns` trigger.**

```bash
VALIGO_E2E_PASSWORD=<password> .venv/Scripts/python test_rls.py
```

It needs two accounts to exist (`VALIGO_E2E_USER`, `VALIGO_E2E_ADMIN` — default
to `e2e.user@valigo.test` / `e2e.admin@valigo.test`, the second with
`profiles.role = 'admin'`). The password is **not** defaulted in the file: these
open real accounts in a live project, so a fallback would commit a working
credential. Skips cleanly if unset.
