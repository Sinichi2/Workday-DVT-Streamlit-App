"""
HCM Data Validation Engine

Applies a set of validation and transformation rules to a tabular dataset.
Returns the dataset with two added columns:
  _errors    : semicolon-separated list of failed rule IDs and severities
  _is_valid  : True if no Hard Stop rules failed

Severity values follow Workday conventions: Hard Stop, Soft Warning, Info.

Operations supported
--------------------
Validations (read-only, flag failures):
  not_null, contains, regex, unique,
  greater_than, less_than,
  date_not_future, date_within_offset_days,
  date_after_field, date_before_or_equal_field,
  not_equal_to_field, age_at_least,
  conditional_equals, conditional_regex,
  fte_hours_consistent

Transformations (mutate the dataset in place before validations run):
  trim, lowercase, uppercase, title_case
"""
import re
from datetime import date, datetime, timedelta

import pandas as pd


# ---------- Helpers ----------

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


def _to_number(v):
    if pd.isna(v) or v is None or v == "":
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def _years_since(d):
    today = date.today()
    years = today.year - d.year
    if (today.month, today.day) < (d.month, d.day):
        years -= 1
    return years


def _parse_conditional(param):
    """Parse 'OtherField=Value:RHS' into (other_field, condition_value, rhs)."""
    cond, _, rhs = param.partition(":")
    other_field, _, cond_value = cond.partition("=")
    return other_field.strip(), cond_value.strip(), rhs.strip()


# ---------- I/O ----------

def load_dataset(file):
    """Read a dataset (Excel) into a DataFrame."""
    return pd.read_excel(file)


def load_rules(file):
    """Read a rules workbook into a DataFrame, defaulting any missing columns."""
    rules = pd.read_excel(file)
    for col, default in [
        ("parameter", ""),
        ("severity", "Hard Stop"),
        ("description", ""),
        ("category", ""),
    ]:
        if col not in rules.columns:
            rules[col] = default
    rules = rules.fillna({
        "parameter": "",
        "severity": "Hard Stop",
        "description": "",
        "category": "",
    })
    return rules


# ---------- Transformations ----------

def _apply_transformation(df, rule, log):
    field, op = rule["field"], rule["operation"]
    if field not in df.columns:
        log.append(f"  [skip] {rule['rule_id']}: field '{field}' not in dataset")
        return df, 0

    def _safe(fn):
        return df[field].apply(lambda v: fn(v) if isinstance(v, str) else v)

    before = df[field].copy()
    if op == "trim":
        df[field] = _safe(str.strip)
    elif op == "lowercase":
        df[field] = _safe(str.lower)
    elif op == "uppercase":
        df[field] = _safe(str.upper)
    elif op == "title_case":
        df[field] = _safe(str.title)
    else:
        log.append(f"  [skip] {rule['rule_id']}: unknown transformation '{op}'")
        return df, 0

    changed = (before.astype(str) != df[field].astype(str)).sum()
    return df, int(changed)


# ---------- Validations ----------

