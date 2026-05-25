# HCM Data Validator

A Streamlit MVP that runs a two-stage pipeline on HCM data:

1. **Mapping (Stage 1)** — transforms a source dataset (e.g., Oracle export) into Workday shape using a configurable mapping file
2. **Validation (Stage 2)** — runs OLD and NEW business rule sets against the mapped dataset and compares results

## What it does

1. Accepts four Excel uploads:
   - Source dataset (any shape)
   - Mapping file (source → target field mappings + crosswalks)
   - OLD validation rules (baseline)
   - NEW validation rules (target rule set)
2. Stage 1: applies mappings + crosswalks to produce a target-shaped dataset
3. Stage 2: runs both rule sets against the target dataset
4. Shows results across five tabs: Summary, Mapping, Comparison, Dashboard, Log
5. Downloads available for the mapped intermediate dataset and the final validated dataset

## Local run

```bash
pip install -r requirements.txt
streamlit run app.py
```

The app opens at `http://localhost:8501`.

## Deploy to Streamlit Community Cloud

1. Push this folder to a GitHub repo
2. Go to [share.streamlit.io](https://share.streamlit.io) and sign in with GitHub
3. Click **New app**, pick the repo, branch, and `app.py`
4. Click **Deploy** — you get a permanent URL like `your-app.streamlit.app`

Every `git push` to the connected branch redeploys automatically.

## File structure

```
.
├── app.py                       # Streamlit UI (4 uploads, 5 tabs)
├── mapping_engine.py            # Stage 1: source-to-target transformations
├── validation_engine.py         # Stage 2: business rule engine
├── generate_oracle_samples.py   # Script that produced the samples
├── requirements.txt
├── .streamlit/
│   └── config.toml              # Theme settings
├── samples/
│   ├── oracle_hcm_export.xlsx        # 50 Oracle-style employees
│   ├── oracle_to_workday_mapping.xlsx # Mapping rules + crosswalks
│   ├── validation_rules_v1_old.xlsx  # 5 basic rules
│   └── validation_rules_v2_new.xlsx  # 28 rules including Workday Core HCM spec
└── README.md
```

## Mapping file schema

The mapping file is an Excel workbook with **two sheets**:

### Sheet 1: `mappings`

One row per target field.

| Column | Required | Meaning |
|---|---|---|
| `source_field` | Conditional | Column in source dataset (blank for `constant` transformations) |
| `target_field` | Yes | Column to produce in target dataset |
| `transformation` | Yes | Operation to apply (see below) |
| `parameter` | No | Optional argument (date format, crosswalk name, constant value) |
| `required` | No | Yes/No flag (informational only) |
| `description` | No | Human-readable note |

### Sheet 2: `crosswalks` (optional)

Value-level lookup tables, referenced by `transformation=crosswalk` rows.

| Column | Required | Meaning |
|---|---|---|
| `crosswalk_name` | Yes | Identifier referenced from the mappings sheet |
| `source_value` | Yes | Value as it appears in the source dataset |
| `target_value` | Yes | Value to substitute in the target dataset |

### Supported mapping transformations

| Operation | Parameter | Example |
|---|---|---|
| `none` | — | pass value through unchanged |
| `trim` | — | strip surrounding whitespace |
| `trim_leading_zeros` | — | `"00100001"` → `"100001"` |
| `lowercase` | — | `"ABC"` → `"abc"` |
| `uppercase` | — | `"abc"` → `"ABC"` |
| `title_case` / `proper_case` | — | `"JOHN DOE"` → `"John Doe"` |
| `format_date` | strftime format (default `%Y-%m-%d`) | `"30-SEP-2017"` → `"2017-09-30"` |
| `round_decimals` | decimal places (default 2) | `12345.6789` → `12345.68` |
| `remove_special` | — | strips non-alphanumeric characters |
| `digits_only` | — | `"+1 (555) 123-4567"` → `"15551234567"` |
| `crosswalk` | crosswalk_name | looks up `source_value` → `target_value` |
| `constant` | constant value | every row gets this value |
| `concat` | `field1\|field2\|...` | joins multiple source fields with space |
| `split_first` | delimiter (default space) | takes first token |
| `split_last` | delimiter (default space) | takes last token |

## Validation rule file schema

The validation rules file is an Excel workbook with one sheet. Each row defines a rule.

| Column | Required | Meaning |
|---|---|---|
| `rule_id` | Yes | Unique identifier (e.g. `V001`, `T001`) |
| `field` | Yes | Column in the dataset (after mapping) |
| `rule_type` | Yes | `validation`, `transformation`, or `not_implemented` |
| `operation` | Yes | See operations table below |
| `parameter` | No | Optional argument |
| `severity` | No | `Hard Stop`, `Soft Warning`, or `Info` |
| `category` | No | Free-text tag |
| `description` | No | Human-readable explanation |

### Supported validation operations

`not_null`, `contains`, `regex`, `unique`, `greater_than`, `less_than`,
`date_not_future`, `date_within_offset_days`, `date_after_field`,
`date_before_or_equal_field`, `not_equal_to_field`, `age_at_least`,
`conditional_equals`, `conditional_regex`, `fte_hours_consistent`

### Supported validation transformations

`trim`, `lowercase`, `uppercase`, `title_case`

## Notes

- Files are processed in memory and not persisted.
- Upload limit set to 50 MB in `.streamlit/config.toml`.
- The `samples/` folder contains a complete working example: Oracle-style source data, the Oracle-to-Workday mapping file, and both rule sets.
