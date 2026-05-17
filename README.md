# HCM Data Validator

A Streamlit MVP that validates HCM (Workday Core HCM-style) employee data against a configurable rule set.

## What it does

1. Accepts three Excel uploads: an HCM dataset, an OLD rules file, a NEW rules file
2. Runs both rule sets against the dataset
3. Shows a comparison summary, a toggleable dashboard for each result, and a run log
4. Lets you download the dataset validated against the NEW rules

## Local run

```bash
pip install -r requirements.txt
streamlit run app.py
```

The app opens at `http://localhost:8501`.

## Deploy to Streamlit Community Cloud (free)

1. Push this folder to a GitHub repo
2. Go to [share.streamlit.io](https://share.streamlit.io) and sign in with GitHub
3. Click **New app**, pick the repo, branch, and `app.py`
4. Click **Deploy** — you get a permanent URL like `your-app.streamlit.app`

Every `git push` to the connected branch redeploys automatically.

## File structure

```
.
├── app.py                  # Streamlit UI
├── validation_engine.py    # Rule engine (transformations + validations)
├── requirements.txt
├── .streamlit/
│   └── config.toml         # Theme settings
└── README.md
```

## Sample files

Use the sample files from the v2 prototype:

- `hcm_sample_data_v2.xlsx` — 50 employees, 46 fields, seeded data issues
- `validation_rules_v1_old.xlsx` — 5 basic rules
- `validation_rules_v2_new.xlsx` — 28 rules including the Workday Core HCM spec

## Rule file schema

| Column | Required | Meaning |
|---|---|---|
| `rule_id` | Yes | Unique identifier (e.g. `V001`, `T001`) |
| `field` | Yes | Column in the dataset the rule applies to (exact match) |
| `rule_type` | Yes | `validation`, `transformation`, or `not_implemented` |
| `operation` | Yes | See operations table below |
| `parameter` | No | Optional argument (regex, number, field name, compound spec) |
| `severity` | No | `Hard Stop`, `Soft Warning`, or `Info` — default `Hard Stop` |
| `category` | No | Free-text tag (e.g. `Uniqueness`, `Format`, `Compliance`) |
| `description` | No | Human-readable explanation |

### Supported operations

**Validations:** `not_null`, `contains`, `regex`, `unique`, `greater_than`, `less_than`,
`date_not_future`, `date_within_offset_days`, `date_after_field`,
`date_before_or_equal_field`, `not_equal_to_field`, `age_at_least`,
`conditional_equals`, `conditional_regex`, `fte_hours_consistent`

**Transformations:** `trim`, `lowercase`, `uppercase`, `title_case`

## Notes

- Files are processed in memory and not persisted. The app does not write uploads to disk.
- Default Streamlit Community Cloud limits: 1 GB RAM, public URL.
- Upload limit set to 50 MB in `.streamlit/config.toml`.
