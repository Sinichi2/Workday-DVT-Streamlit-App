"""
HCM Data Validator - Landing page.

Each feature is a separate page under pages/. Streamlit auto-discovers them.
"""
import streamlit as st

st.set_page_config(
    page_title="HCM Data Validator",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("HCM Data Validator")
st.markdown(
    "A toolkit for HR data teams preparing legacy data for Workday. "
    "The workflow has three core stages plus a dashboard for browsing results. "
    "Each stage runs independently - pick a stage from the sidebar."
)

st.divider()

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.subheader("1. Profiling")
    st.markdown(
        "Assess the quality of a raw dataset before any changes are applied. "
        "Identifies nulls, duplicates, format anomalies, and per-column statistics."
    )
    st.caption("**Input:** Any dataset")
    st.caption("**Output:** Per-column profile and issue list")
    if st.button("Open Profiling", use_container_width=True, key="open_profiling"):
        st.switch_page("pages/1_Profiling.py")

with col2:
    st.subheader("2. Transformation")
    st.markdown(
        "Convert a source dataset (for example, an Oracle HCM export) into the "
        "shape required by the target system using a mapping file."
    )
    st.caption("**Inputs:** Source dataset, mapping file")
    st.caption("**Output:** Target-shaped dataset")
    if st.button("Open Transformation", use_container_width=True, key="open_transformation"):
        st.switch_page("pages/2_Transformation.py")

with col3:
    st.subheader("3. Validation")
    st.markdown(
        "Apply business rules to a dataset and flag every row that fails. "
        "Typically run against the output of the Transformation stage."
    )
    st.caption("**Inputs:** Dataset, validation rules")
    st.caption("**Output:** Validated dataset with errors and pass/fail flags")
    if st.button("Open Validation", use_container_width=True, key="open_validation"):
        st.switch_page("pages/3_Validation.py")

with col4:
    st.subheader("4. Dashboard")
    st.markdown(
        "Browse a validated dataset by Country, Worker Type, severity, and "
        "failure reason. Use this after running Validation."
    )
    st.caption("**Input:** A validated dataset")
    st.caption("**Output:** Statistics by category")
    if st.button("Open Dashboard", use_container_width=True, key="open_dashboard"):
        st.switch_page("pages/4_Dashboard.py")

st.divider()

with st.expander("How the stages relate to each other"):
    st.markdown(
        """
        The three core stages follow a strict dependency chain, but each one
        can be run on its own depending on what the client needs:

        - **Profiling** can run alone on any dataset - clients often request this
          as a standalone deliverable to assess data quality before committing
          to a migration.
        - **Transformation** logically requires that the source data has been
          assessed first, even if that assessment is informal.
        - **Validation** runs against the transformed (target-shaped) dataset.
          Running validation without transformation is essentially profiling.

        The **Dashboard** is a separate browsing layer over an already-validated
        dataset.
        """
    )

with st.expander("Sample files for demos"):
    st.markdown(
        """
        Sample input files for each stage are in the `samples/` folder of the
        repository:

        - `oracle_hcm_source.xlsx` - Oracle-shaped source dataset (50 employees)
        - `oracle_to_workday_mapping.xlsx` - Mapping file with crosswalks
        - `workday_hcm_dataset.xlsx` - Already-transformed Workday-shaped dataset
        - `workday_validation_rules.xlsx` - Business rules in Workday format
        - `workday_hcm_validated_sample.xlsx` - Pre-validated dataset for the
          Dashboard stage
        """
    )
