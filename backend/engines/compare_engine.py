"""
Data Compare Validation Engine

Compares two datasets that share the same column headers, matching rows on a
user-chosen key column. Reports:
  - missing rows   : keys present in the expected (left) file but not the actual (right) file
  - extra rows     : keys present in the actual (right) file but not the expected (left) file
  - field mismatches : for keys present in both, any column whose value differs
  - duplicate keys : keys that appear more than once in either file

This is a fidelity check, not a transformation. In the Workday migration flow,
the "expected" file is the transformed dataset that was loaded, and the "actual"
file is a report pulled back out of Workday after loading. The goal is to confirm
what landed matches what was intended.
"""
import pandas as pd


def _norm(v):
    """Normalize a value for comparison: treat blanks/NaN as empty, stringify, strip."""
    if pd.isna(v) or v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def compare_datasets(expected_df, actual_df, key_column, compare_columns=None):
    """
    Compare two datasets on key_column.

    Parameters
    ----------
    expected_df : DataFrame
        The intended/loaded dataset (left side).
    actual_df : DataFrame
        The dataset pulled back for verification (right side).
    key_column : str
        Column used to match rows between the two files.
    compare_columns : list[str] or None
        Columns to compare for mismatches. If None, uses the intersection of
        columns shared by both files (excluding the key).

    Returns
    -------
    (results, summary, log_lines)
      results : dict of DataFrames:
        'missing_rows', 'extra_rows', 'field_mismatches',
        'duplicate_keys_expected', 'duplicate_keys_actual'
      summary : dict of metrics
      log_lines : list[str]
    """
    log = []

    if key_column not in expected_df.columns:
        raise ValueError(f"Key column '{key_column}' not found in expected dataset.")
    if key_column not in actual_df.columns:
        raise ValueError(f"Key column '{key_column}' not found in actual dataset.")

    # Determine which columns to compare
    shared = [c for c in expected_df.columns if c in actual_df.columns and c != key_column]
    if compare_columns:
        compare_columns = [c for c in compare_columns if c in shared]
    else:
        compare_columns = shared

    only_in_expected = [c for c in expected_df.columns if c not in actual_df.columns]
    only_in_actual = [c for c in actual_df.columns if c not in expected_df.columns]

    log.append("=== Data Compare Validation ===")
    log.append(f"  Expected (loaded) rows: {len(expected_df)}")
    log.append(f"  Actual (Workday report) rows: {len(actual_df)}")
    log.append(f"  Key column: {key_column}")
    log.append(f"  Columns compared: {len(compare_columns)}")
    if only_in_expected:
        log.append(f"  Columns only in expected (ignored): {', '.join(only_in_expected)}")
    if only_in_actual:
        log.append(f"  Columns only in actual (ignored): {', '.join(only_in_actual)}")

    # Normalized key series
    exp_keys = expected_df[key_column].apply(_norm)
    act_keys = actual_df[key_column].apply(_norm)

    # Duplicate keys
    exp_dupe_mask = exp_keys.duplicated(keep=False) & (exp_keys != "")
    act_dupe_mask = act_keys.duplicated(keep=False) & (act_keys != "")
    dupe_expected = expected_df[exp_dupe_mask].copy()
    dupe_actual = actual_df[act_dupe_mask].copy()
    if len(dupe_expected):
        log.append(f"  Duplicate keys in expected: {len(dupe_expected)} row(s)")
    if len(dupe_actual):
        log.append(f"  Duplicate keys in actual: {len(dupe_actual)} row(s)")

    exp_set = set(exp_keys[exp_keys != ""])
    act_set = set(act_keys[act_keys != ""])

    missing_keys = exp_set - act_set   # loaded but not found in Workday report
    extra_keys = act_set - exp_set     # in Workday report but not loaded
    common_keys = exp_set & act_set

    missing_rows = expected_df[exp_keys.isin(missing_keys)].copy()
    extra_rows = actual_df[act_keys.isin(extra_keys)].copy()

    log.append(f"  Missing rows (expected, not in actual): {len(missing_rows)}")
    log.append(f"  Extra rows (actual, not in expected): {len(extra_rows)}")
    log.append(f"  Matched keys present in both: {len(common_keys)}")

    # Field-level mismatches on common keys
    # Build lookup by first occurrence of each key
    exp_indexed = expected_df.copy()
    exp_indexed["_k"] = exp_keys
    exp_indexed = exp_indexed[exp_indexed["_k"].isin(common_keys)].drop_duplicates("_k", keep="first").set_index("_k")

    act_indexed = actual_df.copy()
    act_indexed["_k"] = act_keys
    act_indexed = act_indexed[act_indexed["_k"].isin(common_keys)].drop_duplicates("_k", keep="first").set_index("_k")

    mismatch_records = []
    for key in sorted(common_keys):
        exp_row = exp_indexed.loc[key]
        act_row = act_indexed.loc[key]
        for col in compare_columns:
            ev = _norm(exp_row[col])
            av = _norm(act_row[col])
            if ev != av:
                mismatch_records.append({
                    key_column: key,
                    "Field": col,
                    "Expected (loaded)": exp_row[col],
                    "Actual (Workday)": act_row[col],
                })

    field_mismatches = pd.DataFrame(mismatch_records) if mismatch_records else pd.DataFrame(
        columns=[key_column, "Field", "Expected (loaded)", "Actual (Workday)"]
    )

    rows_with_mismatch = field_mismatches[key_column].nunique() if len(field_mismatches) else 0
    log.append(f"  Field mismatches: {len(field_mismatches)} across {rows_with_mismatch} row(s)")

    # Match rate: matched keys with zero mismatches / total expected keys
    perfectly_matched = len(common_keys) - rows_with_mismatch
    total_expected = len(exp_set)
    match_pct = (perfectly_matched / total_expected * 100) if total_expected else 0.0

    summary = {
        "expected_rows": len(expected_df),
        "actual_rows": len(actual_df),
        "columns_compared": len(compare_columns),
        "compare_columns": compare_columns,
        "only_in_expected": only_in_expected,
        "only_in_actual": only_in_actual,
        "matched_keys": len(common_keys),
        "missing_rows": len(missing_rows),
        "extra_rows": len(extra_rows),
        "rows_with_mismatch": rows_with_mismatch,
        "field_mismatch_count": len(field_mismatches),
        "perfectly_matched": perfectly_matched,
        "match_pct": round(match_pct, 2),
        "duplicate_keys_expected": len(dupe_expected),
        "duplicate_keys_actual": len(dupe_actual),
    }

    results = {
        "missing_rows": missing_rows,
        "extra_rows": extra_rows,
        "field_mismatches": field_mismatches,
        "duplicate_keys_expected": dupe_expected,
        "duplicate_keys_actual": dupe_actual,
    }

    return results, summary, log
