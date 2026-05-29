"""
Generate sample input files for the HCM Data Validator.

Produces five files in samples/:
  1. oracle_hcm_source.xlsx          - Oracle-shaped raw data (for Profiling + Transformation)
  2. oracle_to_workday_mapping.xlsx  - Mapping file with crosswalks (for Transformation)
  3. workday_hcm_dataset.xlsx        - Workday-shaped data (for Validation directly)
  4. workday_validation_rules.xlsx   - Business rules (for Validation)
  5. workday_hcm_validated_sample.xlsx - Pre-validated dataset (for Dashboard demo)

The Oracle source has seeded data quality issues so Profiling, Transformation,
and Validation all have something interesting to show.
"""
import os
import sys
import random
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

# Make engines importable
sys.path.insert(0, str(Path(__file__).resolve().parent))
from mapping_engine import apply_mapping, load_mapping_file
from validation_engine import apply_rules, load_rules


random.seed(42)
HERE = Path(__file__).resolve().parent
SAMPLES = HERE / "samples"
SAMPLES.mkdir(exist_ok=True)


# =====================================================================
# 1. Oracle source dataset
# =====================================================================
FIRST_NAMES = ["AISHA", "JAMES", "MARIA", "CARLOS", "PRIYA", "WEI", "FATIMA", "NOAH",
               "LIN", "DAVID", "EMMA", "TOMAS", "OLIVIA", "ARJUN", "SOFIA", "HENRY",
               "ZARA", "MOHAMED", "GRACE", "LIAM", "CHLOE", "MATEO", "AVA", "LUCAS",
               "NORA", "ETHAN", "ISLA", "DIEGO", "MIA", "OWEN", "ANA", "JONAH",
               "LUCIA", "FELIX", "AMARA", "ELIAS", "NINA", "OMAR", "RUBY", "KOFI",
               "SANA", "RAJ", "LENA", "HUGO", "IDA", "JOSE", "KATIA", "LARS",
               "MILA", "NICO"]
LAST_NAMES = ["SMITH", "JOHNSON", "WILLIAMS", "BROWN", "JONES", "GARCIA", "MILLER",
              "DAVIS", "RODRIGUEZ", "MARTINEZ", "HERNANDEZ", "LOPEZ", "GONZALEZ",
              "WILSON", "ANDERSON", "THOMAS", "TAYLOR", "MOORE", "JACKSON", "MARTIN",
              "LEE", "PEREZ", "THOMPSON", "WHITE", "HARRIS", "SANCHEZ", "CLARK",
              "RAMIREZ", "LEWIS", "ROBINSON", "WALKER", "YOUNG", "ALLEN", "KING",
              "WRIGHT", "SCOTT", "TORRES", "NGUYEN", "HILL", "FLORES", "GREEN",
              "ADAMS", "NELSON", "BAKER", "HALL", "RIVERA", "CAMPBELL", "MITCHELL",
              "CARTER", "ROBERTS"]
COUNTRIES = ["US", "GB", "PH", "SG", "CA", "AU", "DE", "FR"]
JOB_CODES = ["JC-ENG-001", "JC-ENG-002", "JC-SAL-001", "JC-SAL-002", "JC-OPS-001",
             "JC-FIN-001", "JC-HR-001", "JC-MKT-001"]
DEPT_CODES = ["D100", "D200", "D300", "D400", "D500"]
LOCATION_CODES = ["LOC-NYC", "LOC-LON", "LOC-MNL", "LOC-SIN", "LOC-TOR", "LOC-SYD"]


def _oracle_date(d):
    """Format date the way Oracle exports them: 30-SEP-2017"""
    if d is None:
        return None
    return d.strftime("%d-%b-%Y").upper()


