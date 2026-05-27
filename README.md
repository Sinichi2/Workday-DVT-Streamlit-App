# HCM Data Validator

A four-stage Streamlit app for preparing legacy HR data for Workday migration:
**Profiling**, **Transformation**, **Validation**, **Dashboard**. Each stage
runs independently.

## Stages

| Stage | Inputs | Output |
|---|---|---|
| Profiling | Any dataset | Per-column stats and anomaly list |
| Transformation | Source dataset, mapping file | Target-shaped dataset |
| Validation | Dataset, validation rules | Validated dataset with errors and pass/fail flags |
| Dashboard | A validated dataset | Breakdowns by Country, Worker Type, severity, failure reason |

The dependency chain is logical, not enforced. A client can request a
profile-only engagement; transformation can run without a prior formal profile;
validation runs against transformed (target-shape) data.

## Run locally

```bash
pip install -r requirements.txt
streamlit run app.py
```

Open http://localhost:8501.

## Deploy to Streamlit Community Cloud

1. Push this repo to GitHub.
2. Go to https://share.streamlit.io and sign in with GitHub.
3. Click **New app**, pick the repo, branch `main`, main file `app.py`.
4. Click **Deploy**.

The first build takes 1-2 minutes. Subsequent pushes auto-redeploy in
about 30 seconds (faster if `requirements.txt` is unchanged).

## Sample files

Five files under `samples/` cover every stage:

| File | Use it for |
|---|---|
| `oracle_hcm_source.xlsx` | Profiling stage; Transformation stage (as source) |
| `oracle_to_workday_mapping.xlsx` | Transformation stage (as mapping file) |
| `workday_hcm_dataset.xlsx` | Validation stage (already transformed) |
| `workday_validation_rules.xlsx` | Validation stage (as rules) |
| `workday_hcm_validated_sample.xlsx` | Dashboard stage |

Regenerate any of these with `python generate_samples.py`.

## File layout

```
.
├── app.py                          # Landing page
├── pages/
│   ├── 1_Profiling.py
│   ├── 2_Transformation.py
│   ├── 3_Validation.py
│   └── 4_Dashboard.py
├── profiling_engine.py             # Stage 1 logic
├── mapping_engine.py               # Stage 2 logic
├── validation_engine.py            # Stage 3 logic
├── generate_samples.py             # Builds sample input files
├── samples/                        # Five sample Excel files
├── requirements.txt
└── .streamlit/config.toml
```

## Rule file formats

### Validation rules (`workday_validation_rules.xlsx`)

One row per rule. Columns: `rule_id`, `rule_type`, `field`, `operation`,
`parameter`, `severity`, `category`, `description`.

`rule_type` is `transformation`, `validation`, or `not_implemented`.

`severity` follows Workday conventions: `Hard Stop`, `Soft Warning`, `Info`.

Supported operations:

- Transformations: `trim`, `lowercase`, `uppercase`, `title_case`
- Validations: `not_null`, `contains`, `regex`, `unique`, `greater_than`,
  `less_than`, `date_not_future`, `date_within_offset_days`,
  `date_after_field`, `date_before_or_equal_field`, `not_equal_to_field`,
  `age_at_least`, `conditional_equals`, `conditional_regex`,
  `fte_hours_consistent`

### Mapping file (`oracle_to_workday_mapping.xlsx`)

Two sheets.

`mappings` sheet: `source_field`, `target_field`, `transformation`,
`parameter`, `required`, `description`.

`crosswalks` sheet (optional): `crosswalk_name`, `source_value`,
`target_value`.

Supported transformations: `none`, `trim`, `trim_leading_zeros`, `lowercase`,
`uppercase`, `title_case`, `proper_case`, `format_date`, `round_decimals`,
`remove_special`, `digits_only`, `crosswalk`, `constant`, `concat`,
`split_first`, `split_last`.
