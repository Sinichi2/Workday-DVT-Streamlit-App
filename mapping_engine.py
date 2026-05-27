"""
Source-to-Target Transformation Engine

Takes a source dataset (e.g., Oracle HCM export) plus a mapping workbook and
produces a target dataset shaped for a destination system (typically Workday).

Mapping workbook format
-----------------------
Sheet 'mappings' (required):
  source_field    : column name in the source dataset (blank for constants)
  target_field    : column name to produce in the target dataset
  transformation  : operation to apply (see SUPPORTED_TRANSFORMATIONS)
  parameter       : optional argument (date format, crosswalk name, constant, etc.)
  required        : "Yes" / "No" (informational)
  description     : human-readable note

Sheet 'crosswalks' (optional):
  crosswalk_name  : ID referenced by transformation='crosswalk' rows
  source_value    : value as it appears in the source dataset
  target_value    : value to substitute in the target dataset

Supported transformations
-------------------------
  none               : copy value unchanged
  trim               : strip surrounding whitespace
  trim_leading_zeros : "00123" -> "123"
  lowercase          : "ABC" -> "abc"
  uppercase          : "abc" -> "ABC"
  title_case         : "john doe" -> "John Doe"
  proper_case        : alias for title_case
  format_date        : parse + reformat; parameter is target format (default "%Y-%m-%d")
  round_decimals     : round numbers; parameter is decimal places (default 2)
  remove_special     : strip non-alphanumeric characters
  digits_only        : keep only digit characters
  crosswalk          : look up value in crosswalks sheet; parameter is crosswalk_name
  constant           : use parameter as the literal value (source_field can be blank)
  concat             : combine multiple source fields; parameter is "field1|field2|..."
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
    Crosswalks are returned as {crosswalk_name: {source_value: target_value}}.
    """
    xl = pd.ExcelFile(file)

    if "mappings" not in xl.sheet_names:
        raise ValueError(
            f"Mapping file must contain a 'mappings' sheet. Found: {xl.sheet_names}"
        )

    mappings = pd.read_excel(xl, sheet_name="mappings")
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

    crosswalks = {}
    if "crosswalks" in xl.sheet_names:
        cw_df = pd.read_excel(xl, sheet_name="crosswalks").fillna("")
        required_cols = {"crosswalk_name", "source_value", "target_value"}
        missing = required_cols - set(cw_df.columns)
        if missing:
            raise ValueError(
                f"crosswalks sheet missing required columns: {missing}"
            )
        for _, row in cw_df.iterrows():
            name = str(row["crosswalk_name"]).strip()
            if not name:
                continue
            crosswalks.setdefault(name, {})
            src = str(row["source_value"]).strip()
            crosswalks[name][src] = row["target_value"]

    return mappings, crosswalks


# ---------- Transformations ----------

def _trim_leading_zeros(v):
    if pd.isna(v) or v is None:
        return v
    # Handle pandas-coerced integer-valued floats (e.g., 100001.0 -> "100001")
    if isinstance(v, float) and v.is_integer():
        v = str(int(v))
    s = str(v)
    if s.startswith("-"):
        return "-" + s[1:].lstrip("0") if s[1:].lstrip("0") else "-0"
    stripped = s.lstrip("0")
    return stripped if stripped else "0"


def _format_date(v, fmt):
    if pd.isna(v) or v is None or v == "":
        return v
    try:
        d = pd.to_datetime(v)
        return d.strftime(fmt)
    except Exception:
        return v


def _round_decimals(v, places):
    n = pd.to_numeric(v, errors="coerce")
    if pd.isna(n):
        return v
    return round(float(n), places)


def _remove_special(v):
    if pd.isna(v) or v is None:
        return v
    return re.sub(r"[^A-Za-z0-9]", "", str(v))


def _digits_only(v):
    if pd.isna(v) or v is None:
        return v
    return re.sub(r"\D", "", str(v))