def build_oracle_source():
    rows = []
    today = date.today()
    employees = []

    # Pre-generate manager pool first (managers must exist before subordinates can reference them)
    for i in range(50):
        person_id = f"00{100001 + i}"
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        country = random.choices(COUNTRIES, weights=[12, 4, 6, 2, 3, 2, 2, 2])[0]
        person_type = random.choices([1, 2], weights=[8, 2])[0]  # 1=Employee, 2=Contingent
        status = random.choices(["A", "T"], weights=[9, 1])[0]
        hire_offset = random.randint(30, 365 * 8)
        hire_date = today - timedelta(days=hire_offset)
        dob = hire_date - timedelta(days=random.randint(365 * 22, 365 * 50))
        term_date = (hire_date + timedelta(days=random.randint(180, hire_offset))) if status == "T" else None
        salary = round(random.uniform(35000, 180000), 2)
        flsa = random.choice(["E", "N"])  # Exempt / Non-Exempt
        pay_basis = "S" if flsa == "E" else "H"  # Salary or Hourly
        employees.append({
            "PERSON_ID": person_id,
            "FIRST_NAME": first,
            "LAST_NAME": last,
            "DATE_OF_BIRTH": _oracle_date(dob),
            "EMAIL_ADDRESS": f"{first}.{last}@COMPANY.COM",
            "PHONE_NUMBER": f"+1 ({random.randint(200,999)}) {random.randint(200,999)}-{random.randint(1000,9999)}",
            "HIRE_DATE": _oracle_date(hire_date),
            "ORIGINAL_HIRE_DATE": _oracle_date(hire_date),
            "TERMINATION_DATE": _oracle_date(term_date),
            "PERSON_TYPE_ID": person_type,
            "EMPLOYMENT_STATUS_CODE": status,
            "JOB_CODE": random.choice(JOB_CODES),
            "DEPARTMENT_CODE": random.choice(DEPT_CODES),
            "LOCATION_CODE": random.choice(LOCATION_CODES),
            "COUNTRY_CODE": country,
            "MANAGER_PERSON_ID": "",  # filled in below
            "ANNUAL_SALARY": salary,
            "FLSA_STATUS_CODE": flsa,
            "PAY_BASIS_CODE": pay_basis,
            "FTE_PCT": random.choice([1.0, 1.0, 1.0, 0.8, 0.5]),
            "STANDARD_HOURS": 40.0,
        })

    # Assign managers (random subset, no self-reference)
    person_ids = [e["PERSON_ID"] for e in employees]
    for e in employees:
        candidates = [pid for pid in person_ids if pid != e["PERSON_ID"]]
        e["MANAGER_PERSON_ID"] = random.choice(candidates) if candidates else ""

    df = pd.DataFrame(employees)

    # Seed data quality issues
    df.loc[0, "PERSON_ID"] = None                          # null required ID
    df.loc[1, "FIRST_NAME"] = None                         # null required field
    df.loc[2, "EMAIL_ADDRESS"] = "NOT-AN-EMAIL"            # malformed email
    df.loc[3, "HIRE_DATE"] = _oracle_date(today + timedelta(days=180))  # future hire
    df.loc[4, "ANNUAL_SALARY"] = -1500.00                  # negative pay
    df.loc[5, "TERMINATION_DATE"] = _oracle_date(today - timedelta(days=365 * 30))  # term before hire (very old)
    df.loc[5, "EMPLOYMENT_STATUS_CODE"] = "T"
    df.loc[6, "FIRST_NAME"] = "  trailing  "               # whitespace
    df.loc[7, "LAST_NAME"] = "smith"                       # not uppercase (will catch mixed casing)
    df.loc[8, "PERSON_ID"] = df.loc[10, "PERSON_ID"]       # duplicate ID
    df.loc[9, "EMAIL_ADDRESS"] = df.loc[11, "EMAIL_ADDRESS"]  # duplicate email
    df.loc[12, "DATE_OF_BIRTH"] = _oracle_date(today - timedelta(days=365 * 10))  # under 14
    df.loc[13, "MANAGER_PERSON_ID"] = df.loc[13, "PERSON_ID"]  # self as manager
    df.loc[14, "COUNTRY_CODE"] = ""                        # missing country

    return df


