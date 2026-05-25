"""
HCM Data Validation Tool - Streamlit MVP (with Source-to-Target mapping)

Two-stage pipeline:
  Stage 1 - Mapping  : Source dataset (e.g., Oracle) -> Workday-shaped dataset
  Stage 2 - Validation : Workday-shaped dataset -> Validated dataset

Flow:
  1. Upload source dataset, mapping file, OLD rules, NEW rules
  2. Click Process
  3. Browse results across five tabs:
     - Summary    : pipeline metrics
     - Mapping    : Oracle -> Workday side-by-side
     - Comparison : OLD rules vs NEW rules side-by-side
     - Dashboard  : single read-only table (toggle OLD / NEW)
     - Log        : full run log
  4. Download the validated (mapped + NEW-rules) dataset
"""
import io
from datetime import datetime

import pandas as pd
import streamlit as st

from mapping_engine import apply_mapping, load_mapping_file
from validation_engine import apply_rules, load_dataset, load_rules


# ---------- Page config ----------
st.set_page_config(
    page_title="HCM Data Validator",
    page_icon="📋",
    layout="wide",
    initial_sidebar_state="collapsed",
)


# ---------- Session state ----------
def _init_state():
    defaults = {
        "processed":        False,
        "source_df":        None,
        "mapped_df":        None,
        "mapping_summary":  None,
        "old_result":       None,
        "new_result":       None,
        "old_summary":      None,
        "new_summary":      None,
        "log_lines":        [],
        "view":             "new",
        "source_name":      "",
        "mapping_name":     "",
        "old_rules_name":   "",
        "new_rules_name":   "",
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

_init_state()


# ---------- Helpers ----------
@st.cache_data
def _to_excel_bytes(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Validated")
    return buf.getvalue()


def _build_hits_df(summary):
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


# ---------- Header ----------
st.title("📋 HCM Data Validator")
st.caption(
    "**Source → Target → Validate.** Upload a source dataset, a mapping file, and two rule sets. "
    "The tool transforms the source data to Workday format, runs both rule sets against it, and "
    "lets you compare results side-by-side."
)
st.divider()


# ============================================================
# Upload step
# ============================================================
if not st.session_state.processed:
    st.subheader("Step 1 — Upload files")
    st.write("All four files must be `.xlsx`.")

    col1, col2 = st.columns(2)
    col3, col4 = st.columns(2)

    with col1:
        st.markdown("**1. Source Dataset**")
        st.caption("Raw data from the source system (e.g., Oracle export)")
        source_file = st.file_uploader(
            "Upload source dataset", type=["xlsx"],
            key="source_upload", label_visibility="collapsed",
        )

    with col2:
        st.markdown("**2. Mapping File**")
        st.caption("Source → Target field mappings (Stage 1)")
        mapping_file = st.file_uploader(
            "Upload mapping file", type=["xlsx"],
            key="mapping_upload", label_visibility="collapsed",
        )

    with col3:
        st.markdown("**3. Old Validation Rules**")
        st.caption("The current business rules (Stage 2 baseline)")
        old_rules_file = st.file_uploader(
            "Upload old rules", type=["xlsx"],
            key="old_rules_upload", label_visibility="collapsed",
        )

    with col4:
        st.markdown("**4. New Validation Rules**")
        st.caption("The updated business rules (Stage 2 target)")
        new_rules_file = st.file_uploader(
            "Upload new rules", type=["xlsx"],
            key="new_rules_upload", label_visibility="collapsed",
        )

    st.write("")
    all_uploaded = all([source_file, mapping_file, old_rules_file, new_rules_file])
    if not all_uploaded:
        st.info("Upload all four files to enable processing.")

    if st.button("▶ Process", type="primary", disabled=not all_uploaded):
        with st.spinner("Running pipeline..."):
            log = []
            log.append(f"Run started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            log.append(f"Source dataset: {source_file.name} ({source_file.size:,} bytes)")
            log.append(f"Mapping file:   {mapping_file.name} ({mapping_file.size:,} bytes)")
            log.append(f"Old rules file: {old_rules_file.name} ({old_rules_file.size:,} bytes)")
            log.append(f"New rules file: {new_rules_file.name} ({new_rules_file.size:,} bytes)")
            log.append("")

            try:
                # Load all four files
                source_df              = load_dataset(source_file)
                mappings, crosswalks   = load_mapping_file(mapping_file)
                rules_old              = load_rules(old_rules_file)
                rules_new              = load_rules(new_rules_file)
                log.append(f"Loaded source dataset: {len(source_df)} rows x {len(source_df.columns)} columns")
                log.append(f"Loaded mappings: {len(mappings)} field mappings, {len(crosswalks)} crosswalk group(s)")
                log.append(f"Loaded OLD rules: {len(rules_old)} rules")
                log.append(f"Loaded NEW rules: {len(rules_new)} rules")
                log.append("")

                # Stage 1: Mapping
                log.append("====== STAGE 1: MAPPING (source -> target) ======")
                mapped_df, mapping_summary, map_log = apply_mapping(source_df, mappings, crosswalks)
                log.extend(map_log)
                log.append("")

                # Stage 2: Validation (both rule sets, on the mapped dataset)
                log.append("====== STAGE 2: VALIDATION ======")
                log.append("------ Running OLD rules ------")
                old_result, old_summary, old_log = apply_rules(mapped_df, rules_old)
                log.extend(old_log)
                log.append("")
                log.append("------ Running NEW rules ------")
                new_result, new_summary, new_log = apply_rules(mapped_df, rules_new)
                log.extend(new_log)
                log.append("")
                log.append(f"Run finished at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

                # Persist into session state
                st.session_state.source_df       = source_df
                st.session_state.mapped_df       = mapped_df
                st.session_state.mapping_summary = mapping_summary
                st.session_state.old_result      = old_result
                st.session_state.new_result      = new_result
                st.session_state.old_summary     = old_summary
                st.session_state.new_summary     = new_summary
                st.session_state.log_lines       = log
                st.session_state.source_name     = source_file.name
                st.session_state.mapping_name    = mapping_file.name
                st.session_state.old_rules_name  = old_rules_file.name
                st.session_state.new_rules_name  = new_rules_file.name
                st.session_state.processed       = True
                st.rerun()

            except Exception as e:
                st.error(f"Processing failed: {e}")
                st.exception(e)


# ============================================================
# Results
# ============================================================
else:
    old_s = st.session_state.old_summary
    new_s = st.session_state.new_summary
    map_s = st.session_state.mapping_summary

    # ---- Top bar: source files + action buttons ----
    left, right = st.columns([3, 1])
    with left:
        st.subheader("Results")
        st.caption(
            f"Source: `{st.session_state.source_name}` · "
            f"Mapping: `{st.session_state.mapping_name}` · "
            f"Old rules: `{st.session_state.old_rules_name}` · "
            f"New rules: `{st.session_state.new_rules_name}`"
        )
    with right:
        new_excel_bytes = _to_excel_bytes(st.session_state.new_result)
        download_name = (
            st.session_state.source_name.replace(".xlsx", "") + "_validated.xlsx"
        )
        st.download_button(
            label="⬇ Download validated dataset",
            data=new_excel_bytes,
            file_name=download_name,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            type="primary",
            use_container_width=True,
        )
        if st.button("↺ Start over", use_container_width=True):
            for k in list(st.session_state.keys()):
                del st.session_state[k]
            st.rerun()

    st.divider()

    # ---- Tabs ----
    tab_summary, tab_mapping, tab_compare, tab_dashboard, tab_log = st.tabs([
        "📊 Summary", "🔄 Mapping", "🔀 Comparison", "📋 Dashboard", "📝 Log"
    ])

    # ----------------------------------------------------------------
    # Tab 1: Summary
    # ----------------------------------------------------------------
    with tab_summary:
        st.markdown("### Pipeline summary")

        # Top metrics
        sa, sb, sc, sd = st.columns(4)
        with sa:
            st.metric("Source rows", f"{map_s['source_rows']:,}",
                      help=f"{map_s['source_cols']} source columns")
        with sb:
            st.metric("Target rows", f"{map_s['target_rows']:,}",
                      help=f"{map_s['target_cols']} target columns after mapping")
        with sc:
            delta = new_s["rows_passing"] - old_s["rows_passing"]
            st.metric(
                "Passing (NEW)", f"{new_s['rows_passing']:,}",
                delta=f"{delta:+d} vs OLD",
                delta_color="normal" if delta >= 0 else "inverse",
            )
        with sd:
            delta = new_s["rows_failing"] - old_s["rows_failing"]
            st.metric(
                "Failing (NEW)", f"{new_s['rows_failing']:,}",
                delta=f"{delta:+d} vs OLD",
                delta_color="inverse" if delta >= 0 else "normal",
            )

        st.markdown("")

        # Per-stage breakdown
        st.markdown("**Stage 1 — Mapping**")
        st.caption(
            f"Applied {map_s['mapping_count']} field mapping(s) "
            f"using {map_s['crosswalk_count']} crosswalk group(s)."
        )
        if not map_s["per_field"].empty:
            st.dataframe(map_s["per_field"], use_container_width=True, hide_index=True, height=240)

        st.markdown("**Stage 2 — Validation (NEW rules)**")
        ca, cb = st.columns(2)
        with ca:
            st.caption("Transformations applied")
            tx_changes = new_s.get("transform_changes", {})
            if tx_changes:
                tx_df = pd.DataFrame(
                    [{"Rule": rid, "Cells changed": n} for rid, n in tx_changes.items()]
                )
                st.dataframe(tx_df, use_container_width=True, hide_index=True)
            else:
                st.caption("No transformation rules in the NEW rule set.")
        with cb:
            st.caption("Validation hits")
            hits_df = _build_hits_df(new_s)
            if not hits_df.empty:
                st.dataframe(hits_df, use_container_width=True, hide_index=True)
            else:
                st.success("All rows passed every validation.")

    # ----------------------------------------------------------------
    # Tab 2: Mapping — Source vs Target side-by-side
    # ----------------------------------------------------------------
    with tab_mapping:
        st.markdown("### Stage 1: Source → Target mapping")
        st.caption(
            "The mapping engine converted the source columns and values into Workday shape. "
            "Compare the raw source against the mapped target below."
        )

        m1, m2, m3 = st.columns(3)
        with m1:
            st.metric("Source columns", map_s["source_cols"])
        with m2:
            st.metric("Target columns", map_s["target_cols"])
        with m3:
            st.metric("Crosswalk groups", map_s["crosswalk_count"])

        if map_s["unknown_ops"]:
            st.warning(
                "Unknown transformation(s) encountered (passed through as-is): "
                + ", ".join(map_s["unknown_ops"])
            )

        st.markdown("---")
        st.markdown("#### Per-field mapping details")
        if not map_s["per_field"].empty:
            st.dataframe(
                map_s["per_field"],
                use_container_width=True, hide_index=True, height=300,
            )

        st.markdown("---")
        st.markdown("#### Side-by-side: source vs target")
        st.caption("First 50 rows shown.")
        sb_left, sb_right = st.columns(2)
        with sb_left:
            st.markdown(f"**Source dataset** ({map_s['source_cols']} cols)")
            st.dataframe(
                st.session_state.source_df.head(50),
                use_container_width=True, hide_index=False, height=420,
            )
        with sb_right:
            st.markdown(f"**Target dataset** ({map_s['target_cols']} cols)")
            st.dataframe(
                st.session_state.mapped_df.head(50),
                use_container_width=True, hide_index=False, height=420,
            )

        # Let users download the intermediate mapped dataset too
        mapped_bytes = _to_excel_bytes(st.session_state.mapped_df)
        st.download_button(
            label="⬇ Download mapped dataset (before validation)",
            data=mapped_bytes,
            file_name=st.session_state.source_name.replace(".xlsx", "") + "_mapped.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    # ----------------------------------------------------------------
    # Tab 3: Comparison — OLD vs NEW validation results
    # ----------------------------------------------------------------
    with tab_compare:
        st.markdown("### Stage 2: OLD rules vs NEW rules")
        st.caption(
            "Both rule sets ran against the same **mapped** dataset. "
            "The tables show validation outcome columns next to worker identity."
        )

        filt = st.radio(
            "Show",
            options=[
                "All rows",
                "Rows where results differ",
                "Rows passing OLD but failing NEW",
                "Rows failing OLD but passing NEW",
                "Failing in either",
            ],
            horizontal=True,
            key="compare_filter",
        )

        old_df = st.session_state.old_result.copy()
        new_df = st.session_state.new_result.copy()

        candidate_id_cols = ["Employee ID", "First Name", "Last Name", "Country"]
        id_cols = [c for c in candidate_id_cols if c in old_df.columns]
        if not id_cols:
            id_cols = list(old_df.columns[:3])

        differs        = (old_df["_is_valid"] != new_df["_is_valid"]) | (old_df["_errors"].astype(str) != new_df["_errors"].astype(str))
        old_ok_new_bad = old_df["_is_valid"] & ~new_df["_is_valid"]
        old_bad_new_ok = ~old_df["_is_valid"] & new_df["_is_valid"]
        fail_either    = ~old_df["_is_valid"] | ~new_df["_is_valid"]

        if filt == "Rows where results differ":
            mask = differs
        elif filt == "Rows passing OLD but failing NEW":
            mask = old_ok_new_bad
        elif filt == "Rows failing OLD but passing NEW":
            mask = old_bad_new_ok
        elif filt == "Failing in either":
            mask = fail_either
        else:
            mask = pd.Series([True] * len(old_df), index=old_df.index)

        st.caption(f"{int(mask.sum()):,} row(s) match this filter.")

        left_col, right_col = st.columns(2)
        old_view = old_df.loc[mask, id_cols + ["_is_valid", "_errors"]].rename(
            columns={"_is_valid": "Valid (OLD)", "_errors": "Errors (OLD)"}
        )
        new_view = new_df.loc[mask, id_cols + ["_is_valid", "_errors"]].rename(
            columns={"_is_valid": "Valid (NEW)", "_errors": "Errors (NEW)"}
        )

        with left_col:
            st.markdown(f"**OLD rules** — {old_s['rows_passing']}/{old_s['total_rows']} passing")
            st.dataframe(old_view, use_container_width=True, hide_index=False, height=460)
        with right_col:
            st.markdown(f"**NEW rules** — {new_s['rows_passing']}/{new_s['total_rows']} passing")
            st.dataframe(new_view, use_container_width=True, hide_index=False, height=460)

        st.markdown("---")
        st.markdown("#### Net difference")
        d1, d2, d3 = st.columns(3)
        with d1:
            st.metric("Newly caught by NEW", f"{int(old_ok_new_bad.sum()):,}",
                      help="Rows that passed OLD but fail NEW — the new rules' value-add.")
        with d2:
            st.metric("Newly cleared by NEW", f"{int(old_bad_new_ok.sum()):,}",
                      help="Rows that failed OLD but pass NEW — often because NEW transformations cleaned them up.")
        with d3:
            st.metric("Different result in either direction", f"{int(differs.sum()):,}")

    # ----------------------------------------------------------------
    # Tab 4: Dashboard
    # ----------------------------------------------------------------
    with tab_dashboard:
        st.markdown("### Validated dataset")
        st.caption("Read-only view of the full validated dataset. Toggle between rule sets.")

        btn_left, btn_right, _ = st.columns([1, 1, 4])
        with btn_left:
            old_type = "primary" if st.session_state.view == "old" else "secondary"
            if st.button("Old Dataset", type=old_type, use_container_width=True):
                st.session_state.view = "old"
                st.rerun()
        with btn_right:
            new_type = "primary" if st.session_state.view == "new" else "secondary"
            if st.button("New Dataset", type=new_type, use_container_width=True):
                st.session_state.view = "new"
                st.rerun()

        if st.session_state.view == "old":
            active_df = st.session_state.old_result
            active_summary = old_s
            view_label = "OLD rules"
        else:
            active_df = st.session_state.new_result
            active_summary = new_s
            view_label = "NEW rules"

        st.caption(
            f"Showing dataset validated against **{view_label}** — "
            f"{active_summary['rows_passing']:,} passing, "
            f"{active_summary['rows_failing']:,} failing, "
            f"{active_summary['rows_with_warnings']:,} with soft warnings."
        )

        filter_choice = st.radio(
            "Filter",
            options=["All rows", "Failing only", "With any flag (incl. warnings)"],
            horizontal=True,
            key=f"filter_{st.session_state.view}",
        )
        if filter_choice == "Failing only":
            display_df = active_df[~active_df["_is_valid"]]
        elif filter_choice == "With any flag (incl. warnings)":
            display_df = active_df[active_df["_errors"] != ""]
        else:
            display_df = active_df

        st.dataframe(display_df, use_container_width=True, hide_index=True, height=460)
        st.caption(f"{len(display_df):,} row(s) shown.")

    # ----------------------------------------------------------------
    # Tab 5: Log
    # ----------------------------------------------------------------
    with tab_log:
        st.markdown("### Run log")
        log_text = "\n".join(st.session_state.log_lines)
        st.code(log_text, language="text")
        st.download_button(
            label="⬇ Download log (.txt)",
            data=log_text,
            file_name=f"validation_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            mime="text/plain",
        )
