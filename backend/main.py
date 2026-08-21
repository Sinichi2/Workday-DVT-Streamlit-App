"""
Valigo engine API.

Wraps the four existing engines (profiling, mapping, validation, compare)
behind HTTP, unchanged. Each endpoint takes multipart file upload(s), calls the
engine, and returns JSON the React front end renders directly.

Stateless by design — process the upload, return the result, keep nothing. That
is the strongest line in the security story and it mirrors the Streamlit app's
behaviour exactly.

Run locally:
    uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from engines import compare_engine, mapping_engine, profiling_engine, validation_engine
from loaders import load_dataframe, load_excel_bytes
from serialization import clean_dict, df_to_records

DEFAULT_RULES = Path(__file__).parent / "defaults" / "workday_validation_rules.xlsx"

# Comma-separated list of allowed browser origins. Set ALLOWED_ORIGINS on the
# host to the Netlify URL in production; "*" is fine for local dev only.
_origins_env = os.environ.get("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]

app = FastAPI(title="Valigo Engine API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "valigo-engine-api"}


@app.post("/profile")
async def profile(file: UploadFile = File(...)):
    """Stage 1 — profile a raw dataset."""
    df = await load_dataframe(file)
    overview, per_column, issues_df, log = profiling_engine.profile_dataset(df)
    return {
        "overview": clean_dict(overview),
        "columns": df_to_records(per_column),
        "issues": df_to_records(issues_df),
        "log": log,
    }


@app.post("/transform")
async def transform(
    source: UploadFile = File(...),
    mapping: UploadFile = File(...),
    preview_rows: int = Form(100),
):
    """Stage 2 — map a source dataset into target (Workday) shape."""
    source_df = await load_dataframe(source)
    mapping_buf = await load_excel_bytes(mapping)
    try:
        mappings_df, crosswalks = mapping_engine.load_mapping_file(mapping_buf)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Mapping file error: {e}")

    target_df, summary, log = mapping_engine.apply_mapping(
        source_df, mappings_df, crosswalks
    )
    preview = target_df.head(max(1, preview_rows))
    return {
        "summary": clean_dict(summary),
        "columns": [str(c) for c in target_df.columns],
        "preview": df_to_records(preview),
        "total_rows": int(len(target_df)),
        "log": log,
    }


@app.post("/validate")
async def validate(
    dataset: UploadFile = File(...),
    rules: UploadFile | None = File(None),
    preview_rows: int = Form(500),
):
    """Stage 3 — run business rules over a (target-shape) dataset.

    If no rules file is supplied, the bundled Workday HCM rule set is used, so
    the demo works from a single upload.
    """
    df = await load_dataframe(dataset)

    if rules is not None:
        rules_buf = await load_excel_bytes(rules)
        rules_df = validation_engine.load_rules(rules_buf)
    else:
        if not DEFAULT_RULES.exists():
            raise HTTPException(
                status_code=500, detail="No rules uploaded and no bundled rules found."
            )
        rules_df = validation_engine.load_rules(str(DEFAULT_RULES))

    validated, summary, log = validation_engine.apply_rules(df, rules_df)

    # Only failing / warning rows are interesting to the reviewer; cap the
    # payload so a large extract doesn't ship every clean row to the browser.
    # `_row` carries the original position — df_to_records drops the index, and
    # the reviewer needs to find the row back in their own file.
    flagged = validated[validated["_errors"] != ""].head(max(1, preview_rows))
    flagged = flagged.assign(_row=flagged.index.astype(int) + 1)

    return {
        "summary": clean_dict(summary),
        "findings": df_to_records(flagged),
        "columns": [str(c) for c in validated.columns if not c.startswith("_")],
        # `_errors` names rule IDs only. Ship the rule book alongside so the
        # client can resolve an ID to its field, text and severity itself.
        "rules": {
            str(r["rule_id"]): {
                "field": str(r["field"]),
                "description": str(r["description"]),
                "severity": str(r["severity"]),
            }
            for _, r in rules_df.iterrows()
        },
        "rules_used": "custom" if rules is not None else "bundled_workday_hcm",
        "log": log,
    }


@app.post("/compare")
async def compare(
    expected: UploadFile = File(...),
    actual: UploadFile = File(...),
    key_column: str = Form(...),
    preview_rows: int = Form(500),
):
    """Stage 4 — fidelity check: compare what was loaded vs what came back."""
    expected_df = await load_dataframe(expected)
    actual_df = await load_dataframe(actual)

    if key_column not in expected_df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Key column '{key_column}' not found in expected file. "
            f"Available: {', '.join(map(str, expected_df.columns))}",
        )
    if key_column not in actual_df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Key column '{key_column}' not found in actual file. "
            f"Available: {', '.join(map(str, actual_df.columns))}",
        )

    try:
        results, summary, log = compare_engine.compare_datasets(
            expected_df, actual_df, key_column
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    cap = max(1, preview_rows)
    return {
        "summary": clean_dict(summary),
        "field_mismatches": df_to_records(results["field_mismatches"].head(cap)),
        "missing_rows": df_to_records(results["missing_rows"].head(cap)),
        "extra_rows": df_to_records(results["extra_rows"].head(cap)),
        "log": log,
    }


@app.post("/columns")
async def columns_probe(file: UploadFile = File(...)):
    """Helper for the Compare screen's key picker: return the column headers of
    an uploaded file without running any comparison."""
    df = await load_dataframe(file)
    return {"columns": [str(c) for c in df.columns]}