# =====================================================================
# 2. Oracle to Workday mapping file
# =====================================================================
def build_mapping_workbook():
    mappings = pd.DataFrame([
        # source_field, target_field, transformation, parameter, required, description
        ("PERSON_ID", "Employee ID", "trim_leading_zeros", "", "Yes", "Strip Oracle leading zeros"),
        ("FIRST_NAME", "First Name", "title_case", "", "Yes", "Oracle UPPERCASE to Title Case"),
        ("LAST_NAME", "Last Name", "title_case", "", "Yes", "Oracle UPPERCASE to Title Case"),
        ("DATE_OF_BIRTH", "Date of Birth", "format_date", "%Y-%m-%d", "Yes", "Reformat to ISO"),
        ("EMAIL_ADDRESS", "Work Email", "lowercase", "", "Yes", "Normalize email casing"),
        ("PHONE_NUMBER", "Work Phone", "digits_only", "", "No", "Strip formatting"),
        ("HIRE_DATE", "Hire Date", "format_date", "%Y-%m-%d", "Yes", "Reformat to ISO"),
        ("ORIGINAL_HIRE_DATE", "Original Hire Date", "format_date", "%Y-%m-%d", "No", ""),
        ("TERMINATION_DATE", "Termination Date", "format_date", "%Y-%m-%d", "No", ""),
        ("PERSON_TYPE_ID", "Worker Type", "crosswalk", "person_type", "Yes", "Oracle ID to Workday label"),
        ("EMPLOYMENT_STATUS_CODE", "Employment Status", "crosswalk", "emp_status", "Yes", ""),
        ("JOB_CODE", "Job Code", "none", "", "Yes", ""),
        ("DEPARTMENT_CODE", "Department", "none", "", "Yes", ""),
        ("LOCATION_CODE", "Location", "none", "", "Yes", ""),
        ("COUNTRY_CODE", "Country", "none", "", "Yes", ""),
        ("MANAGER_PERSON_ID", "Manager Employee ID", "trim_leading_zeros", "", "No", ""),
        ("ANNUAL_SALARY", "Annual Base Salary", "round_decimals", "2", "Yes", ""),
        ("FLSA_STATUS_CODE", "Exempt / Non-Exempt", "crosswalk", "flsa", "Yes", ""),
        ("PAY_BASIS_CODE", "Pay Basis", "crosswalk", "pay_basis", "Yes", ""),
        ("FTE_PCT", "FTE %", "none", "", "Yes", ""),
        ("STANDARD_HOURS", "Scheduled Weekly Hours", "none", "", "Yes", ""),
        ("", "Source System", "constant", "ORACLE", "No", "Provenance marker"),
    ], columns=["source_field", "target_field", "transformation", "parameter", "required", "description"])

    crosswalks = pd.DataFrame([
        ("person_type", "1", "Employee"),
        ("person_type", "2", "Contingent Worker"),
        ("emp_status", "A", "Active"),
        ("emp_status", "T", "Terminated"),
        ("flsa", "E", "Exempt"),
        ("flsa", "N", "Non-Exempt"),
        ("pay_basis", "S", "Salary"),
        ("pay_basis", "H", "Hourly"),
    ], columns=["crosswalk_name", "source_value", "target_value"])

    path = SAMPLES / "oracle_to_workday_mapping.xlsx"
    with pd.ExcelWriter(path, engine="openpyxl") as w:
        mappings.to_excel(w, sheet_name="mappings", index=False)
        crosswalks.to_excel(w, sheet_name="crosswalks", index=False)
    return path


# =====================================================================
# 3. Workday validation rules
# =====================================================================
def build_validation_rules():
    rules = pd.DataFrame([
        # rule_id, rule_type, field, operation, parameter, severity, category, description
        ("T001", "transformation", "First Name", "trim", "", "Info", "Cleanup",
         "Strip whitespace from First Name"),
        ("T002", "transformation", "Last Name", "trim", "", "Info", "Cleanup",
         "Strip whitespace from Last Name"),
        ("T003", "transformation", "Work Email", "lowercase", "", "Info", "Cleanup",
         "Normalize email to lowercase"),

        ("V001", "validation", "Employee ID", "not_null", "", "Hard Stop", "Required",
         "Employee ID is required"),
        ("V002", "validation", "First Name", "not_null", "", "Hard Stop", "Required",
         "First Name is required"),
        ("V003", "validation", "Last Name", "not_null", "", "Hard Stop", "Required",
         "Last Name is required"),
        ("V004", "validation", "Hire Date", "not_null", "", "Hard Stop", "Required",
         "Hire Date is required"),
        ("V005", "validation", "Employee ID", "unique", "", "Hard Stop", "Uniqueness",
         "Employee ID must be unique across all rows"),
        ("V006", "validation", "Work Email", "unique", "", "Hard Stop", "Uniqueness",
         "Work Email must be unique"),
        ("V007", "validation", "Work Email", "regex",
         r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$",
         "Hard Stop", "Format", "Work Email must be valid format"),
        ("V008", "validation", "Hire Date", "date_within_offset_days", "90",
         "Soft Warning", "Date Validation",
         "Hire Date should not be more than 90 days in the future"),
        ("V009", "validation", "Annual Base Salary", "greater_than", "0",
         "Hard Stop", "Compensation", "Annual Base Salary must be greater than 0"),
        ("V010", "validation", "Termination Date", "date_after_field", "Hire Date",
         "Hard Stop", "Date Validation",
         "Termination Date must be on or after Hire Date"),
        ("V011", "validation", "Date of Birth", "age_at_least", "14",
         "Hard Stop", "Compliance", "Worker must be at least 14 years old"),
        ("V012", "validation", "Manager Employee ID", "not_equal_to_field", "Employee ID",
         "Hard Stop", "Hierarchy", "A worker cannot be their own manager"),
        ("V013", "validation", "Country", "not_null", "", "Hard Stop", "Required",
         "Country is required"),
        ("V014", "validation", "Original Hire Date", "date_before_or_equal_field", "Hire Date",
         "Soft Warning", "Date Validation",
         "Original Hire Date should be on or before current Hire Date"),
        ("V015", "validation", "Pay Basis", "conditional_equals",
         "Exempt / Non-Exempt=Non-Exempt:Hourly",
         "Hard Stop", "Compliance",
         "Non-Exempt workers must be paid Hourly"),
    ], columns=["rule_id", "rule_type", "field", "operation", "parameter",
                "severity", "category", "description"])

    path = SAMPLES / "workday_validation_rules.xlsx"
    rules.to_excel(path, sheet_name="rules", index=False)
    return path


