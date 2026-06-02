"""
Validation feature.

Two uploads: dataset + validation rules. Applies the rules and flags failures.
Self-contained. State stored under "val_" keys.
"""
import io
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from validation_engine import apply_rules, load_dataset, load_rules


st.set_page_config(page_title="System Validation - HCM Data Validator", layout="wide")


def _init():
    defaults = {
        "val_processed": False,
        "val_validated_df": None,
        "val_summary": None,
        "val_log": [],
        "val_dataset_name": "",
        "val_rules_name": "",
        "val_filter": "All rows",
    }
    for k, v in defaults.items():
        st.session_state.setdefault(k, v)

_init()


@st.cache_data
def _to_excel_bytes(df):
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
            "Rule": rid,
            "Field": desc_row["field"].iloc[0] if len(desc_row) else "",
            "Severity": desc_row["severity"].iloc[0] if len(desc_row) else "",
            "Rows failed": n,
            "Description": desc_row["description"].iloc[0] if len(desc_row) else "",
        })
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows).sort_values("Rows failed", ascending=False)


def _transforms_df(summary):
    changes = summary.get("transform_changes", {})
    rules_df = summary.get("rules_df")
    if not changes or rules_df is None:
        return pd.DataFrame()
    rows = []
    for rid, n in changes.items():
        desc_row = rules_df[rules_df["rule_id"] == rid]
        rows.append({
            "Rule": rid,
            "Field": desc_row["field"].iloc[0] if len(desc_row) else "",
            "Operation": desc_row["operation"].iloc[0] if len(desc_row) else "",
            "Cells changed": n,
        })
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows).sort_values("Cells changed", ascending=False)


# ---------- Header ----------
st.title("System Validation")
st.caption(
    "Apply the target system's business rules to a dataset and flag every row "
    "that fails. This is the rule-based check (required fields, formats, "
    "uniqueness, cross-field logic). The dataset is expected to be in target "
    "shape already - run Transformation first if you have raw source data."
)
st.divider()


# ---------- Bundled rules ----------
# Path to the bundled Workday HCM rules. Shipped with the app so clients don't
# have to discover, edit, and upload a rules file just to get going. Users can
# still upload their own to override or layer on top.
BUNDLED_RULES_PATH = Path(__file__).resolve().parent.parent / "samples" / "workday_validation_rules.xlsx"


# ---------- Upload ----------
if not st.session_state.val_processed:
    st.subheader("Upload dataset and choose rules")

    dataset_file = st.file_uploader(
        "Dataset (Excel)",
        type=["xlsx", "xls"],
        key="val_dataset_upload",
        help="Dataset to validate, typically the output of the Transformation stage.",
    )

    st.markdown("**Validation rules**")
    rules_source = st.radio(
        "Where should the rules come from?",
        options=[
            "Use bundled Workday HCM rules",
            "Upload my own rules",
        ],
        index=0,
        key="val_rules_source",
        help=(
            "The bundled rules cover the Workday HCM workstream (required fields, "
            "uniqueness, format, cross-field, severity). Upload your own to replace "
            "the bundled set, or use the layered option below to add to it."
        ),
    )

    user_rules_file = None
    layer_file = None
    if rules_source == "Use bundled Workday HCM rules":
        if BUNDLED_RULES_PATH.exists():
            st.caption(f"Bundled rules: `{BUNDLED_RULES_PATH.name}` (loaded at runtime).")
        else:
            st.error(
                f"Bundled rules file not found at {BUNDLED_RULES_PATH}. "
                "Switch to 'Upload my own rules' or restore the file."
            )
        layer_file = st.file_uploader(
            "Optionally layer additional rules on top (Excel)",
            type=["xlsx", "xls"],
            key="val_rules_layer_upload",
            help=(
                "Rows in this file are appended to the bundled rule set. Use the same "
                "schema as the bundled rules: rule_id, rule_type, field, operation, "
                "parameter, severity, category, description."
            ),
        )
    else:
        user_rules_file = st.file_uploader(
            "Validation rules (Excel)",
            type=["xlsx", "xls"],
            key="val_rules_upload",
            help="Rules workbook with one row per rule.",
        )

    # Determine if we can run
    has_rules = (
        (rules_source == "Use bundled Workday HCM rules" and BUNDLED_RULES_PATH.exists())
        or (rules_source == "Upload my own rules" and user_rules_file is not None)
    )
    can_run = dataset_file is not None and has_rules

    if st.button("Run validation", type="primary", disabled=not can_run):
        try:
            df = load_dataset(dataset_file)

            # Build the rules DataFrame depending on the source
            if rules_source == "Use bundled Workday HCM rules":
                rules_df = load_rules(BUNDLED_RULES_PATH)
                rules_label = f"bundled: {BUNDLED_RULES_PATH.name}"
                if layer_file is not None:
                    extra_rules = load_rules(layer_file)
                    rules_df = pd.concat([rules_df, extra_rules], ignore_index=True)
                    rules_label += f" + layered: {layer_file.name}"
            else:
                rules_df = load_rules(user_rules_file)
                rules_label = user_rules_file.name

            validated, summary, log = apply_rules(df, rules_df)

            st.session_state.val_validated_df = validated
            st.session_state.val_summary = summary
            st.session_state.val_log = log
            st.session_state.val_dataset_name = dataset_file.name
            st.session_state.val_rules_name = rules_label
            st.session_state.val_processed = True
            st.rerun()
        except Exception as e:
            st.error(f"Validation failed: {type(e).__name__}: {e}")

    if not can_run:
        st.info(
            "Upload a dataset (and a rules file if you chose 'Upload my own rules') "
            "to begin."
        )

