# Valigo Engine API

FastAPI wrapper over the four existing engines (profiling, mapping, validation,
compare). Stateless: it reads an upload, runs the engine, returns JSON, and keeps
nothing. The engines under `engines/` are copied from the Streamlit repo
**unchanged**.

## Endpoints

| Method | Path        | Body (multipart)                                  | Returns |
|--------|-------------|---------------------------------------------------|---------|
| GET    | `/health`   | —                                                 | status  |
| POST   | `/profile`  | `file`                                            | overview, columns, issues |
| POST   | `/transform`| `source`, `mapping`, `preview_rows?`              | target preview + summary |
| POST   | `/validate` | `dataset`, `rules?`, `preview_rows?`             | summary + flagged rows (bundled rules if `rules` omitted) |
| POST   | `/compare`  | `expected`, `actual`, `key_column`, `preview_rows?` | summary + missing/extra/mismatch |
| POST   | `/columns`  | `file`                                            | column headers (for the Compare key picker) |

CSV and Excel are both accepted. Interactive docs at `/docs`.

## Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# open http://localhost:8000/docs
```

## Deploy (AWS App Runner)

```bash
docker build -t valigo-api .
# push to ECR, then point App Runner at the image, or:
docker run -p 8000:8000 -e ALLOWED_ORIGINS="https://<your-site>.netlify.app" valigo-api
```

Set `ALLOWED_ORIGINS` to your Netlify URL in production (comma-separated for
several). Do **not** leave it as `*` once the front end is on a real domain.

> Deploy this as a container (App Runner / ECS / Lightsail), **not** as a
> Netlify Function or Lambda + API Gateway — a real validate/compare over a
> large extract will exceed the ~29s serverless timeout. The container has no
> such wall.
