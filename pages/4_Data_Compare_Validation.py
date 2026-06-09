"""
Data Compare Validation feature.

Two uploads: an expected (loaded) dataset and an actual (Workday report) dataset
that share the same column headers. The user picks a key column to match rows on.
Reports missing rows, extra rows, and field-level mismatches.

This is the fidelity check in the Workday migration flow: confirm that what
landed in Workday matches what was intended, without manually loading into
Workday's EIB template first.
"""
import io
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from compare_engine import compare_datasets
from validation_engine import load_dataset


st.set_page_config(page_title="Data Compare Validation - HCM Data Validator", layout="wide")


def _init():
    defaults = {
        "cmp_processed": False,
        "cmp_results": None,
        "cmp_summary": None,
        "cmp_log": [],
        "cmp_expected_df": None,
        "cmp_actual_df": None,
        "cmp_expected_name": "",
        "cmp_actual_name": "",
        "cmp_key": None,
    }
    for k, v in defaults.items():
        st.session_state.setdefault(k, v)

_init()


@st.cache_data
def _report_excel(results, summary):
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        pd.DataFrame([{
            "Expected rows": summary["expected_rows"],
            "Actual rows": summary["actual_rows"],
            "Matched keys": summary["matched_keys"],
            "Missing rows": summary["missing_rows"],
            "Extra rows": summary["extra_rows"],
            "Rows with field mismatch": summary["rows_with_mismatch"],
            "Field mismatch count": summary["field_mismatch_count"],
            "Match %": summary["match_pct"],
            "Columns compared": summary["columns_compared"],
            "Columns only in expected": len(summary["only_in_expected"]),
            "Columns only in actual": len(summary["only_in_actual"]),
        }]).to_excel(w, index=False, sheet_name="Summary")

        # Column status sheet - aligned three-column layout
        max_len = max(
            len(summary["compare_columns"]),
            len(summary["only_in_expected"]),
            len(summary["only_in_actual"]),
            1,
        )
        def _pad(lst):
            return lst + [""] * (max_len - len(lst))
        pd.DataFrame({
            "Compared": _pad(list(summary["compare_columns"])),
            "Only in expected": _pad(list(summary["only_in_expected"])),
            "Only in actual": _pad(list(summary["only_in_actual"])),
        }).to_excel(w, index=False, sheet_name="Columns")

        results["missing_rows"].to_excel(w, index=False, sheet_name="Missing rows")
        results["extra_rows"].to_excel(w, index=False, sheet_name="Extra rows")
        results["field_mismatches"].to_excel(w, index=False, sheet_name="Field mismatches")
    return buf.getvalue()


def _reset():
    for k in ["cmp_processed", "cmp_results", "cmp_summary", "cmp_log",
              "cmp_expected_df", "cmp_actual_df", "cmp_expected_name",
              "cmp_actual_name", "cmp_key"]:
        if k == "cmp_processed":
            st.session_state[k] = False
        elif k == "cmp_log":
            st.session_state[k] = []
        elif "name" in k:
            st.session_state[k] = ""
        else:
            st.session_state[k] = None


# ---------- Header ----------
st.title("Data Compare Validation")
st.caption(
    "Compare two datasets that share the same columns, matching rows on a key "
    "column. Use this to verify that data loaded into the target system matches "
    "what was intended - for example, comparing a Workday report against the "
    "transformed extract that was loaded. This catches load errors before going "
    "live, without manually loading into the target system's template first."
)
st.divider()


# ---------- Upload ----------
if not st.session_state.cmp_processed:
    st.subheader("Upload the two datasets")

    col1, col2 = st.columns(2)
    with col1:
        expected_file = st.file_uploader(
            "Expected dataset - what was loaded (Excel)",
            type=["xlsx", "xls"],
            key="cmp_expected_upload",
            help="Typically the transformed extract you loaded into the target system.",
        )
    with col2:
        actual_file = st.file_uploader(
            "Actual dataset - report from target system (Excel)",
            type=["xlsx", "xls"],
            key="cmp_actual_upload",
            help="Typically a report pulled back out of Workday after loading.",
        )

    # Load both so we can offer a key-column picker from shared columns
    expected_df = actual_df = None
    shared_cols = []
    if expected_file is not None and actual_file is not None:
        try:
            expected_df = load_dataset(expected_file)
            actual_df = load_dataset(actual_file)
            shared_cols = [c for c in expected_df.columns if c in actual_df.columns]
            if not shared_cols:
                st.error(
                    "The two files share no common columns. Data Compare "
                    "Validation expects files with the same headers."
                )
        except Exception as e:
            st.error(f"Could not read a file: {type(e).__name__}: {e}")

    key_column = None
    if shared_cols:
        # Prefer an ID-like column as the default key
        default_idx = 0
        for i, c in enumerate(shared_cols):
            if "id" in c.lower():
                default_idx = i
                break
        key_column = st.selectbox(
            "Key column to match rows on",
            options=shared_cols,
            index=default_idx,
            help="Rows are matched between the two files using this column.",
        )

    can_run = expected_df is not None and actual_df is not None and key_column is not None
    if st.button("Run comparison", type="primary", disabled=not can_run):
        try:
            results, summary, log = compare_datasets(expected_df, actual_df, key_column)
            st.session_state.cmp_results = results
            st.session_state.cmp_summary = summary
            st.session_state.cmp_log = log
            st.session_state.cmp_expected_df = expected_df
            st.session_state.cmp_actual_df = actual_df
            st.session_state.cmp_expected_name = expected_file.name
            st.session_state.cmp_actual_name = actual_file.name
            st.session_state.cmp_key = key_column
            st.session_state.cmp_processed = True
            st.rerun()
        except Exception as e:
            st.error(f"Comparison failed: {type(e).__name__}: {e}")

    if expected_file is None or actual_file is None:
        st.info("Upload both files to begin.")

