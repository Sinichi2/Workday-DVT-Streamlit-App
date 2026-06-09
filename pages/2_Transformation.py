"""
Transformation feature.

Two uploads: source dataset + mapping file. Produces a target-shaped dataset.
Self-contained. State stored under "trans_" keys.
"""
import io
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from mapping_engine import apply_mapping, load_mapping_file
from profiling_engine import profile_dataset
from validation_engine import load_dataset


st.set_page_config(page_title="Transformation - HCM Data Validator", layout="wide")


def _init():
    defaults = {
        "trans_processed": False,
        "trans_source_df": None,
        "trans_target_df": None,
        "trans_mappings_df": None,
        "trans_crosswalks": None,
        "trans_summary": None,
        "trans_log": [],
        "trans_source_name": "",
        "trans_mapping_name": "",
        "trans_profile": None,  # populated when user clicks "Profile transformed data"
    }
    for k, v in defaults.items():
        st.session_state.setdefault(k, v)

_init()


@st.cache_data
def _to_excel_bytes(df):
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        df.to_excel(w, index=False, sheet_name="Transformed")
    return buf.getvalue()


# ---------- Header ----------
st.title("Transformation")
st.caption(
    "Convert a source dataset into target shape using a mapping file. "
    "The mapping file lists every target field, where its value comes from, "
    "and what operation to apply along the way (rename, date reformat, "
    "crosswalk lookup, and so on)."
)
st.divider()


# ---------- Upload ----------
if not st.session_state.trans_processed:
    st.subheader("Upload source and mapping")

    col1, col2 = st.columns(2)
    with col1:
        source_file = st.file_uploader(
            "Source dataset (Excel)",
            type=["xlsx", "xls"],
            key="trans_source_upload",
            help="The legacy-format dataset, for example an Oracle HCM export.",
        )
    with col2:
        mapping_file = st.file_uploader(
            "Mapping file (Excel)",
            type=["xlsx", "xls"],
            key="trans_mapping_upload",
            help="Workbook with 'mappings' and optional 'crosswalks' sheets.",
        )

    can_run = source_file is not None and mapping_file is not None
    if st.button("Run transformation", type="primary", disabled=not can_run):
        try:
            src_df = load_dataset(source_file)
            mappings_df, crosswalks = load_mapping_file(mapping_file)
            target_df, summary, log = apply_mapping(src_df, mappings_df, crosswalks)

            st.session_state.trans_source_df = src_df
            st.session_state.trans_target_df = target_df
            st.session_state.trans_mappings_df = mappings_df
            st.session_state.trans_crosswalks = crosswalks
            st.session_state.trans_summary = summary
            st.session_state.trans_log = log
            st.session_state.trans_source_name = source_file.name
            st.session_state.trans_mapping_name = mapping_file.name
            st.session_state.trans_processed = True
            st.rerun()
        except Exception as e:
            st.error(f"Transformation failed: {type(e).__name__}: {e}")

    if not can_run:
        st.info("Upload both files to begin.")

# ---------- Results ----------
else:
    summary = st.session_state.trans_summary
    src_df = st.session_state.trans_source_df
    tgt_df = st.session_state.trans_target_df

    top_left, top_right = st.columns([3, 1])
    with top_left:
        st.subheader("Transformation result")
        st.caption(
            f"Source: `{st.session_state.trans_source_name}` "
            f"using mapping `{st.session_state.trans_mapping_name}`"
        )
    with top_right:
        out_name = st.session_state.trans_source_name.rsplit(".", 1)[0] + "_transformed.xlsx"
        st.download_button(
            "Download transformed dataset",
            data=_to_excel_bytes(tgt_df),
            file_name=out_name,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True,
        )
        if st.button("Start over", use_container_width=True):
            for k in ["trans_processed", "trans_source_df", "trans_target_df",
                      "trans_mappings_df", "trans_crosswalks", "trans_summary",
                      "trans_log", "trans_source_name", "trans_mapping_name",
                      "trans_profile"]:
                st.session_state[k] = False if k == "trans_processed" else (None if "df" in k or "summary" in k or "crosswalks" in k or "profile" in k else "" if "name" in k else [])
            st.rerun()

    # Overview metrics
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Source rows", summary["source_rows"])
    m2.metric("Source columns", summary["source_columns"])
    m3.metric("Target columns", summary["target_columns"])
    m4.metric("Crosswalks", summary["crosswalks_loaded"])

    st.divider()

    tab_details, tab_preview, tab_profile, tab_log = st.tabs([
        "Per-field details",
        "Source vs target preview",
        "Profile transformed data",
        "Run log",
    ])

    with tab_details:
        st.markdown(
            f"{summary['rules_applied']} of {summary['rules_total']} rules applied "
            "successfully. Rows with a non-OK status indicate that the source "
            "field was missing or the transformation could not be applied."
        )
        st.dataframe(
            summary["per_field_details"],
            use_container_width=True,
            hide_index=True,
        )

    with tab_preview:
        st.markdown("First 50 rows of each. Scroll horizontally to see all columns.")
        col_left, col_right = st.columns(2)
        with col_left:
            st.markdown("**Source dataset**")
            st.dataframe(src_df.head(50), use_container_width=True, hide_index=True)
        with col_right:
            st.markdown("**Transformed dataset**")
            st.dataframe(tgt_df.head(50), use_container_width=True, hide_index=True)

    with tab_profile:
        st.markdown(
            "Run a quick data-quality profile on the transformed dataset without "
            "leaving this page. Useful for spotting issues introduced (or surfaced) "
            "by the transformation - for example, a crosswalk that produced unexpected blanks."
        )

        col_btn, col_clear = st.columns([1, 4])
        with col_btn:
            if st.button("Run profile now", type="primary"):
                overview, per_col, issues, _ = profile_dataset(tgt_df)
                st.session_state.trans_profile = {
                    "overview": overview,
                    "per_column": per_col,
                    "issues": issues,
                }
                st.rerun()

        if st.session_state.trans_profile is None:
            st.info("Click the button to profile the transformed dataset.")
        else:
            prof = st.session_state.trans_profile
            ov = prof["overview"]
            p1, p2, p3, p4 = st.columns(4)
            p1.metric("Rows", ov["total_rows"])
            p2.metric("Columns", ov["total_columns"])
            p3.metric(
                "Blank cells",
                f"{ov['blank_cells']} ({ov['overall_missing_pct']}%)",
            )
            p4.metric("Duplicate rows", ov["duplicate_rows"])

            sub_cols, sub_issues = st.tabs([
                "Per-column profile",
                f"Issues ({len(prof['issues'])})",
            ])
            with sub_cols:
                st.dataframe(prof["per_column"], use_container_width=True, hide_index=True)
            with sub_issues:
                if len(prof["issues"]) == 0:
                    st.success("No anomalies flagged on the transformed dataset.")
                else:
                    severity_order = {"High": 0, "Medium": 1, "Low": 2}
                    issues_sorted = prof["issues"].assign(
                        _ord=prof["issues"]["Severity"].map(severity_order).fillna(99)
                    ).sort_values(["_ord", "Column"]).drop(columns="_ord")
                    st.dataframe(issues_sorted, use_container_width=True, hide_index=True)

    with tab_log:
        log_text = "\n".join(st.session_state.trans_log)
        st.code(log_text or "(no log lines)", language="text")
        st.download_button(
            "Download log (.txt)",
            data=log_text.encode("utf-8"),
            file_name=st.session_state.trans_source_name.rsplit(".", 1)[0] + "_transformation_log.txt",
            mime="text/plain",
        )
