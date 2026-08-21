"""
Upload -> DataFrame.

The engines' own loaders assume Excel (`pd.read_excel`), but the Profile screen
in the UI enforces CSV, and real Workday extracts arrive as either. So the API
sniffs by filename and reads accordingly, rather than trusting one format.
"""
from __future__ import annotations

import io

import pandas as pd
from fastapi import HTTPException, UploadFile


def _read_bytes(raw: bytes, filename: str) -> pd.DataFrame:
    name = (filename or "").lower()
    buf = io.BytesIO(raw)
    try:
        if name.endswith(".csv") or name.endswith(".txt"):
            return pd.read_csv(buf, dtype=str, keep_default_na=True)
        if name.endswith((".xlsx", ".xls", ".xlsm")):
            return pd.read_excel(buf, dtype=str)
        # Unknown extension: try CSV first, then Excel.
        try:
            return pd.read_csv(io.BytesIO(raw), dtype=str, keep_default_na=True)
        except Exception:
            return pd.read_excel(io.BytesIO(raw), dtype=str)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=400,
            detail=f"Could not read '{filename}': {type(e).__name__}: {e}",
        )


async def load_dataframe(upload: UploadFile) -> pd.DataFrame:
    """Read an uploaded dataset (CSV or Excel) into a DataFrame of strings."""
    raw = await upload.read()
    if not raw:
        raise HTTPException(status_code=400, detail=f"'{upload.filename}' is empty.")
    df = _read_bytes(raw, upload.filename)
    if df.shape[1] == 0:
        raise HTTPException(
            status_code=400, detail=f"'{upload.filename}' has no columns."
        )
    return df


async def load_excel_bytes(upload: UploadFile) -> io.BytesIO:
    """Return the raw bytes of an uploaded workbook as a seekable buffer, for
    engine loaders that open multi-sheet workbooks themselves (mapping files)."""
    raw = await upload.read()
    if not raw:
        raise HTTPException(status_code=400, detail=f"'{upload.filename}' is empty.")
    return io.BytesIO(raw)
