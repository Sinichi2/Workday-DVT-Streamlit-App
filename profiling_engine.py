"""
Data Profiling Engine

Assesses the quality of a dataset without modifying it. Produces structural
statistics and flags anomalies that would typically need to be addressed before
transformation or validation.

Profiling is the first stage in the three-stage pipeline (Profile -> Transform
-> Validate). It can run independently; clients often request a profile-only
engagement to assess data quality before committing to a migration.

Outputs
-------
  overview    : dict of dataset-level statistics (rows, columns, missing %, dupes)
  per_column  : DataFrame with one row per column describing its profile
  issues      : DataFrame of flagged anomalies (high null %, single-value cols, etc.)
"""
import re
from collections import Counter

import pandas as pd


# ---------- Helpers ----------

def _is_blank(v):
    return pd.isna(v) or (isinstance(v, str) and v.strip() == "")


def _looks_like_date(s):
    if not isinstance(s, str):
        return False
    try:
        pd.to_datetime(s)
        return True
    except Exception:
        return False


def _looks_like_email(s):
    if not isinstance(s, str):
        return False
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", s))


def _looks_like_number(s):
    if not isinstance(s, str):
        return False
    try:
        float(s.replace(",", ""))
        return True
    except (ValueError, AttributeError):
        return False


def _detect_dominant_type(series):
    """Classify a column by sniffing non-null values: number / date / email / mixed / text."""
    non_null = [v for v in series if not _is_blank(v)]
    if not non_null:
        return "empty"

    # If pandas already inferred a numeric or datetime dtype, trust it
    if pd.api.types.is_numeric_dtype(series):
        return "number"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "date"

    # String column: sniff sample values
    sample = non_null[:50]
    n_email = sum(_looks_like_email(str(v)) for v in sample)
    n_date = sum(_looks_like_date(str(v)) for v in sample)
    n_num = sum(_looks_like_number(str(v)) for v in sample)
    if n_email >= 0.8 * len(sample):
        return "email"
    if n_date >= 0.8 * len(sample):
        return "date-string"
    if n_num >= 0.8 * len(sample):
        return "number-string"
    return "text"


def _sample_values(series, k=3):
    seen = []
    for v in series:
        if _is_blank(v):
            continue
        s = str(v)
        if s not in seen:
            seen.append(s)
        if len(seen) >= k:
            break
    return ", ".join(seen)


def _has_leading_or_trailing_whitespace(series):
    return any(
        isinstance(v, str) and (v != v.strip())
        for v in series
        if not _is_blank(v)
    )


def _has_mixed_case_inconsistency(series):
    """True if a string column has the same value in different casings (e.g., 'USA' and 'usa')."""
    if not pd.api.types.is_object_dtype(series):
        return False
    counts = Counter(
        str(v).strip().lower()
        for v in series
        if not _is_blank(v) and isinstance(v, str)
    )
    if not counts:
        return False
    # If lower-cased values collide but the originals weren't all lower-cased, it's mixed
    distinct_originals = {str(v).strip() for v in series if not _is_blank(v) and isinstance(v, str)}
    distinct_lowered = set(counts.keys())
    return len(distinct_originals) > len(distinct_lowered)


# ---------- Orchestration ----------

def profile_dataset(df):
    """
    Build a profile of df. Returns (overview, per_column_df, issues_df, log_lines).
    """
    log = []
    n_rows, n_cols = df.shape

    log.append(f"=== Profiling: {n_rows} row(s) x {n_cols} column(s) ===")

    # Dataset-level stats
    total_cells = n_rows * n_cols if n_cols else 0
    blank_cells = int(sum(df.map(_is_blank).sum())) if n_cols else 0
    overall_missing_pct = (blank_cells / total_cells * 100) if total_cells else 0.0

    # Duplicate rows (full-row duplicates)
    dup_count = int(df.duplicated().sum())

    overview = {
        "total_rows": n_rows,
        "total_columns": n_cols,
        "total_cells": total_cells,
        "blank_cells": blank_cells,
        "overall_missing_pct": round(overall_missing_pct, 2),
        "duplicate_rows": dup_count,
    }

    # Per-column profile
    rows = []
    for col in df.columns:
        series = df[col]
        non_blank_mask = ~series.apply(_is_blank)
        non_blank = int(non_blank_mask.sum())
        blank = n_rows - non_blank
        null_pct = (blank / n_rows * 100) if n_rows else 0.0
        distinct = series[non_blank_mask].nunique()
        distinct_pct = (distinct / non_blank * 100) if non_blank else 0.0

        # Most common value
        if non_blank > 0:
            try:
                top_value = series[non_blank_mask].astype(str).value_counts().index[0]
                top_count = int(series[non_blank_mask].astype(str).value_counts().iloc[0])
                most_common = f"{top_value} ({top_count})"
            except Exception:
                most_common = ""
        else:
            most_common = ""

        rows.append({
            "Column": col,
            "Inferred type": _detect_dominant_type(series),
            "Non-blank": non_blank,
            "Blank": blank,
            "Blank %": round(null_pct, 2),
            "Distinct": int(distinct),
            "Distinct %": round(distinct_pct, 2),
            "Most common": most_common,
            "Sample values": _sample_values(series),
        })

    per_column = pd.DataFrame(rows)
    log.append(f"  Profiled {len(rows)} column(s)")

    # Anomaly flags
    issues = []
    for col in df.columns:
        series = df[col]
        non_blank_mask = ~series.apply(_is_blank)
        non_blank = int(non_blank_mask.sum())
        blank = n_rows - non_blank
        null_pct = (blank / n_rows * 100) if n_rows else 0.0
        distinct = series[non_blank_mask].nunique()

        if non_blank == 0:
            issues.append({
                "Column": col, "Severity": "High",
                "Issue": "Entirely blank",
                "Detail": "Column has no values in any row.",
            })
            continue

        if null_pct >= 50:
            issues.append({
                "Column": col, "Severity": "High",
                "Issue": "High blank rate",
                "Detail": f"{null_pct:.1f}% of values are blank ({blank} of {n_rows}).",
            })
        elif null_pct >= 20:
            issues.append({
                "Column": col, "Severity": "Medium",
                "Issue": "Elevated blank rate",
                "Detail": f"{null_pct:.1f}% of values are blank ({blank} of {n_rows}).",
            })

        if non_blank > 0 and distinct == 1:
            issues.append({
                "Column": col, "Severity": "Low",
                "Issue": "Single-value column",
                "Detail": f"All {non_blank} non-blank values are identical.",
            })

        if _has_leading_or_trailing_whitespace(series):
            issues.append({
                "Column": col, "Severity": "Low",
                "Issue": "Whitespace in values",
                "Detail": "One or more values have leading or trailing whitespace.",
            })

        if _has_mixed_case_inconsistency(series):
            issues.append({
                "Column": col, "Severity": "Low",
                "Issue": "Mixed casing",
                "Detail": "The same value appears in multiple casings.",
            })

    if dup_count > 0:
        issues.append({
            "Column": "(entire row)",
            "Severity": "High",
            "Issue": "Duplicate rows",
            "Detail": f"{dup_count} row(s) appear more than once across all columns.",
        })

    issues_df = pd.DataFrame(issues) if issues else pd.DataFrame(
        columns=["Column", "Severity", "Issue", "Detail"]
    )

    log.append(f"  Flagged {len(issues)} issue(s)")

    return overview, per_column, issues_df, log
