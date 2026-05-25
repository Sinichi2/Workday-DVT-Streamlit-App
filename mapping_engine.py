"""
Source-to-Target Mapping Engine

Takes a source dataset (e.g., Oracle export) and a mapping file, returns a target
dataset in the desired shape (e.g., Workday HCM format).

The mapping file is an Excel workbook with two sheets:
  - 'mappings'   : one row per source-to-target field mapping
  - 'crosswalks' : value-level lookup tables (optional)

mappings sheet columns:
  source_field         : column name in the source dataset (or blank for constants)
  target_field         : column name to produce in the target dataset
  transformation       : operation to apply (see SUPPORTED_TRANSFORMATIONS)
  parameter            : optional argument (date format, crosswalk name, constant value, etc.)
  required             : "Yes" / "No" (informational)
  description          : human-readable note

crosswalks sheet columns:
  crosswalk_name : ID referenced by transformation='crosswalk' rows
  source_value   : value as it appears in the source dataset
  target_value   : value to substitute in the target dataset

Supported transformations:
  none               : copy value unchanged
  trim               : strip surrounding whitespace
  trim_leading_zeros : "00123" -> "123"
  lowercase          : "ABC" -> "abc"
  uppercase          : "abc" -> "ABC"
  title_case         : "john doe" -> "John Doe"
  proper_case        : alias for title_case
  format_date        : parse + reformat date; parameter is target format string (default "%Y-%m-%d")
  round_decimals     : round numbers; parameter is decimal places (default 2)
  remove_special     : strip non-alphanumeric characters
  digits_only        : keep only digit characters
  crosswalk          : look up value in crosswalks sheet; parameter is crosswalk_name
  constant           : use parameter as the literal value (source_field can be blank)
  concat             : combine multiple source fields; parameter is "field1|field2|..."; uses ' ' as separator
  split_first        : take first token; parameter is delimiter (default " ")
  split_last         : take last token; parameter is delimiter (default " ")
"""
import re
from datetime import date, datetime

import pandas as pd


SUPPORTED_TRANSFORMATIONS = {
    "none", "trim", "trim_leading_zeros", "lowercase", "uppercase",
    "title_case", "proper_case", "format_date", "round_decimals",
    "remove_special", "digits_only", "crosswalk", "constant",
    "concat", "split_first", "split_last",
}


# ---------- I/O ----------

def load_mapping_file(file):
    """
    Read a mapping workbook. Returns (mappings_df, crosswalks_dict).
    Crosswalks are returned as { crosswalk_name: { source_value: target_value, ... } }.
    """
    xl = pd.ExcelFile(file)

    if "mappings" not in xl.sheet_names:
        raise ValueError(
            f"Mapping file must contain a 'mappings' sheet. Found: {xl.sheet_names}"
        )

    mappings = pd.read_excel(xl, sheet_name="mappings")
    # Ensure expected columns exist; fill missing with blanks
    for col, default in [
        ("source_field", ""), ("target_field", ""),
        ("transformation", "none"), ("parameter", ""),
        ("required", ""), ("description", ""),
    ]:
        if col not in mappings.columns:
            mappings[col] = default
    mappings = mappings.fillna({
        "source_field": "", "target_field": "",
        "transformation": "none", "parameter": "",
        "required": "", "description": "",
    })

    # Drop rows with no target field (nothing to produce)
    mappings = mappings[mappings["target_field"].astype(str).str.strip() != ""].reset_index(drop=True)

    crosswalks = {}
    if "crosswalks" in xl.sheet_names:
        cw_df = pd.read_excel(xl, sheet_name="crosswalks").fillna("")
        for _, row in cw_df.iterrows():
            name = str(row.get("crosswalk_name", "")).strip()
            src  = str(row.get("source_value", "")).strip()
            tgt  = row.get("target_value", "")
            if not name or not src:
                continue
            crosswalks.setdefault(name, {})[src] = tgt

    return mappings, crosswalks


# ---------- Per-cell transformations ----------

def _to_date(v):
    if pd.isna(v) or v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    try:
        return pd.to_datetime(v).date()
    except Exception:
        return None


def _is_blank(v):
    return v is None or (isinstance(v, float) and pd.isna(v)) or (isinstance(v, str) and v == "")


