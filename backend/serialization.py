"""
Turn engine outputs (pandas DataFrames, numpy scalars, NaN/NaT) into
JSON-safe Python primitives.

The engines return a mix of dicts, DataFrames, and numpy types. FastAPI's
JSON encoder chokes on NaN, numpy int64/float64, and Timestamps, so everything
that leaves an endpoint passes through here first.
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd


def clean_scalar(v: Any) -> Any:
    """Coerce a single value to something json.dumps can handle, mapping all
    flavours of 'missing' to None so the UI can render its italic 'empty'."""
    if v is None:
        return None
    # pandas NA / NaT / NaN
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        f = float(v)
        return None if math.isnan(f) else f
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, (pd.Timestamp,)):
        return v.isoformat()
    if isinstance(v, float) and math.isnan(v):
        return None
    return v


def df_to_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    """DataFrame -> list of row dicts, every cell cleaned. Column order kept."""
    if df is None or len(df) == 0:
        return []
    cols = list(df.columns)
    out: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        out.append({str(c): clean_scalar(row[c]) for c in cols})
    return out


def clean_dict(d: dict) -> dict:
    """Clean a flat metrics dict. DataFrame values are dropped (the engines
    tuck the rules_df into the validation summary — the UI never needs it)."""
    out = {}
    for k, v in d.items():
        if isinstance(v, pd.DataFrame):
            continue
        if isinstance(v, dict):
            out[k] = clean_dict(v)
        elif isinstance(v, (list, tuple)):
            out[k] = [clean_scalar(x) for x in v]
        else:
            out[k] = clean_scalar(v)
    return out
