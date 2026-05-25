"""
Validation feature.

Three uploads -> run both rule sets -> compare OLD vs NEW.

This page is fully self-contained. State stored in st.session_state under keys
prefixed with "val_" to avoid colliding with other pages.
"""
import io
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st

# Make the parent directory importable for the engine modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from validation_engine import apply_rules, load_dataset, load_rules


st.set_page_config(page_title="Validation — HCM Data Validator", page_icon="✅", layout="wide")


# ---------- Session state (page-scoped) ----------
def _init():
    defaults = {
        "val_processed":      False,
        "val_old_result":     None,
        "val_new_result":     None,
        "val_old_summary":    None,
        "val_new_summary":    None,
        "val_log_lines":      [],
        "val_view":           "new",
        "val_source_name":    "",
        "val_old_rules_name": "",
        "val_new_rules_name": "",
    }
    for k, v in defaults.items():
        st.session_state.setdefault(k, v)

_init()


@st.cache_data
def _to_excel_bytes(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        df.to_excel(w, index=False, sheet_name="Validated")
    return buf.getvalue()


def _hits_df(summary):
    hits = summary.get("validation_hits", {})
    rules_df = summary.get("rules_df")
    if not hits or rules_df is None:
        return pd.DataFrame()
    rows = []
    for rid, n in hits.items():
        if n == 0:
            continue
        desc_row = rules_df[rules_df["rule_id"] == rid]
        rows.append({
            "Rule":        rid,
            "Severity":    desc_row["severity"].iloc[0] if len(desc_row) else "",
            "Rows failed": n,
            "Description": desc_row["description"].iloc[0] if len(desc_row) else "",
        })
    return pd.DataFrame(rows).sort_values("Rows failed", ascending=False) if rows else pd.DataFrame()


# ========================================================================
# Header
# ========================================================================
st.title("✅ Validation")
st.caption(
    "Run two rule sets against the same HCM dataset and see what changed. "
    "The dataset must already be in the target shape — use Source Mapping first if you have raw Oracle data."
)
st.divider()


# ========================================================================
# Upload step
# ========================================================================
if not st.session_state.val_processed:
    st.subheader("Step 1 — Upload files")

    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown("**1. HCM Dataset**")
        st.caption("Employee data in target (Workday) shape")
        hcm = st.file_uploader("hcm", type=["xlsx"], key="val_hcm", label_visibility="collapsed")
    with c2:
        st.markdown("**2. Old Validation Rules**")
        st.caption("Baseline rule set")
        old = st.file_uploader("old", type=["xlsx"], key="val_old", label_visibility="collapsed")
    with c3:
        st.markdown("**3. New Validation Rules**")
        st.caption("Updated rule set")
        new = st.file_uploader("new", type=["xlsx"], key="val_new", label_visibility="collapsed")

    st.write("")
    ready = all([hcm, old, new])
    if not ready:
        st.info("Upload all three files to enable processing.")

    if st.button("▶ Run validation", type="primary", disabled=not ready):
        with st.spinner("Running validations..."):
            log = []
            log.append(f"Run started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            log.append(f"HCM dataset:    {hcm.name} ({hcm.size:,} bytes)")
            log.append(f"Old rules file: {old.name} ({old.size:,} bytes)")
            log.append(f"New rules file: {new.name} ({new.size:,} bytes)")
            log.append("")

            try:
                df = load_dataset(hcm)
                rules_old = load_rules(old)
                rules_new = load_rules(new)
                log.append(f"Loaded dataset: {len(df)} rows x {len(df.columns)} columns")
                log.append(f"Loaded OLD rules: {len(rules_old)} rules")
                log.append(f"Loaded NEW rules: {len(rules_new)} rules")
                log.append("")

                log.append("------ Running OLD rules ------")
                old_result, old_summary, old_log = apply_rules(df, rules_old)
                log.extend(old_log)
                log.append("")
                log.append("------ Running NEW rules ------")
                new_result, new_summary, new_log = apply_rules(df, rules_new)
                log.extend(new_log)
                log.append("")
                log.append(f"Run finished at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

                st.session_state.val_old_result     = old_result
                st.session_state.val_new_result     = new_result
                st.session_state.val_old_summary    = old_summary
                st.session_state.val_new_summary    = new_summary
                st.session_state.val_log_lines      = log
                st.session_state.val_source_name    = hcm.name
                st.session_state.val_old_rules_name = old.name
                st.session_state.val_new_rules_name = new.name
                st.session_state.val_processed      = True
                st.rerun()

            except Exception as e:
                st.error(f"Processing failed: {e}")
                st.exception(e)


# ========================================================================
# Results
# ========================================================================
else:
    old_s = st.session_state.val_old_summary
    new_s = st.session_state.val_new_summary

    # Top bar
    l, r = st.columns([3, 1])
    with l:
        st.subheader("Results")
        st.caption(
            f"Source: `{st.session_state.val_source_name}` · "
            f"Old: `{st.session_state.val_old_rules_name}` · "
            f"New: `{st.session_state.val_new_rules_name}`"
        )
    with r:
        excel_bytes = _to_excel_bytes(st.session_state.val_new_result)
        dl_name = st.session_state.val_source_name.replace(".xlsx", "") + "_validated.xlsx"
        st.download_button(
            "⬇ Download validated dataset",
            data=excel_bytes, file_name=dl_name,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            type="primary", use_container_width=True,
        )
        if st.button("↺ Start over", use_container_width=True):
            for k in list(st.session_state.keys()):
                if k.startswith("val_"):
                    del st.session_state[k]
            st.rerun()

    st.divider()

    tab_summary, tab_compare, tab_dashboard, tab_log = st.tabs([
        "📊 Summary", "🔀 Comparison", "📋 Dashboard", "📝 Log"
    ])

    # --- Summary ---
    with tab_summary:
        st.markdown("### Validation summary")
        a, b, c, d = st.columns(4)
        with a:
            st.metric("Total rows", f"{new_s['total_rows']:,}")
        with b:
            delta = new_s["rows_passing"] - old_s["rows_passing"]
            st.metric("Passing (NEW)", f"{new_s['rows_passing']:,}",
                      delta=f"{delta:+d} vs OLD",
                      delta_color="normal" if delta >= 0 else "inverse")
        with c:
            delta = new_s["rows_failing"] - old_s["rows_failing"]
            st.metric("Failing (NEW)", f"{new_s['rows_failing']:,}",
                      delta=f"{delta:+d} vs OLD",
                      delta_color="inverse" if delta >= 0 else "normal")
        with d:
            st.metric("Soft warnings (NEW)", f"{new_s['rows_with_warnings']:,}")

        ca, cb = st.columns(2)
        with ca:
            st.markdown("**Transformations applied (NEW)**")
            tx = new_s.get("transform_changes", {})
            if tx:
                st.dataframe(
                    pd.DataFrame([{"Rule": k, "Cells changed": v} for k, v in tx.items()]),
                    use_container_width=True, hide_index=True,
                )
            else:
                st.caption("No transformation rules in the NEW rule set.")
        with cb:
            st.markdown("**Validation hits (NEW)**")
            hd = _hits_df(new_s)
            if not hd.empty:
                st.dataframe(hd, use_container_width=True, hide_index=True)
            else:
                st.success("All rows passed every validation.")

    # --- Comparison ---
    with tab_compare:
        st.markdown("### Side-by-side: OLD rules vs NEW rules")
        filt = st.radio(
            "Show",
            options=[
                "All rows",
                "Rows where results differ",
                "Rows passing OLD but failing NEW",
                "Rows failing OLD but passing NEW",
                "Failing in either",
            ],
            horizontal=True, key="val_compare_filter",
        )
        old_df = st.session_state.val_old_result.copy()
        new_df = st.session_state.val_new_result.copy()

        candidate = ["Employee ID", "First Name", "Last Name", "Country"]
        id_cols = [c for c in candidate if c in old_df.columns] or list(old_df.columns[:3])

        differs        = (old_df["_is_valid"] != new_df["_is_valid"]) | (old_df["_errors"].astype(str) != new_df["_errors"].astype(str))
        old_ok_new_bad = old_df["_is_valid"] & ~new_df["_is_valid"]
        old_bad_new_ok = ~old_df["_is_valid"] & new_df["_is_valid"]
        fail_either    = ~old_df["_is_valid"] | ~new_df["_is_valid"]

        if filt == "Rows where results differ":              mask = differs
        elif filt == "Rows passing OLD but failing NEW":     mask = old_ok_new_bad
        elif filt == "Rows failing OLD but passing NEW":     mask = old_bad_new_ok
        elif filt == "Failing in either":                    mask = fail_either
        else:                                                mask = pd.Series([True] * len(old_df), index=old_df.index)

        st.caption(f"{int(mask.sum()):,} row(s) match this filter.")

        lcol, rcol = st.columns(2)
        old_view = old_df.loc[mask, id_cols + ["_is_valid", "_errors"]].rename(
            columns={"_is_valid": "Valid (OLD)", "_errors": "Errors (OLD)"})
        new_view = new_df.loc[mask, id_cols + ["_is_valid", "_errors"]].rename(
            columns={"_is_valid": "Valid (NEW)", "_errors": "Errors (NEW)"})
        with lcol:
            st.markdown(f"**OLD rules** — {old_s['rows_passing']}/{old_s['total_rows']} passing")
            st.dataframe(old_view, use_container_width=True, height=460)
        with rcol:
            st.markdown(f"**NEW rules** — {new_s['rows_passing']}/{new_s['total_rows']} passing")
            st.dataframe(new_view, use_container_width=True, height=460)

        st.markdown("---")
        st.markdown("#### Net difference")
        d1, d2, d3 = st.columns(3)
        with d1:
            st.metric("Newly caught by NEW", f"{int(old_ok_new_bad.sum()):,}")
        with d2:
            st.metric("Newly cleared by NEW", f"{int(old_bad_new_ok.sum()):,}")
        with d3:
            st.metric("Different in either direction", f"{int(differs.sum()):,}")

    # --- Dashboard (full table view with toggle) ---
    with tab_dashboard:
        st.markdown("### Validated dataset")
        bl, br, _ = st.columns([1, 1, 4])
        with bl:
            t = "primary" if st.session_state.val_view == "old" else "secondary"
            if st.button("Old Dataset", type=t, use_container_width=True):
                st.session_state.val_view = "old"
                st.rerun()
        with br:
            t = "primary" if st.session_state.val_view == "new" else "secondary"
            if st.button("New Dataset", type=t, use_container_width=True):
                st.session_state.val_view = "new"
                st.rerun()

        if st.session_state.val_view == "old":
            active = st.session_state.val_old_result
            summary = old_s
            label = "OLD rules"
        else:
            active = st.session_state.val_new_result
            summary = new_s
            label = "NEW rules"

        st.caption(
            f"Showing dataset validated against **{label}** — "
            f"{summary['rows_passing']:,} passing, {summary['rows_failing']:,} failing, "
            f"{summary['rows_with_warnings']:,} with soft warnings."
        )

        fc = st.radio(
            "Filter",
            options=["All rows", "Failing only", "With any flag (incl. warnings)"],
            horizontal=True, key=f"val_filter_{st.session_state.val_view}",
        )
        if fc == "Failing only":
            display = active[~active["_is_valid"]]
        elif fc == "With any flag (incl. warnings)":
            display = active[active["_errors"] != ""]
        else:
            display = active
        st.dataframe(display, use_container_width=True, hide_index=True, height=460)
        st.caption(f"{len(display):,} row(s) shown.")

    # --- Log ---
    with tab_log:
        st.markdown("### Run log")
        log_text = "\n".join(st.session_state.val_log_lines)
        st.code(log_text, language="text")
        st.download_button(
            "⬇ Download log (.txt)",
            data=log_text,
            file_name=f"validation_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            mime="text/plain",
        )