def _apply_validation(df, rule, log):
    """Return a boolean Series where True means the row PASSES the rule."""
    field, op, param = rule["field"], rule["operation"], str(rule["parameter"])
    if field not in df.columns:
        log.append(f"  [skip] {rule['rule_id']}: field '{field}' not in dataset")
        return pd.Series([True] * len(df), index=df.index)

    col = df[field]

    if op == "not_null":
        return col.apply(lambda v: not (pd.isna(v) or (isinstance(v, str) and v.strip() == "")))

    if op == "contains":
        return col.apply(lambda v: isinstance(v, str) and param in v)

    if op == "regex":
        pat = re.compile(param)
        return col.apply(lambda v: isinstance(v, str) and bool(pat.match(v)))

    if op == "unique":
        counts = col.value_counts(dropna=True)
        dupes = set(counts[counts > 1].index)
        return col.apply(lambda v: not (isinstance(v, (str, int, float)) and v in dupes))

    if op in ("greater_than", "less_than"):
        threshold = float(param)
        def _cmp(v):
            n = _to_number(v)
            if n is None:
                return False
            return n > threshold if op == "greater_than" else n < threshold
        return col.apply(_cmp)

    if op == "date_not_future":
        today = date.today()
        return col.apply(lambda v: (_to_date(v) is None) or (_to_date(v) <= today))

    if op == "date_within_offset_days":
        max_offset = int(param)
        cutoff = date.today() + timedelta(days=max_offset)
        return col.apply(lambda v: (_to_date(v) is None) or (_to_date(v) <= cutoff))

    if op == "date_after_field":
        other = param
        if other not in df.columns:
            return pd.Series([True] * len(df), index=df.index)
        def _chk(row):
            a, b = _to_date(row[field]), _to_date(row[other])
            return True if a is None or b is None else a >= b
        return df.apply(_chk, axis=1)

    if op == "date_before_or_equal_field":
        other = param
        if other not in df.columns:
            return pd.Series([True] * len(df), index=df.index)
        def _chk(row):
            a, b = _to_date(row[field]), _to_date(row[other])
            return True if a is None or b is None else a <= b
        return df.apply(_chk, axis=1)

    if op == "not_equal_to_field":
        other = param
        if other not in df.columns:
            return pd.Series([True] * len(df), index=df.index)
        return df.apply(
            lambda r: r[field] != r[other] if pd.notna(r[field]) and pd.notna(r[other]) else True,
            axis=1,
        )

    if op == "age_at_least":
        min_age = int(param)
        def _chk(v):
            d = _to_date(v)
            return True if d is None else _years_since(d) >= min_age
        return col.apply(_chk)

    if op == "conditional_equals":
        other_field, cond_value, expected = _parse_conditional(param)
        if other_field not in df.columns:
            return pd.Series([True] * len(df), index=df.index)
        def _chk(row):
            if str(row[other_field]) != cond_value:
                return True
            return str(row[field]) == expected
        return df.apply(_chk, axis=1)

    if op == "conditional_regex":
        other_field, cond_value, pattern = _parse_conditional(param)
        if other_field not in df.columns:
            return pd.Series([True] * len(df), index=df.index)
        pat = re.compile(pattern)
        def _chk(row):
            if str(row[other_field]) != cond_value:
                return True
            v = row[field]
            if pd.isna(v) or v is None:
                return False
            return bool(pat.match(str(v)))
        return df.apply(_chk, axis=1)

    if op == "fte_hours_consistent":
        parts = param.split("|")
        fte_field = parts[0].strip()
        std_hours = float(parts[1]) if len(parts) > 1 else 40.0
        tolerance = float(parts[2]) if len(parts) > 2 else 4.0
        if fte_field not in df.columns:
            return pd.Series([True] * len(df), index=df.index)
        def _chk(row):
            fte = _to_number(row[fte_field])
            hrs = _to_number(row[field])
            if fte is None or hrs is None:
                return True
            return abs(hrs - fte * std_hours) <= tolerance
        return df.apply(_chk, axis=1)

    log.append(f"  [skip] {rule['rule_id']}: unknown validation '{op}'")
    return pd.Series([True] * len(df), index=df.index)


# ---------- Orchestration ----------

def apply_rules(df, rules_df):
    """
    Apply all rules to df. Returns (validated_df, summary, log_lines).
    """
    log = []
    out = df.copy()

    transforms = rules_df[rules_df["rule_type"] == "transformation"]
    log.append(f"=== Transformations: {len(transforms)} rule(s) ===")
    transform_changes = {}
    for _, rule in transforms.iterrows():
        out, changed = _apply_transformation(out, rule, log)
        transform_changes[rule["rule_id"]] = changed
        log.append(
            f"  {rule['rule_id']} on '{rule['field']}' ({rule['operation']}): "
            f"{changed} cell(s) changed"
        )

    validations = rules_df[rules_df["rule_type"] == "validation"]
    log.append(f"\n=== Validations: {len(validations)} rule(s) ===")
    error_lists = [[] for _ in range(len(out))]
    blocking_lists = [[] for _ in range(len(out))]
    validation_hits = {}

    for _, rule in validations.iterrows():
        passed = _apply_validation(out, rule, log)
        failed_count = int((~passed).sum())
        validation_hits[rule["rule_id"]] = failed_count
        log.append(
            f"  {rule['rule_id']} on '{rule['field']}' ({rule['operation']}, "
            f"{rule['severity']}): {failed_count} row(s) failed"
        )
        for pos, ok in enumerate(passed):
            if not ok:
                tag = f"{rule['rule_id']}({rule['severity']})"
                error_lists[pos].append(tag)
                if rule["severity"] == "Hard Stop":
                    blocking_lists[pos].append(rule["rule_id"])

    out["_errors"] = ["; ".join(e) if e else "" for e in error_lists]
    out["_is_valid"] = [len(b) == 0 for b in blocking_lists]

    skipped = rules_df[rules_df["rule_type"] == "not_implemented"]
    if len(skipped):
        log.append(f"\n=== Documented but not implemented: {len(skipped)} rule(s) ===")
        for _, rule in skipped.iterrows():
            log.append(f"  {rule['rule_id']} on '{rule['field']}': {rule['description']}")

    summary = {
        "total_rows": len(out),
        "rows_passing": int(out["_is_valid"].sum()),
        "rows_failing": int((~out["_is_valid"]).sum()),
        "rows_with_warnings": int((out["_errors"] != "").sum()) - int((~out["_is_valid"]).sum()),
        "transformations_run": len(transforms),
        "validations_run": len(validations),
        "not_implemented": len(skipped),
        "transform_changes": transform_changes,
        "validation_hits": validation_hits,
        "rules_df": rules_df,
    }

    return out, summary, log