# =====================================================================
# Build everything and run the pipeline once to produce the pre-validated sample
# =====================================================================
def main():
    print("Building Oracle source dataset...")
    oracle_df = build_oracle_source()
    oracle_path = SAMPLES / "oracle_hcm_source.xlsx"
    oracle_df.to_excel(oracle_path, sheet_name="source", index=False)
    print(f"  -> {oracle_path}  ({len(oracle_df)} rows, {len(oracle_df.columns)} cols)")

    print("Building mapping workbook...")
    mapping_path = build_mapping_workbook()
    print(f"  -> {mapping_path}")

    print("Building validation rules...")
    rules_path = build_validation_rules()
    print(f"  -> {rules_path}")

    print("Running transformation to produce Workday-shaped sample...")
    mappings_df, crosswalks = load_mapping_file(mapping_path)
    workday_df, trans_summary, _ = apply_mapping(oracle_df, mappings_df, crosswalks)
    workday_path = SAMPLES / "workday_hcm_dataset.xlsx"
    workday_df.to_excel(workday_path, sheet_name="dataset", index=False)
    print(f"  -> {workday_path}  ({len(workday_df)} rows, {len(workday_df.columns)} cols)")
    print(f"     Crosswalks applied: {trans_summary['crosswalks_loaded']}")

    print("Running validation to produce pre-validated sample for Dashboard...")
    rules_df = load_rules(rules_path)
    validated_df, val_summary, _ = apply_rules(workday_df, rules_df)
    validated_path = SAMPLES / "workday_hcm_validated_sample.xlsx"
    validated_df.to_excel(validated_path, sheet_name="validated", index=False)
    print(f"  -> {validated_path}")
    print(f"     Passing: {val_summary['rows_passing']}  Failing: {val_summary['rows_failing']}  Warnings: {val_summary['rows_with_warnings']}")

    print("Building simulated Workday report extract for Data Compare Validation...")
    # Start from the transformed dataset and introduce realistic load discrepancies:
    #   - drop a few rows (records that failed to load)
    #   - add a few rows (unexpected extras already in the tenant)
    #   - change some field values (data that landed differently than intended)
    report_df = workday_df.copy().reset_index(drop=True)

    # Drop 3 rows (rows 20, 21, 22) to simulate records that did not load
    report_df = report_df.drop(index=[20, 21, 22]).reset_index(drop=True)

    # Change field values on a handful of rows to simulate load discrepancies.
    # Use rows with valid (non-null) Employee IDs so they match on the key.
    if "Annual Base Salary" in report_df.columns:
        report_df.loc[5, "Annual Base Salary"] = round(
            float(pd.to_numeric(report_df.loc[5, "Annual Base Salary"], errors="coerce") or 0) + 500, 2
        )
    if "Work Email" in report_df.columns:
        report_df.loc[1, "Work Email"] = "changed.during.load@company.com"
    if "Location" in report_df.columns:
        report_df.loc[2, "Location"] = "LOC-DIFFERENT"
    if "Worker Type" in report_df.columns:
        report_df.loc[3, "Worker Type"] = "Employee" if report_df.loc[3, "Worker Type"] != "Employee" else "Contingent Worker"

    # Add 2 extra rows (employees present in Workday but not in our loaded extract)
    extra_rows = report_df.head(2).copy()
    if "Employee ID" in extra_rows.columns:
        extra_rows["Employee ID"] = ["999001", "999002"]
    if "First Name" in extra_rows.columns:
        extra_rows["First Name"] = ["Preexisting", "Preexisting"]
    if "Last Name" in extra_rows.columns:
        extra_rows["Last Name"] = ["Worker-A", "Worker-B"]
    report_df = pd.concat([report_df, extra_rows], ignore_index=True)

    report_path = SAMPLES / "workday_report_extract.xlsx"
    report_df.to_excel(report_path, sheet_name="workday_report", index=False)
    print(f"  -> {report_path}  ({len(report_df)} rows)")
    print("     Seeded: 3 missing rows, 2 extra rows, 4 field changes vs workday_hcm_dataset.xlsx")

    print("\nDone. All sample files in samples/")


if __name__ == "__main__":
    main()