def _apply_one_transform(source_value, op, parameter, crosswalks, source_row=None):
    if op == "none":
        return source_value
    if op == "trim":
        return source_value.strip() if isinstance(source_value, str) else source_value
    if op == "trim_leading_zeros":
        return _trim_leading_zeros(source_value)
    if op == "lowercase":
        return source_value.lower() if isinstance(source_value, str) else source_value
    if op == "uppercase":
        return source_value.upper() if isinstance(source_value, str) else source_value
    if op in ("title_case", "proper_case"):
        return source_value.title() if isinstance(source_value, str) else source_value
    if op == "format_date":
        fmt = parameter.strip() if parameter else "%Y-%m-%d"
        return _format_date(source_value, fmt)
    if op == "round_decimals":
        try:
            places = int(parameter) if parameter else 2
        except ValueError:
            places = 2
        return _round_decimals(source_value, places)
    if op == "remove_special":
        return _remove_special(source_value)
    if op == "digits_only":
        return _digits_only(source_value)
    if op == "crosswalk":
        name = parameter.strip()
        mapping = crosswalks.get(name, {})
        key = str(source_value).strip() if not pd.isna(source_value) else ""
        return mapping.get(key, source_value)
    if op == "constant":
        return parameter
    if op == "concat":
        if source_row is None or not parameter:
            return source_value
        fields = [f.strip() for f in parameter.split("|") if f.strip()]
        parts = [str(source_row[f]) for f in fields if f in source_row.index and not pd.isna(source_row[f])]
        return " ".join(parts)
    if op == "split_first":
        delim = parameter if parameter else " "
        if not isinstance(source_value, str):
            return source_value
        return source_value.split(delim)[0]
    if op == "split_last":
        delim = parameter if parameter else " "
        if not isinstance(source_value, str):
            return source_value
        return source_value.split(delim)[-1]
    raise ValueError(f"Unknown transformation: {op}")


# ---------- Orchestration ----------

def apply_mapping(source_df, mappings_df, crosswalks):
    """
    Apply all mapping rules to source_df. Returns (target_df, summary, log_lines).
      target_df    : new DataFrame in target shape
      summary      : dict with metrics
      log_lines    : list describing what happened
    """
    log = []
    target = pd.DataFrame(index=source_df.index)
    per_field_details = []

    log.append(f"=== Mapping: {len(mappings_df)} field rule(s) ===")
    log.append(f"  Source shape: {source_df.shape[0]} rows x {source_df.shape[1]} cols")
    log.append(f"  Crosswalks loaded: {len(crosswalks)} ({', '.join(crosswalks.keys()) if crosswalks else 'none'})")

    for _, rule in mappings_df.iterrows():
        src = str(rule["source_field"]).strip()
        tgt = str(rule["target_field"]).strip()
        op = str(rule["transformation"]).strip() or "none"
        param = str(rule["parameter"]).strip() if not pd.isna(rule["parameter"]) else ""

        if not tgt:
            log.append(f"  [skip] empty target_field for source '{src}'")
            continue

        if op not in SUPPORTED_TRANSFORMATIONS:
            log.append(f"  [skip] {tgt}: unknown transformation '{op}'")
            target[tgt] = pd.NA
            per_field_details.append({
                "Target field": tgt, "Source field": src, "Transformation": op,
                "Status": "Unknown op", "Non-blank values": 0,
            })
            continue

        try:
            if op == "constant":
                target[tgt] = [param] * len(source_df)
            elif op == "concat":
                target[tgt] = source_df.apply(
                    lambda row: _apply_one_transform(None, op, param, crosswalks, row),
                    axis=1,
                )
            elif src and src in source_df.columns:
                target[tgt] = source_df[src].apply(
                    lambda v: _apply_one_transform(v, op, param, crosswalks)
                )
            elif src and src not in source_df.columns:
                log.append(f"  [skip] {tgt}: source field '{src}' not in dataset")
                target[tgt] = pd.NA
                per_field_details.append({
                    "Target field": tgt, "Source field": src, "Transformation": op,
                    "Status": "Source missing", "Non-blank values": 0,
                })
                continue
            else:
                log.append(f"  [skip] {tgt}: no source_field and op is not constant/concat")
                target[tgt] = pd.NA
                continue

            non_blank = int(target[tgt].apply(
                lambda v: not (pd.isna(v) or (isinstance(v, str) and v.strip() == ""))
            ).sum())
            log.append(f"  {tgt} <- {src or '(none)'} ({op}): {non_blank} non-blank value(s)")
            per_field_details.append({
                "Target field": tgt, "Source field": src, "Transformation": op,
                "Status": "OK", "Non-blank values": non_blank,
            })

        except Exception as e:
            log.append(f"  [error] {tgt}: {type(e).__name__}: {e}")
            target[tgt] = pd.NA
            per_field_details.append({
                "Target field": tgt, "Source field": src, "Transformation": op,
                "Status": f"Error: {e}", "Non-blank values": 0,
            })

    summary = {
        "source_rows": len(source_df),
        "source_columns": len(source_df.columns),
        "target_columns": len(target.columns),
        "crosswalks_loaded": len(crosswalks),
        "rules_total": len(mappings_df),
        "rules_applied": sum(1 for d in per_field_details if d["Status"] == "OK"),
        "per_field_details": pd.DataFrame(per_field_details),
    }

    return target, summary, log
