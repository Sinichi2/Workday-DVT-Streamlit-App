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
    "A toolkit for HR data teams migrating legacy data into Workday. "
    "The workflow has five stages, each runnable on its own. Pick a stage "
    "from the sidebar."
)

st.divider()

row1 = st.columns(3)
row2 = st.columns(3)

with row1[0]:
    st.subheader("1. Profiling")
    st.markdown(
        "Assess the quality of a raw dataset before any changes. Identifies "
        "nulls, duplicates, format anomalies, and per-column statistics."
    )
    st.caption("**Input:** Any dataset")
    st.caption("**Output:** Per-column profile and issue list")
    if st.button("Open Profiling", use_container_width=True, key="open_profiling"):
        st.switch_page("pages/1_Profiling.py")

with row1[1]:
    st.subheader("2. Transformation")
    st.markdown(
        "Convert a source dataset (for example, an Oracle HCM export) into the "
        "shape required by the target system using a mapping file."
    )
    st.caption("**Inputs:** Source dataset, mapping file")
    st.caption("**Output:** Target-shaped dataset")
    if st.button("Open Transformation", use_container_width=True, key="open_transformation"):
        st.switch_page("pages/2_Transformation.py")

with row1[2]:
    st.subheader("3. System Validation")
    st.markdown(
        "Apply the target system's business rules to a dataset and flag every "
        "row that fails - required fields, formats, uniqueness, cross-field logic."
    )
    st.caption("**Inputs:** Dataset, validation rules")
    st.caption("**Output:** Validated dataset with pass/fail flags")
    if st.button("Open System Validation", use_container_width=True, key="open_system_validation"):
        st.switch_page("pages/3_System_Validation.py")

with row2[0]:
    st.subheader("4. Data Compare Validation")
    st.markdown(
        "Compare two datasets with the same columns, matching on a key column. "
        "Verifies that data loaded into the target system matches what was "
        "intended - catches load errors before going live."
    )
    st.caption("**Inputs:** Expected dataset, actual dataset")
    st.caption("**Output:** Missing rows, extra rows, field mismatches")
    if st.button("Open Data Compare Validation", use_container_width=True, key="open_compare"):
        st.switch_page("pages/4_Data_Compare_Validation.py")

with row2[1]:
    st.subheader("5. Dashboard")
    st.markdown(
        "Browse a validated dataset by Country, Worker Type, severity, and "
        "failure reason. Use this after running System Validation."
    )
    st.caption("**Input:** A validated dataset")
    st.caption("**Output:** Statistics by category")
    if st.button("Open Dashboard", use_container_width=True, key="open_dashboard"):
        st.switch_page("pages/5_Dashboard.py")

st.divider()

with st.expander("How the stages relate to each other"):
    st.markdown(
        """
        The stages follow the real Workday migration lifecycle, but each one can
        be run on its own depending on what the client needs:

        - **Profiling** can run alone on any dataset - clients often request this
          as a standalone deliverable to assess data quality before committing
          to a migration.
        - **Transformation** reshapes legacy (source) data into target shape
          using a mapping file.
        - **System Validation** applies the target system's business rules to the
          transformed data and flags rule failures.
        - **Data Compare Validation** is a fidelity check: after data is loaded
          into the target system, a report is pulled back out and compared
          against what was loaded, to confirm everything landed correctly.
        - **Dashboard** is a browsing layer over an already-validated dataset.

        System Validation answers "do these records follow the rules?" Data
        Compare Validation answers "did what I loaded actually land correctly?"
        """
    )

with st.expander("Sample files for demos"):
    st.markdown(
        """
        Sample input files for each stage are in the `samples/` folder:

        - `oracle_hcm_source.xlsx` - Oracle-shaped source dataset (50 employees)
        - `oracle_to_workday_mapping.xlsx` - Mapping file with crosswalks
        - `workday_hcm_dataset.xlsx` - Already-transformed Workday-shaped dataset
        - `workday_validation_rules.xlsx` - Business rules in Workday format
        - `workday_hcm_validated_sample.xlsx` - Pre-validated dataset for the
          Dashboard stage
        - `workday_report_extract.xlsx` - Simulated Workday report for Data
          Compare Validation (compare against `workday_hcm_dataset.xlsx`)
        """
    )
