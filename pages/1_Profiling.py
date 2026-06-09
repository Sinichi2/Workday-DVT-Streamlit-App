"""
Profiling feature.

One upload: any dataset. Produces an overview, per-column profile, and an
issue list. Runs independently of the other stages.
"""
import io
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from profiling_engine import profile_dataset
from validation_engine import load_dataset


st.set_page_config(page_title="Profiling - HCM Data Validator", layout="wide")


def _init():
    defaults = {
        "prof_processed": False,
        "prof_overview": None,
        "prof_per_column": None,
        "prof_issues": None,
        "prof_log": [],
        "prof_file_name": "",
        "prof_df": None,  # the original dataset, needed to look up affected rows
    }
    for k, v in defaults.items():
        st.session_state.setdefault(k, v)

_init()


@st.cache_data
def _profile_report_excel(per_column_df, issues_df, overview):
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        pd.DataFrame([overview]).to_excel(w, index=False, sheet_name="Overview")
        per_column_df.to_excel(w, index=False, sheet_name="Per-column profile")
        issues_df.to_excel(w, index=False, sheet_name="Issues")
    return buf.getvalue()


# ---------- Header ----------
st.title("Profiling")
st.caption(
    "Assess the quality of a dataset before any changes are applied. "
    "Useful as a standalone deliverable when a client wants to understand the "
    "state of their data before committing to a transformation project."
)
st.divider()


# ---------- Upload ----------
if not st.session_state.prof_processed:
    st.subheader("Upload a dataset")
    uploaded = st.file_uploader(
        "Dataset (Excel)",
        type=["xlsx", "xls"],
        key="prof_upload",
        help="Any tabular dataset. Profiling does not modify the data.",
    )

    if uploaded is not None:
        if st.button("Run profile", type="primary"):
            try:
                df = load_dataset(uploaded)
                overview, per_column, issues, log = profile_dataset(df)
                st.session_state.prof_df = df
                st.session_state.prof_overview = overview
                st.session_state.prof_per_column = per_column
                st.session_state.prof_issues = issues
                st.session_state.prof_log = log
                st.session_state.prof_file_name = uploaded.name
                st.session_state.prof_processed = True
                st.rerun()
            except Exception as e:
                st.error(f"Profiling failed: {type(e).__name__}: {e}")
    else:
        st.info("Upload a dataset to begin.")

# ---------- Results ----------
else:
    overview = st.session_state.prof_overview
    per_column = st.session_state.prof_per_column
    issues = st.session_state.prof_issues
    source_df = st.session_state.prof_df

    top_left, top_right = st.columns([3, 1])
    with top_left:
        st.subheader(f"Profile of `{st.session_state.prof_file_name}`")
    with top_right:
        report_bytes = _profile_report_excel(per_column, issues, overview)
        out_name = st.session_state.prof_file_name.rsplit(".", 1)[0] + "_profile.xlsx"
        st.download_button(
            "Download profile report",
            data=report_bytes,
            file_name=out_name,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True,
        )
        if st.button("Start over", use_container_width=True):
            for k in ["prof_processed", "prof_overview", "prof_per_column",
                      "prof_issues", "prof_log", "prof_file_name", "prof_df"]:
                st.session_state[k] = False if k == "prof_processed" else (None if "df" in k or "overview" in k else "" if "name" in k else [])
            st.rerun()

    # Overview metrics
    st.markdown("#### Overview")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Rows", overview["total_rows"])
    m2.metric("Columns", overview["total_columns"])
    m3.metric("Blank cells", f"{overview['blank_cells']} ({overview['overall_missing_pct']}%)")
    m4.metric("Duplicate rows", overview["duplicate_rows"])

    st.divider()

    tab_columns, tab_issues, tab_log = st.tabs([
        "Per-column profile",
        f"Issues ({len(issues)})",
        "Run log",
    ])

    with tab_columns:
        st.markdown(
            "One row per column. Type is inferred by sniffing the values. "
            "Distinct % is computed against non-blank values."
        )
        st.dataframe(per_column, use_container_width=True, hide_index=True)

    with tab_issues:
        if len(issues) == 0:
            st.success("No anomalies flagged.")
        else:
            st.markdown(
                "Anomalies are grouped by severity. Expand any issue to see the "
                "actual rows from the dataset that triggered it."
            )

            # Pull the parallel row-indices list and sort everything together
            row_idx_lists = issues.attrs.get("row_indices_by_issue", [[]] * len(issues))
            severity_order = {"High": 0, "Medium": 1, "Low": 2}

            paired = list(zip(issues.to_dict("records"), row_idx_lists))
            paired.sort(key=lambda p: (severity_order.get(p[0]["Severity"], 99), p[0]["Column"]))

            # Compact summary table at the top
            summary_rows = []
            for iss, idx_list in paired:
                summary_rows.append({
                    "Severity": iss["Severity"],
                    "Column": iss["Column"],
                    "Issue": iss["Issue"],
                    "Affected rows": len(idx_list),
                    "Detail": iss["Detail"],
                })
            st.dataframe(
                pd.DataFrame(summary_rows),
                use_container_width=True,
                hide_index=True,
            )

            st.divider()
            st.markdown("**Drill into individual issues**")

            for i, (iss, idx_list) in enumerate(paired):
                header = (
                    f"[{iss['Severity']}] {iss['Column']} - {iss['Issue']} "
                    f"({len(idx_list)} row{'s' if len(idx_list) != 1 else ''})"
                )
                with st.expander(header):
                    st.caption(iss["Detail"])
                    if not idx_list:
                        st.info(
                            "This issue describes a column-level property "
                            "(no specific rows to display)."
                        )
                    else:
                        # Show the affected rows from the source dataset.
                        # For column-targeted issues, put the offending column first
                        # so the user sees the problem value immediately.
                        affected = source_df.loc[idx_list].copy()
                        target_col = iss["Column"]
                        if target_col in affected.columns:
                            cols = [target_col] + [c for c in affected.columns if c != target_col]
                            affected = affected[cols]
                        st.dataframe(
                            affected,
                            use_container_width=True,
                            hide_index=False,  # show the original row index
                        )

    with tab_log:
        log_text = "\n".join(st.session_state.prof_log)
        st.code(log_text or "(no log lines)", language="text")
        st.download_button(
            "Download log (.txt)",
            data=log_text.encode("utf-8"),
            file_name=st.session_state.prof_file_name.rsplit(".", 1)[0] + "_profile_log.txt",
            mime="text/plain",
        )
