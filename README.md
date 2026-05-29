# HCM Data Validator

A five-stage Streamlit app for migrating legacy HR data into Workday:
**Profiling**, **Transformation**, **System Validation**, **Data Compare
Validation**, and **Dashboard**. Each stage runs independently.

## Stages

| Stage | Inputs | Output |
|---|---|---|
| Profiling | Any dataset | Per-column stats and anomaly list |
| Transformation | Source dataset, mapping file | Target-shaped dataset |
| System Validation | Dataset, validation rules | Validated dataset with errors and pass/fail flags |
| Data Compare Validation | Expected dataset, actual dataset | Missing rows, extra rows, field mismatches |
| Dashboard | A validated dataset | Breakdowns by Country, Worker Type, severity, failure reason |

**System Validation** answers "do these records follow the business rules?"
**Data Compare Validation** answers "did what I loaded actually land correctly?"
It is a fidelity check: after data is loaded into the target system, a report is
pulled back out and compared against what was loaded.

The stages mirror the real Workday migration lifecycle, but each can run on its
own. A client can request a profile-only engagement; System Validation runs
against transformed (target-shape) data; Data Compare Validation runs against
two datasets that share the same columns.

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

The first build takes 1-2 minutes. Subsequent pushes auto-redeploy in about
30 seconds.

## Sample files

Six files under `samples/` cover every stage:

| File | Use it for |
|---|---|
| `oracle_hcm_source.xlsx` | Profiling; Transformation (as source) |
| `oracle_to_workday_mapping.xlsx` | Transformation (as mapping file) |
| `workday_hcm_dataset.xlsx` | System Validation (already transformed); Data Compare (as expected) |
| `workday_validation_rules.xlsx` | System Validation (as rules) |
| `workday_hcm_validated_sample.xlsx` | Dashboard |
| `workday_report_extract.xlsx` | Data Compare Validation (as actual; compare vs `workday_hcm_dataset.xlsx`) |

The report extract has 3 missing rows, 2 extra rows, and 4 field changes seeded
against the transformed dataset, so the comparison has something to show.

Regenerate any of these with `python generate_samples.py`.

## File layout

```
.
├── app.py                              # Landing page
├── pages/
│   ├── 1_Profiling.py
│   ├── 2_Transformation.py
│   ├── 3_System_Validation.py
│   ├── 4_Data_Compare_Validation.py
│   └── 5_Dashboard.py
├── profiling_engine.py                 # Stage 1 logic
├── mapping_engine.py                   # Stage 2 logic
├── validation_engine.py                # Stage 3 logic
├── compare_engine.py                   # Stage 4 logic
├── generate_samples.py                 # Builds sample input files
├── samples/                            # Six sample Excel files
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

### Data Compare Validation

No rule file. The two uploaded datasets must share column headers. The user
picks a key column to match rows on. The comparison reports rows present in one
file but not the other, and field-level disagreements on matched rows.