# ---------- Results ----------
else:
    summary = st.session_state.val_summary
    validated = st.session_state.val_validated_df

    top_left, top_right = st.columns([3, 1])
    with top_left:
        st.subheader("System Validation result")
        st.caption(
            f"Dataset: `{st.session_state.val_dataset_name}` "
            f"using rules `{st.session_state.val_rules_name}`"
        )
    with top_right:
        out_name = st.session_state.val_dataset_name.rsplit(".", 1)[0] + "_validated.xlsx"
        st.download_button(
            "Download validated dataset",
            data=_to_excel_bytes(validated),
            file_name=out_name,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True,
        )
        if st.button("Start over", use_container_width=True):
            for k in ["val_processed", "val_validated_df", "val_summary",
                      "val_log", "val_dataset_name", "val_rules_name", "val_filter"]:
                if k == "val_processed":
                    st.session_state[k] = False
                elif k == "val_filter":
                    st.session_state[k] = "All rows"
                elif "df" in k or "summary" in k:
                    st.session_state[k] = None
                elif "name" in k:
                    st.session_state[k] = ""
                else:
                    st.session_state[k] = []
            st.rerun()

    # Headline metrics
    total = summary["total_rows"]
    passing = summary["rows_passing"]
    failing = summary["rows_failing"]
    warnings = summary["rows_with_warnings"]

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Total rows", total)
    m2.metric("Passing", passing)
    m3.metric("Failing (Hard Stop)", failing)
    m4.metric("Rows with warnings", warnings)

    st.divider()

    tab_summary, tab_data, tab_log = st.tabs([
        "Rule summary",
        "Dataset view",
        "Run log",
    ])

    with tab_summary:
        col_left, col_right = st.columns(2)
        with col_left:
            st.markdown(f"**Transformations ({summary['transformations_run']})**")
            t_df = _transforms_df(summary)
            if t_df.empty:
                st.info("No transformation rules in this rule set.")
            else:
                st.dataframe(t_df, use_container_width=True, hide_index=True)

        with col_right:
            st.markdown(f"**Validations ({summary['validations_run']})**")
            h_df = _hits_df(summary)
            if h_df.empty:
                st.success("No validation failures.")
            else:
                st.dataframe(h_df, use_container_width=True, hide_index=True)

        if summary.get("not_implemented"):
            st.warning(
                f"{summary['not_implemented']} rule(s) in the spec are documented "
                "but not implemented by the engine. See the Run log tab."
            )

    with tab_data:
        filter_choice = st.radio(
            "Filter",
            options=["All rows", "Failing only (Hard Stop)", "Any flag (Hard Stop or Soft Warning)"],
            horizontal=True,
            key="val_filter",
        )

        if filter_choice == "All rows":
            view = validated
        elif filter_choice == "Failing only (Hard Stop)":
            view = validated[~validated["_is_valid"]]
        else:
            view = validated[validated["_errors"] != ""]

        st.caption(f"Showing {len(view)} of {len(validated)} rows.")
        st.dataframe(view, use_container_width=True, hide_index=True)

    with tab_log:
        log_text = "\n".join(st.session_state.val_log)
        st.code(log_text or "(no log lines)", language="text")
        st.download_button(
            "Download log (.txt)",
            data=log_text.encode("utf-8"),
            file_name=st.session_state.val_dataset_name.rsplit(".", 1)[0] + "_validation_log.txt",
            mime="text/plain",
        )
