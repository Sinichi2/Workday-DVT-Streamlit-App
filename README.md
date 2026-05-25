# HCM Data Validator

A multi-page Streamlit app with **three independent features** for HCM data work:

1. **✅ Validation** — run business rules against a dataset, compare two rule sets
2. **🔄 Source Mapping** — transform a source dataset (e.g., Oracle) into Workday shape
3. **📊 Dashboard** — view statistics on a validated dataset by category

Each feature is fully self-contained: separate uploads, separate logic, no data is shared between pages.

## Local run

```bash
pip install -r requirements.txt
streamlit run app.py
```

The app opens at `http://localhost:8501` with a sidebar listing all three pages.

## Deploy to Streamlit Community Cloud

1. Push this folder to a GitHub repo
2. Go to [share.streamlit.io](https://share.streamlit.io) and sign in with GitHub
3. Click **New app**, pick the repo, branch, and `app.py` as the main file
4. Click **Deploy** — you get a permanent URL like `your-app.streamlit.app`

Streamlit auto-detects the `pages/` directory and renders the sidebar. Every `git push` redeploys.

## File structure

```
.
├── app.py                       # Landing page (links to all three features)
├── pages/
│   ├── 1_Validation.py          # Feature 1
│   ├── 2_Source_Mapping.py      # Feature 2
│   └── 3_Dashboard.py           # Feature 3
├── validation_engine.py         # Rule engine (used by Validation page)
├── mapping_engine.py            # Mapping engine (used by Source Mapping page)
├── requirements.txt
├── .streamlit/config.toml       # Theme settings
├── samples/
│   ├── validation_rules_v1_old.xlsx
│   └── validation_rules_v2_new.xlsx
└── README.md
```

## Feature 1 — Validation

**Inputs (3 files):**
- HCM dataset (in target shape, e.g., Workday)
- Old validation rules
- New validation rules

**Tabs:** Summary · Comparison (side-by-side OLD vs NEW) · Dashboard (toggle OLD/NEW table view) · Log

**Output:** Validated dataset with `_errors` and `_is_valid` columns appended.

### Validation rule file schema

One sheet, one row per rule:

| Column | Required | Meaning |
|---|---|---|
| `rule_id` | Yes | Unique identifier |
| `field` | Yes | Column in the dataset |
| `rule_type` | Yes | `validation`, `transformation`, or `not_implemented` |
| `operation` | Yes | See operations table |
| `parameter` | No | Optional argument |
| `severity` | No | `Hard Stop`, `Soft Warning`, or `Info` |
| `category` | No | Free-text tag |
| `description` | No | Human-readable explanation |

Supported validation operations: `not_null`, `contains`, `regex`, `unique`, `greater_than`, `less_than`, `date_not_future`, `date_within_offset_days`, `date_after_field`, `date_before_or_equal_field`, `not_equal_to_field`, `age_at_least`, `conditional_equals`, `conditional_regex`, `fte_hours_consistent`

Supported transformations: `trim`, `lowercase`, `uppercase`, `title_case`

## Feature 2 — Source Mapping

**Inputs (2 files):**
- Source dataset (any column shape)
- Mapping file with `mappings` + `crosswalks` sheets

**Tabs:** Overview · Source vs Target (side-by-side) · Log

**Output:** Mapped dataset in target shape.

### Mapping file schema

**Sheet `mappings`:**

| Column | Required | Meaning |
|---|---|---|
| `source_field` | Conditional | Column in source dataset (blank for `constant`) |
| `target_field` | Yes | Column to produce in target dataset |
| `transformation` | Yes | Operation to apply |
| `parameter` | No | Optional argument |
| `required` | No | Yes/No flag (informational) |
| `description` | No | Human-readable note |

**Sheet `crosswalks` (optional):**

| Column | Required | Meaning |
|---|---|---|
| `crosswalk_name` | Yes | Identifier referenced from mappings |
| `source_value` | Yes | Value in source dataset |
| `target_value` | Yes | Value to substitute |

Supported transformations: `none`, `trim`, `trim_leading_zeros`, `lowercase`, `uppercase`, `title_case` / `proper_case`, `format_date`, `round_decimals`, `remove_special`, `digits_only`, `crosswalk`, `constant`, `concat`, `split_first`, `split_last`

## Feature 3 — Dashboard

**Input (1 file):**
- A validated dataset (must already have `_errors` and `_is_valid` columns from Feature 1)

**Sections:**
- Headline metrics (total / passing / failing / with warnings)
- Breakdowns by Country and Worker Type (and Employment Status if present)
- By Severity (Hard Stop / Soft Warning / Info)
- By Failure Reason (per rule_id, sorted by frequency)

## Notes

- Files are processed in memory and not persisted.
- Upload limit: 50 MB (configurable in `.streamlit/config.toml`).
- The `samples/` folder contains working examples for each feature.
