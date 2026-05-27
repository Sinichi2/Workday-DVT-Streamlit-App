"""
Dashboard feature.

One upload: a validated dataset (must contain _errors and _is_valid columns).
Shows counts and percentages by Country, Worker Type, Severity, and Failure Reason.
"""
import sys
from collections import Counter
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from validation_engine import load_dataset


st.set_page_config(page_title="Dashboard - HCM Data Validator", layout="wide")


def _init():
    defaults = {
        "dash_loaded": False,
        "dash_df": None,
        "dash_file_name": "",
    }
    for k, v in defaults.items():
        st.session_state.setdefault(k, v)

_init()


def _parse_error_tags(err_str):
    """Pull (rule_id, severity) pairs from 'V005(Hard Stop); V008(Soft Warning)'."""
    if not isinstance(err_str, str) or not err_str.strip():
        return []
    pairs = []
    for tag in err_str.split(";"):
        tag = tag.strip()
        if not tag:
            continue
        if "(" in tag and tag.endswith(")"):
            rid, sev = tag.split("(", 1)
            pairs.append((rid.strip(), sev[:-1].strip()))
        else:
            pairs.append((tag, ""))
    return pairs


def _pct(part, total):
    return f"{(part / total * 100):.1f}%" if total else "0.0%"


def _breakdown_by_column(df, column):
    if column not in df.columns:
        return pd.DataFrame()
    rows = []
    for value in df[column].fillna("(blank)").unique():
        subset = df[df[column].fillna("(blank)") == value]
        total = len(subset)
        passing = int(subset["_is_valid"].sum())
        failing = total - passing
        with_warn = int((subset["_errors"] != "").sum()) - failing
        rows.append({
            column: value,
            "Total": total,
            "Passing": passing,
            "Failing": failing,
            "With warnings": with_warn,
            "% failing": _pct(failing, total),
        })
    return pd.DataFrame(rows).sort_values("Failing", ascending=False)


# ---------- Header ----------
st.title("Dashboard")
st.caption(
    "Browse a validated dataset by category. This stage expects a dataset that "
    "has already been through Validation - it must contain `_errors` and "
    "`_is_valid` columns."
)
st.divider()


# ---------- Upload ----------
if not st.session_state.dash_loaded:
    st.subheader("Upload a validated dataset")
    uploaded = st.file_uploader(
        "Validated dataset (Excel)",
        type=["xlsx", "xls"],
        key="dash_upload",
        help="Must contain _errors and _is_valid columns.",
    )

    if uploaded is not None:
        try:
            df = load_dataset(uploaded)
            if "_errors" not in df.columns or "_is_valid" not in df.columns:
                st.error(
                    "This file does not look like a validated dataset. "
                    "Expected columns `_errors` and `_is_valid` are missing. "
                    "Run Validation first."
                )
            else:
                st.session_state.dash_df = df
                st.session_state.dash_file_name = uploaded.name
                st.session_state.dash_loaded = True
                st.rerun()
        except Exception as e:
            st.error(f"Could not read file: {type(e).__name__}: {e}")
    else:
        st.info("Upload a validated dataset to begin.")

# ---------- Results ----------
else:
    df = st.session_state.dash_df

    top_left, top_right = st.columns([3, 1])
    with top_left:
        st.subheader(f"Dashboard for `{st.session_state.dash_file_name}`")
    with top_right:
        if st.button("Start over", use_container_width=True):
            st.session_state.dash_loaded = False
            st.session_state.dash_df = None
            st.session_state.dash_file_name = ""
            st.rerun()

    # Headline metrics
    total = len(df)
    passing = int(df["_is_valid"].sum())
    failing = total - passing
    with_warn = int((df["_errors"] != "").sum()) - failing

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Total rows", total)
    m2.metric("Passing", f"{passing} ({_pct(passing, total)})")
    m3.metric("Failing", f"{failing} ({_pct(failing, total)})")
    m4.metric("With warnings", with_warn)

    st.divider()

    # Country
    country_col = None
    for candidate in ["Country", "Country Code", "country"]:
        if candidate in df.columns:
            country_col = candidate
            break

    if country_col:
        st.markdown("#### By Country")
        st.dataframe(
            _breakdown_by_column(df, country_col),
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info("No Country column found. Skipping country breakdown.")

    # Worker Type
    wt_col = None
    for candidate in ["Worker Type", "Worker_Type", "worker_type"]:
        if candidate in df.columns:
            wt_col = candidate
            break

    if wt_col:
        st.markdown("#### By Worker Type")
        st.dataframe(
            _breakdown_by_column(df, wt_col),
            use_container_width=True,
            hide_index=True,
        )

    # Employment Status
    es_col = None
    for candidate in ["Employment Status", "Status", "employment_status"]:
        if candidate in df.columns:
            es_col = candidate
            break

    if es_col:
        st.markdown("#### By Employment Status")
        st.dataframe(
            _breakdown_by_column(df, es_col),
            use_container_width=True,
            hide_index=True,
        )

    # Severity
    st.markdown("#### By Severity")
    severity_counts = Counter()
    for err_str in df["_errors"]:
        for _, sev in _parse_error_tags(err_str):
            if sev:
                severity_counts[sev] += 1
    if severity_counts:
        sev_df = pd.DataFrame(
            [{"Severity": s, "Failures (across all rows)": c}
             for s, c in severity_counts.items()]
        ).sort_values("Failures (across all rows)", ascending=False)
        st.dataframe(sev_df, use_container_width=True, hide_index=True)
    else:
        st.success("No failures across any severity.")

    # Failure reason (per-rule)
    st.markdown("#### By Failure Reason")
    rule_counter = Counter()
    rule_severity = {}
    for err_str in df["_errors"]:
        for rid, sev in _parse_error_tags(err_str):
            rule_counter[rid] += 1
            rule_severity[rid] = sev
    if rule_counter:
        reason_df = pd.DataFrame([
            {"Rule": rid, "Severity": rule_severity.get(rid, ""),
             "Rows affected": c, "% of dataset": _pct(c, total)}
            for rid, c in rule_counter.most_common()
        ])
        st.dataframe(reason_df, use_container_width=True, hide_index=True)
    else:
        st.success("No failures.")