def _transform_cell(value, transformation, parameter, crosswalks):
    """Apply a single transformation to one cell value."""
    op = (transformation or "none").strip().lower()
    param = "" if parameter is None or (isinstance(parameter, float) and pd.isna(parameter)) else str(parameter)

    if op == "none":
        return value

    if op == "constant":
        return param

    if op == "crosswalk":
        if not param or param not in crosswalks:
            return value  # crosswalk not defined; pass through
        lookup = crosswalks[param]
        key = "" if _is_blank(value) else str(value).strip()
        return lookup.get(key, value)  # unmatched values pass through

    if _is_blank(value):
        return value  # most other transformations can't operate on blanks

    s = value if isinstance(value, str) else str(value)

    if op == "trim":
        return s.strip()
    if op == "trim_leading_zeros":
        # Handle the common case where pandas auto-coerced "00100001" -> 100001.0
        # by reading the trailing ".0" off integer-valued floats first.
        if isinstance(value, float) and value.is_integer():
            s = str(int(value))
        stripped = s.strip()
        if stripped.startswith("-") and stripped[1:].isdigit():
            return "-" + (stripped[1:].lstrip("0") or "0")
        if stripped.isdigit():
            return stripped.lstrip("0") or "0"
        return stripped.lstrip("0")
    if op == "lowercase":
        return s.lower()
    if op == "uppercase":
        return s.upper()
    if op in ("title_case", "proper_case"):
        return s.title()
    if op == "remove_special":
        return re.sub(r"[^A-Za-z0-9 ]+", "", s)
    if op == "digits_only":
        return re.sub(r"\D", "", s)

    if op == "round_decimals":
        try:
            places = int(param) if param else 2
            return round(float(s), places)
        except (ValueError, TypeError):
            return value

    if op == "format_date":
        d = _to_date(value)
        if d is None:
            return value
        fmt = param if param else "%Y-%m-%d"
        try:
            return d.strftime(fmt)
        except Exception:
            return value

    if op == "split_first":
        delim = param if param else " "
        return s.split(delim, 1)[0] if delim in s else s
    if op == "split_last":
        delim = param if param else " "
        return s.rsplit(delim, 1)[-1] if delim in s else s

    return value  # unknown op -> pass through


# ---------- Whole-dataset orchestration ----------

def apply_mapping(source_df: pd.DataFrame, mappings: pd.DataFrame, crosswalks: dict):
    """
    Apply the mapping to source_df and return (target_df, summary, log_lines).

    target_df has one column per mapping row, in the order they appear in the mappings sheet.
    """
    log = []
    log.append(f"=== Mapping: {len(mappings)} target field(s) ===")
    log.append(f"Source rows: {len(source_df)}, source columns: {len(source_df.columns)}")
    if crosswalks:
        log.append(f"Crosswalks available: {', '.join(crosswalks.keys())}")
    log.append("")

    target = pd.DataFrame(index=source_df.index)
    per_field_stats = []  # for the summary table
    unknown_ops = set()

    for _, m in mappings.iterrows():
        src_field = str(m["source_field"]).strip()
        tgt_field = str(m["target_field"]).strip()
        op        = str(m["transformation"]).strip().lower() or "none"
        param     = str(m["parameter"])

        if op not in SUPPORTED_TRANSFORMATIONS:
            unknown_ops.add(op)
            log.append(f"  [warn] target '{tgt_field}': unknown transformation '{op}' — passing through")
            op = "none"

        # Source value resolution
        if op == "concat":
            fields = [f.strip() for f in param.split("|") if f.strip()]
            missing = [f for f in fields if f not in source_df.columns]
            if missing:
                log.append(f"  [warn] {tgt_field}: concat missing source fields: {missing}")
            parts_per_row = []
            for _, row in source_df.iterrows():
                parts = [str(row[f]) for f in fields if f in source_df.columns and not _is_blank(row[f])]
                parts_per_row.append(" ".join(parts))
            target[tgt_field] = parts_per_row
            log.append(f"  {tgt_field}: concat({fields}) — {len(parts_per_row)} value(s) produced")
            per_field_stats.append({
                "Target Field": tgt_field, "Source": " + ".join(fields) or "(constant)",
                "Transformation": op, "Rows with value": int((target[tgt_field] != "").sum()),
            })
            continue

        if op == "constant":
            target[tgt_field] = param
            log.append(f"  {tgt_field}: constant '{param}'")
            per_field_stats.append({
                "Target Field": tgt_field, "Source": "(constant)",
                "Transformation": op, "Rows with value": len(target),
            })
            continue

        # Regular per-cell transformation
        if src_field and src_field not in source_df.columns:
            log.append(f"  [warn] {tgt_field}: source field '{src_field}' not in dataset — output will be blank")
            target[tgt_field] = None
            per_field_stats.append({
                "Target Field": tgt_field, "Source": f"{src_field} (MISSING)",
                "Transformation": op, "Rows with value": 0,
            })
            continue

        if not src_field:
            log.append(f"  [warn] {tgt_field}: no source_field specified and not a constant — output will be blank")
            target[tgt_field] = None
            per_field_stats.append({
                "Target Field": tgt_field, "Source": "(none)",
                "Transformation": op, "Rows with value": 0,
            })
            continue

        target[tgt_field] = source_df[src_field].apply(
            lambda v: _transform_cell(v, op, param, crosswalks)
        )
        non_blank = int(target[tgt_field].apply(lambda v: not _is_blank(v)).sum())
        log.append(f"  {tgt_field} <- {src_field} via {op}{f'({param})' if param else ''}: {non_blank} non-blank value(s)")
        per_field_stats.append({
            "Target Field": tgt_field, "Source": src_field,
            "Transformation": op, "Rows with value": non_blank,
        })

    summary = {
        "source_rows":      len(source_df),
        "source_cols":      len(source_df.columns),
        "target_rows":      len(target),
        "target_cols":      len(target.columns),
        "mapping_count":    len(mappings),
        "crosswalk_count":  len(crosswalks),
        "unknown_ops":      sorted(unknown_ops),
        "per_field":        pd.DataFrame(per_field_stats),
    }
    return target, summary, log
