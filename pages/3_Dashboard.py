"""
Dashboard feature.

One upload: a validated dataset (has _errors and _is_valid columns).
Shows counts and percentages by Country, Worker Type, Severity, and Failure Reason.

Fully self-contained. State stored under "dash_" keys.
"""
import sys
from collections import Counter
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from validation_engine import load_dataset


st.set_page_config(page_title="Dashboard — HCM Data Validator", page_icon="📊", layout="wide")


def _init():
    defaults = {
        "dash_loaded":     False,
        "dash_df":         None,
        "dash_file_name":  "",
    }
    for k, v in defaults.items():
        st.session_state.setdefault(k, v)

_init()


def _parse_error_tags(err_str):
    """Pull (rule_id, severity) pairs out of a string like 'V005(Hard Stop); V008(Soft Warning)'."""
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
    """Return a DataFrame: value | total | passing | failing | with warnings | % failing."""
    if column not in df.columns:
        return pd.DataFrame()

    has_warning = (df["_errors"].astype(str) != "") & df["_is_valid"]
    rows = []
    for value, group in df.groupby(df[column].fillna("(missing)"), dropna=False):
        total = len(group)
        passing = int(group["_is_valid"].sum())
        failing = total - passing
        warnings = int(((group["_errors"].astype(str) != "") & group["_is_valid"]).sum())
        rows.append({
            column: value,
            "Total": total,
            "Passing": passing,
            "Failing": failing,
            "With warnings": warnings,
            "% Failing": round(failing / total * 100, 1) if total else 0.0,
        })
    return pd.DataFrame(rows).sort_values("Failing", ascending=False).reset_index(drop=True)


# ========================================================================
# Header
# ========================================================================
st.title("📊 Dashboard")
st.caption(
    "Upload a **validated dataset** (must have `_errors` and `_is_valid` columns) "
    "to see breakdowns by country, worker type, severity, and failure reason."
)
st.divider()


# ========================================================================
# Upload step
# ========================================================================
if not st.session_state.dash_loaded:
    st.subheader("Upload a validated dataset")
    f = st.file_uploader(
        "Validated dataset (.xlsx)",
        type=["xlsx"], key="dash_file", label_visibility="collapsed",
    )

    if f is not None:
        try:
            df = load_dataset(f)
            missing = [c for c in ["_errors", "_is_valid"] if c not in df.columns]
            if missing:
                st.error(
                    f"This file is missing the required column(s): {missing}. "
                    "Run the Validation feature first, then upload the result here."
                )
            else:
                st.session_state.dash_df = df
                st.session_state.dash_file_name = f.name
                st.session_state.dash_loaded = True
                st.rerun()
        except Exception as e:
            st.error(f"Could not read file: {e}")


# ========================================================================
# Stats view
# ========================================================================
else:
    df = st.session_state.dash_df

    l, r = st.columns([3, 1])
    with l:
        st.subheader("Statistics")
        st.caption(f"Source: `{st.session_state.dash_file_name}`")
    with r:
        if st.button("↺ Upload a different file", use_container_width=True):
            for k in list(st.session_state.keys()):
                if k.startswith("dash_"):
                    del st.session_state[k]
            st.rerun()

    st.divider()

    # ----- Headline metrics -----
    total = len(df)
    passing = int(df["_is_valid"].sum())
    failing = total - passing
    with_warnings = int(((df["_errors"].astype(str) != "") & df["_is_valid"]).sum())

    a, b, c, d = st.columns(4)
    with a:
        st.metric("Total rows", f"{total:,}")
    with b:
        st.metric("Passing", f"{passing:,}", help=_pct(passing, total) + " of total")
    with c:
        st.metric("Failing", f"{failing:,}", help=_pct(failing, total) + " of total")
    with d:
        st.metric("With soft warnings", f"{with_warnings:,}",
                  help=_pct(with_warnings, total) + " of total")

    st.divider()

    # ----- Two-column breakdowns: Country + Worker Type -----
    st.markdown("### Breakdowns by category")

    left_bd, right_bd = st.columns(2)

    with left_bd:
        st.markdown("**By Country**")
        country_col = "Country" if "Country" in df.columns else None
        if country_col is None:
            st.caption("No `Country` column found in this dataset.")
        else:
            bd = _breakdown_by_column(df, country_col)
            st.dataframe(bd, use_container_width=True, hide_index=True)

    with right_bd:
        st.markdown("**By Worker Type**")
        wt_col = "Worker Type" if "Worker Type" in df.columns else None
        if wt_col is None:
            st.caption("No `Worker Type` column found in this dataset.")
        else:
            bd = _breakdown_by_column(df, wt_col)
            st.dataframe(bd, use_container_width=True, hide_index=True)

    # Also break down by Employment Status if present (common HCM dimension)
    if "Employment Status" in df.columns:
        st.markdown("**By Employment Status**")
        bd = _breakdown_by_column(df, "Employment Status")
        st.dataframe(bd, use_container_width=True, hide_index=True)

    st.divider()

    # ----- By Severity -----
    st.markdown("### By severity")
    st.caption(
        "How many rule-failures of each severity occurred across the dataset. "
        "(One row can contribute to multiple severities if it failed multiple rules.)"
    )

    sev_counter = Counter()
    for err_str in df["_errors"].astype(str):
        for _, sev in _parse_error_tags(err_str):
            sev_counter[sev or "(unspecified)"] += 1

    if sev_counter:
        sev_df = pd.DataFrame(
            [{"Severity": s, "Failure count": n,
              "% of all failures": round(n / sum(sev_counter.values()) * 100, 1)}
             for s, n in sev_counter.most_common()]
        )
        st.dataframe(sev_df, use_container_width=True, hide_index=True)
    else:
        st.success("No rule failures recorded in this dataset.")

    st.divider()

    # ----- By Failure Reason (rule ID) -----
    st.markdown("### By failure reason")
    st.caption(
        "How many rows failed each specific rule. Sorted by frequency."
    )

    rule_counter = Counter()
    rule_severity = {}
    for err_str in df["_errors"].astype(str):
        for rid, sev in _parse_error_tags(err_str):
            rule_counter[rid] += 1
            rule_severity.setdefault(rid, sev)

    if rule_counter:
        reason_df = pd.DataFrame(
            [{"Rule": rid,
              "Severity": rule_severity.get(rid, ""),
              "Rows affected": n,
              "% of total rows": round(n / total * 100, 1)}
             for rid, n in rule_counter.most_common()]
        )
        st.dataframe(reason_df, use_container_width=True, hide_index=True)
    else:
        st.success("No rule failures to summarize.")