# ---------- Results ----------
else:
    summary = st.session_state.cmp_summary
    results = st.session_state.cmp_results

    top_left, top_right = st.columns([3, 1])
    with top_left:
        st.subheader("Comparison result")
        st.caption(
            f"Expected: `{st.session_state.cmp_expected_name}`  vs  "
            f"Actual: `{st.session_state.cmp_actual_name}`  "
            f"(matched on `{st.session_state.cmp_key}`)"
        )
    with top_right:
        st.download_button(
            "Download comparison report",
            data=_report_excel(results, summary),
            file_name="data_compare_report.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True,
        )
        if st.button("Start over", use_container_width=True):
            _reset()
            st.rerun()

    # Headline metrics
    cols_ignored = len(summary["only_in_expected"]) + len(summary["only_in_actual"])
    m1, m2, m3, m4, m5 = st.columns(5)
    m1.metric("Match rate", f"{summary['match_pct']}%")
    m2.metric("Missing rows", summary["missing_rows"])
    m3.metric("Extra rows", summary["extra_rows"])
    m4.metric("Rows with mismatches", summary["rows_with_mismatch"])
    m5.metric(
        "Columns ignored",
        cols_ignored,
        help="Columns that appeared in only one of the two files and were not compared.",
    )

    st.divider()

    tab_columns, tab_missing, tab_extra, tab_mismatch, tab_dupes, tab_log = st.tabs([
        f"Columns ({summary['columns_compared']} matched / {cols_ignored} ignored)",
        f"Missing rows ({summary['missing_rows']})",
        f"Extra rows ({summary['extra_rows']})",
        f"Field mismatches ({summary['field_mismatch_count']})",
        f"Duplicate keys ({summary['duplicate_keys_expected'] + summary['duplicate_keys_actual']})",
        "Run log",
    ])

    with tab_columns:
        st.markdown(
            "Columns that appear in both files were compared. Columns that appear "
            "in only one file were ignored - this is the expected behaviour when "
            "the two reports have different column counts, but it should always "
            "be visible so the user can confirm what was and was not checked."
        )
        cc1, cc2, cc3 = st.columns(3)
        with cc1:
            st.markdown(f"**Compared ({len(summary['compare_columns'])})**")
            if summary["compare_columns"]:
                st.dataframe(
                    pd.DataFrame({"Column": summary["compare_columns"]}),
                    use_container_width=True,
                    hide_index=True,
                )
            else:
                st.info("No columns were compared.")
        with cc2:
            st.markdown(f"**Only in expected ({len(summary['only_in_expected'])})**")
            if summary["only_in_expected"]:
                st.dataframe(
                    pd.DataFrame({"Column": summary["only_in_expected"]}),
                    use_container_width=True,
                    hide_index=True,
                )
            else:
                st.success("None - every expected column was matched.")
        with cc3:
            st.markdown(f"**Only in actual ({len(summary['only_in_actual'])})**")
            if summary["only_in_actual"]:
                st.dataframe(
                    pd.DataFrame({"Column": summary["only_in_actual"]}),
                    use_container_width=True,
                    hide_index=True,
                )
            else:
                st.success("None - every actual column was matched.")

    with tab_missing:
        st.markdown(
            "Keys present in the **expected** (loaded) file but not found in the "
            "**actual** (target system) file. These records did not make it in."
        )
        if summary["missing_rows"] == 0:
            st.success("No missing rows.")
        else:
            st.dataframe(results["missing_rows"], use_container_width=True, hide_index=True)

    with tab_extra:
        st.markdown(
            "Keys present in the **actual** (target system) file but not in the "
            "**expected** (loaded) file. These are unexpected extras."
        )
        if summary["extra_rows"] == 0:
            st.success("No extra rows.")
        else:
            st.dataframe(results["extra_rows"], use_container_width=True, hide_index=True)

    with tab_mismatch:
        st.markdown(
            "Records that exist in both files but disagree on one or more fields. "
            "One row per differing field."
        )
        if summary["field_mismatch_count"] == 0:
            st.success("No field mismatches on matched rows.")
        else:
            st.dataframe(results["field_mismatches"], use_container_width=True, hide_index=True)

    with tab_dupes:
        any_dupes = summary["duplicate_keys_expected"] + summary["duplicate_keys_actual"]
        if any_dupes == 0:
            st.success("No duplicate keys in either file.")
        else:
            if summary["duplicate_keys_expected"]:
                st.markdown(f"**Duplicate keys in expected ({summary['duplicate_keys_expected']})**")
                st.dataframe(results["duplicate_keys_expected"], use_container_width=True, hide_index=True)
            if summary["duplicate_keys_actual"]:
                st.markdown(f"**Duplicate keys in actual ({summary['duplicate_keys_actual']})**")
                st.dataframe(results["duplicate_keys_actual"], use_container_width=True, hide_index=True)

    with tab_log:
        log_text = "\n".join(st.session_state.cmp_log)
        st.code(log_text or "(no log lines)", language="text")
        st.download_button(
            "Download log (.txt)",
            data=log_text.encode("utf-8"),
            file_name="data_compare_log.txt",
            mime="text/plain",
        )
