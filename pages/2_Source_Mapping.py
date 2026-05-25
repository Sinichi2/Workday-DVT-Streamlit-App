"""
Source Mapping feature.

Two uploads -> apply mappings + crosswalks -> show source vs target side-by-side ->
download the mapped dataset.

Fully self-contained. State stored under "map_" keys to avoid cross-page collisions.
"""
import io
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from mapping_engine import apply_mapping, load_mapping_file
from validation_engine import load_dataset  # reuse the simple Excel loader


st.set_page_config(page_title="Source Mapping — HCM Data Validator", page_icon="🔄", layout="wide")


def _init():
    defaults = {
        "map_processed":   False,
        "map_source_df":   None,
        "map_target_df":   None,
        "map_summary":     None,
        "map_log_lines":   [],
        "map_source_name": "",
        "map_mapping_name": "",
    }
    for k, v in defaults.items():
        st.session_state.setdefault(k, v)

_init()


@st.cache_data
def _to_excel_bytes(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        df.to_excel(w, index=False, sheet_name="Mapped")
    return buf.getvalue()


# ========================================================================
# Header
# ========================================================================
st.title("🔄 Source Mapping")
st.caption(
    "Transform a source dataset (e.g., Oracle HCM export) into a target shape "
    "(e.g., Workday) using a mapping file. The mapping file defines per-field "
    "transformations and value-level crosswalks."
)
st.divider()


# ========================================================================
# Upload step
# ========================================================================
if not st.session_state.map_processed:
    st.subheader("Step 1 — Upload files")

    c1, c2 = st.columns(2)
    with c1:
        st.markdown("**1. Source Dataset**")
        st.caption("Raw data from the source system (any column shape)")
        src = st.file_uploader("source", type=["xlsx"], key="map_src", label_visibility="collapsed")
    with c2:
        st.markdown("**2. Mapping File**")
        st.caption("Two sheets: `mappings` + `crosswalks`")
        mp = st.file_uploader("mapping", type=["xlsx"], key="map_mp", label_visibility="collapsed")

    st.write("")
    ready = all([src, mp])
    if not ready:
        st.info("Upload both files to enable processing.")

    if st.button("▶ Run mapping", type="primary", disabled=not ready):
        with st.spinner("Applying mappings..."):
            log = []
            log.append(f"Run started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            log.append(f"Source dataset: {src.name} ({src.size:,} bytes)")
            log.append(f"Mapping file:   {mp.name} ({mp.size:,} bytes)")
            log.append("")

            try:
                source_df = load_dataset(src)
                mappings, crosswalks = load_mapping_file(mp)
                log.append(f"Loaded source: {len(source_df)} rows x {len(source_df.columns)} columns")
                log.append(f"Loaded mappings: {len(mappings)} field mappings, {len(crosswalks)} crosswalk group(s)")
                log.append("")

                target_df, summary, map_log = apply_mapping(source_df, mappings, crosswalks)
                log.extend(map_log)
                log.append("")
                log.append(f"Run finished at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

                st.session_state.map_source_df    = source_df
                st.session_state.map_target_df    = target_df
                st.session_state.map_summary      = summary
                st.session_state.map_log_lines    = log
                st.session_state.map_source_name  = src.name
                st.session_state.map_mapping_name = mp.name
                st.session_state.map_processed    = True
                st.rerun()

            except Exception as e:
                st.error(f"Mapping failed: {e}")
                st.exception(e)


# ========================================================================
# Results
# ========================================================================
else:
    summary = st.session_state.map_summary

    l, r = st.columns([3, 1])
    with l:
        st.subheader("Results")
        st.caption(
            f"Source: `{st.session_state.map_source_name}` · "
            f"Mapping: `{st.session_state.map_mapping_name}`"
        )
    with r:
        excel_bytes = _to_excel_bytes(st.session_state.map_target_df)
        dl_name = st.session_state.map_source_name.replace(".xlsx", "") + "_mapped.xlsx"
        st.download_button(
            "⬇ Download mapped dataset",
            data=excel_bytes, file_name=dl_name,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            type="primary", use_container_width=True,
        )
        if st.button("↺ Start over", use_container_width=True):
            for k in list(st.session_state.keys()):
                if k.startswith("map_"):
                    del st.session_state[k]
            st.rerun()

    st.divider()

    tab_overview, tab_compare, tab_log = st.tabs(["📊 Overview", "🔀 Source vs Target", "📝 Log"])

    # --- Overview ---
    with tab_overview:
        st.markdown("### Mapping overview")
        a, b, c, d = st.columns(4)
        with a: st.metric("Source rows", summary["source_rows"])
        with b: st.metric("Source columns", summary["source_cols"])
        with c: st.metric("Target columns", summary["target_cols"])
        with d: st.metric("Crosswalk groups", summary["crosswalk_count"])

        if summary["unknown_ops"]:
            st.warning(
                "Unknown transformation(s) (passed through as-is): "
                + ", ".join(summary["unknown_ops"])
            )

        st.markdown("#### Per-field mapping details")
        if not summary["per_field"].empty:
            st.dataframe(summary["per_field"], use_container_width=True, hide_index=True, height=400)
        else:
            st.caption("No mappings ran.")

    # --- Source vs Target side-by-side ---
    with tab_compare:
        st.markdown("### Source vs target — side by side")
        st.caption("First 100 rows shown.")
        lcol, rcol = st.columns(2)
        with lcol:
            st.markdown(f"**Source dataset** ({summary['source_cols']} cols)")
            st.dataframe(
                st.session_state.map_source_df.head(100),
                use_container_width=True, height=520,
            )
        with rcol:
            st.markdown(f"**Target dataset** ({summary['target_cols']} cols)")
            st.dataframe(
                st.session_state.map_target_df.head(100),
                use_container_width=True, height=520,
            )

    # --- Log ---
    with tab_log:
        st.markdown("### Run log")
        log_text = "\n".join(st.session_state.map_log_lines)
        st.code(log_text, language="text")
        st.download_button(
            "⬇ Download log (.txt)",
            data=log_text,
            file_name=f"mapping_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            mime="text/plain",
        )
