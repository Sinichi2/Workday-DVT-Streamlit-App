"""
HCM Data Validation Tool - Streamlit MVP

Flow:
  1. Upload HCM dataset, OLD validation rules, NEW validation rules
  2. Click Process
  3. See summary metrics, switch between Old/New dashboard view, view log
  4. Download the validated NEW dataset
"""
import io
from datetime import datetime

import pandas as pd
import streamlit as st

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
        "processed":      False,
        "old_result":     None,   # validated DataFrame against OLD rules
        "new_result":     None,   # validated DataFrame against NEW rules
        "old_summary":    None,
        "new_summary":    None,
        "log_lines":      [],
        "view":           "new",  # which dataset to show in the dashboard
        "source_name":    "",
        "old_rules_name": "",
        "new_rules_name": "",
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

_init_state()


# ---------- Header ----------
st.title("📋 HCM Data Validator")
st.caption(
    "Upload an HCM dataset and two rule sets. The tool runs both, lets you compare "
    "the results, and exports the validated dataset."
)
st.divider()


# ---------- Upload step ----------
if not st.session_state.processed:
    st.subheader("Step 1 — Upload files")
    st.write(
        "All three files must be `.xlsx`. Use the v2 sample data and rule files "
        "from the prototype if you don't have your own yet."
    )

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("**1. HCM Dataset**")
        st.caption("Employee data to validate")
        hcm_file = st.file_uploader(
            "Upload HCM dataset",
            type=["xlsx"],
            key="hcm_upload",
            label_visibility="collapsed",
        )

    with col2:
        st.markdown("**2. Old Validation Rules**")
        st.caption("The current rule set")
        old_rules_file = st.file_uploader(
            "Upload old rules",
            type=["xlsx"],
            key="old_rules_upload",
            label_visibility="collapsed",
        )

    with col3:
        st.markdown("**3. New Validation Rules**")
        st.caption("The updated rule set")
        new_rules_file = st.file_uploader(
            "Upload new rules",
            type=["xlsx"],
            key="new_rules_upload",
            label_visibility="collapsed",
        )

    st.write("")  # spacer

    all_uploaded = (hcm_file is not None) and (old_rules_file is not None) and (new_rules_file is not None)

    if not all_uploaded:
        st.info("Upload all three files to enable processing.")

    process_clicked = st.button(
        "▶ Process",
        type="primary",
        disabled=not all_uploaded,
        use_container_width=False,
    )

    if process_clicked and all_uploaded:
        with st.spinner("Running validations..."):
            log = []
            log.append(f"Run started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            log.append(f"HCM dataset:    {hcm_file.name} ({hcm_file.size:,} bytes)")
            log.append(f"Old rules file: {old_rules_file.name} ({old_rules_file.size:,} bytes)")
            log.append(f"New rules file: {new_rules_file.name} ({new_rules_file.size:,} bytes)")
            log.append("")

            try:
                df         = load_dataset(hcm_file)
                rules_old  = load_rules(old_rules_file)
                rules_new  = load_rules(new_rules_file)

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

                st.session_state.old_result     = old_result
                st.session_state.new_result     = new_result
                st.session_state.old_summary    = old_summary
                st.session_state.new_summary    = new_summary
                st.session_state.log_lines      = log
                st.session_state.source_name    = hcm_file.name
                st.session_state.old_rules_name = old_rules_file.name
                st.session_state.new_rules_name = new_rules_file.name
                st.session_state.processed      = True
                st.session_state.view           = "new"
                st.rerun()

            except Exception as e:
                st.error(f"Processing failed: {e}")
                st.exception(e)


# ---------- Results ----------
else:
    # Top action row
    left, right = st.columns([3, 1])
    with left:
        st.subheader("Step 2 — Results")
        st.caption(
            f"Source: `{st.session_state.source_name}` · "
            f"Old rules: `{st.session_state.old_rules_name}` · "
            f"New rules: `{st.session_state.new_rules_name}`"
        )
    with right:
        if st.button("↺ Start over", use_container_width=True):
            for k in list(st.session_state.keys()):
                del st.session_state[k]
            st.rerun()

    st.divider()

    # ----- Summary cards (side-by-side comparison) -----
    st.markdown("### Summary")

    old_s = st.session_state.old_summary
    new_s = st.session_state.new_summary

    sa, sb, sc, sd = st.columns(4)
    with sa:
        st.metric(
            "Total rows",
            f"{new_s['total_rows']:,}",
        )
    with sb:
        delta = new_s["rows_passing"] - old_s["rows_passing"]
        st.metric(
            "Passing (NEW rules)",
            f"{new_s['rows_passing']:,}",
            delta=f"{delta:+d} vs OLD",
            delta_color="normal" if delta >= 0 else "inverse",
        )
    with sc:
        delta = new_s["rows_failing"] - old_s["rows_failing"]
        st.metric(
            "Failing (NEW rules)",
            f"{new_s['rows_failing']:,}",
            delta=f"{delta:+d} vs OLD",
            delta_color="inverse" if delta >= 0 else "normal",
        )
    with sd:
        st.metric(
            "Soft warnings (NEW)",
            f"{new_s['rows_with_warnings']:,}",
        )

    # Transformation + validation counts
    ca, cb = st.columns(2)
    with ca:
        st.markdown("**Transformations (NEW rules)**")
        tx_changes = new_s.get("transform_changes", {})
        if tx_changes:
            tx_df = pd.DataFrame(
                [{"Rule": rid, "Cells changed": n} for rid, n in tx_changes.items()]
            )
            st.dataframe(tx_df, use_container_width=True, hide_index=True)
        else:
            st.caption("No transformation rules in the NEW rule set.")

    with cb:
        st.markdown("**Validation hits (NEW rules)**")
        hits = new_s.get("validation_hits", {})
        rules_df = new_s.get("rules_df")
        if hits and rules_df is not None:
            hit_rows = []
            for rid, n in hits.items():
                if n == 0:
                    continue
                desc_row = rules_df[rules_df["rule_id"] == rid]
                desc = desc_row["description"].iloc[0] if len(desc_row) else ""
                sev  = desc_row["severity"].iloc[0]    if len(desc_row) else ""
                hit_rows.append({"Rule": rid, "Severity": sev, "Rows failed": n,
                                 "Description": desc})
            if hit_rows:
                hits_df = pd.DataFrame(hit_rows).sort_values("Rows failed", ascending=False)
                st.dataframe(hits_df, use_container_width=True, hide_index=True)
            else:
                st.success("All rows passed every validation.")
        else:
            st.caption("No validation rules in the NEW rule set.")

    st.divider()

    # ----- Dashboard view (toggle Old / New) -----
    st.markdown("### Dashboard")
    st.caption("Read-only view of the validated dataset. Toggle between the two rule sets.")

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

    # Filter options
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

    st.dataframe(
        display_df,
        use_container_width=True,
        hide_index=True,
        height=420,
    )
    st.caption(f"{len(display_df):,} row(s) shown.")

    st.divider()

    # ----- Download new validated dataset -----
    st.markdown("### Download")

    @st.cache_data
    def _to_excel_bytes(df: pd.DataFrame) -> bytes:
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Validated")
        return buf.getvalue()

    new_excel_bytes = _to_excel_bytes(st.session_state.new_result)
    download_name = (
        st.session_state.source_name.replace(".xlsx", "") + "_validated_new.xlsx"
    )

    st.download_button(
        label="⬇ Download validated dataset (NEW rules)",
        data=new_excel_bytes,
        file_name=download_name,
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        type="primary",
    )
    st.caption(
        "The downloaded file contains the source dataset plus two appended columns: "
        "`_errors` (semicolon-separated rule failures with severity) and "
        "`_is_valid` (True only if no Hard Stop rules failed)."
    )

    st.divider()

    # ----- Run log -----
    st.markdown("### Run Log")
    log_text = "\n".join(st.session_state.log_lines)

    with st.expander("View log", expanded=False):
        st.code(log_text, language="text")

    st.download_button(
        label="⬇ Download log (.txt)",
        data=log_text,
        file_name=f"validation_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
        mime="text/plain",
    )
