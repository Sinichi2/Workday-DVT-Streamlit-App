"""
HCM Data Validator — Landing page.

This file is the home page. Each feature is a separate page under pages/:
  pages/1_Validation.py
  pages/2_Source_Mapping.py
  pages/3_Dashboard.py

Streamlit auto-discovers files in pages/ and renders them in the sidebar.
"""
import streamlit as st

st.set_page_config(
    page_title="HCM Data Validator",
    page_icon="📋",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("📋 HCM Data Validator")
st.markdown(
    "A toolkit for HR data teams working with Workday and other HCM systems. "
    "Each feature is independent — pick the one you need from the sidebar on the left."
)

st.divider()

col1, col2, col3 = st.columns(3)

with col1:
    st.subheader("✅ Validation")
    st.markdown(
        "Run business rules against an HCM dataset and compare two rule sets side-by-side."
    )
    st.caption("**Inputs:** HCM dataset, OLD rules, NEW rules")
    st.caption("**Outputs:** Validated dataset, OLD vs NEW comparison, run log")
    if st.button("Open Validation", use_container_width=True, key="open_validation"):
        st.switch_page("pages/1_Validation.py")

with col2:
    st.subheader("🔄 Source Mapping")
    st.markdown(
        "Transform a source dataset (e.g., Oracle) into Workday shape using a mapping file."
    )
    st.caption("**Inputs:** Source dataset, mapping file")
    st.caption("**Outputs:** Mapped dataset, per-field details")
    if st.button("Open Source Mapping", use_container_width=True, key="open_mapping"):
        st.switch_page("pages/2_Source_Mapping.py")

with col3:
    st.subheader("📊 Dashboard")
    st.markdown(
        "Browse a validated dataset by country, worker type, severity, and failure reason."
    )
    st.caption("**Inputs:** A validated dataset (`_errors` and `_is_valid` columns)")
    st.caption("**Outputs:** Statistics by category")
    if st.button("Open Dashboard", use_container_width=True, key="open_dashboard"):
        st.switch_page("pages/3_Dashboard.py")

st.divider()

with st.expander("About this tool"):
    st.markdown(
        """
        **Three independent features**, each accessible from the sidebar:

        - **Validation** — uploads an HCM dataset and two rule sets, runs both, shows what changed.
        - **Source Mapping** — uploads a source dataset (any shape) and a mapping file, produces a target dataset.
        - **Dashboard** — uploads an already-validated dataset and shows statistics by category.

        Sample files for each feature are in the `samples/` folder of the repo.
        """
    )
