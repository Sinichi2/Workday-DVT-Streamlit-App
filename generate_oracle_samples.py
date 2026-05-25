"""
Generate three sample files for the source-to-target demo:
  - oracle_hcm_export.xlsx   : Oracle-style source dataset (50 employees)
  - oracle_to_workday_mapping.xlsx : mapping rules + crosswalks
  - (validation_rules_*_xlsx already exist from earlier; we reuse them)
"""
import random
from datetime import date, timedelta

import pandas as pd

random.seed(42)

# ============================================================
# 1. ORACLE-STYLE SAMPLE DATASET
# Field names mimic PER_ALL_PEOPLE_F / PER_ALL_ASSIGNMENTS_M / CMP_SALARY tables
# ============================================================

FIRST_NAMES_M = ["james","wei","carlos","john","ahmed","liam","diego","hiroshi","ravi","kenji","michael","david","juan"]
FIRST_NAMES_F = ["maria","aisha","priya","sofia","yuki","chen","fatima","emma","olivia","anna","sarah","linda","isabel"]
LAST_NAMES    = ["smith","garcia","zhang","khan","reyes","patel","brown","santos","hassan","tanaka","wilson","liu","ali",
                 "cruz","johnson","sato","davis","kumar","mueller","yamamoto","dela cruz","rodriguez","anderson","taylor","lopez"]

# Oracle PERSON_TYPE_ID is a numeric foreign key, not a label
# 1=Employee, 2=Contingent Worker, 3=Intern, 4=Retiree
PERSON_TYPE_IDS = ["1","2","1","1","1","1","1","1","2","1"]  # weighted toward Employee

# Oracle EMPLOYMENT_STATUS_CODE values (legacy single-char codes typical of old systems)
EMPLOYMENT_STATUS_CODES = ["A","A","A","A","A","A","A","A","T","A"]  # mostly Active

# Oracle uses 2-char ISO country codes typically
COUNTRIES = ["US"]*30 + ["PH"]*10 + ["GB"]*5 + ["SG"]*2 + ["JP"]*2 + ["AU"]*1

# Oracle stores PAY_BASIS_CODE: SALARIED, HOURLY
PAY_BASIS_CODES = ["SALARIED","SALARIED","SALARIED","HOURLY","HOURLY"]

# Oracle FLSA_STATUS: EX, NE (Exempt, Non-Exempt)
FLSA_STATUSES = ["EX","EX","EX","NE","NE"]

JOB_CODES = [
    ("SWE001","Software Engineer"),
    ("SWE002","Senior Software Engineer"),
    ("SAL001","Account Executive"),
    ("OPS001","Operations Associate"),
    ("CSR001","Customer Support Rep"),
    ("MGR001","Engineering Manager"),
    ("MGR002","Sales Manager"),
    ("HR001","HR Business Partner"),
    ("FIN001","Financial Analyst"),
    ("WHS001","Warehouse Associate"),
]
DEPT_CODES = ["DEPT-ENG","DEPT-SAL","DEPT-OPS","DEPT-HR","DEPT-FIN","DEPT-MKT"]
LEGAL_ENTITIES = ["LE-US-001","LE-PH-001","LE-GB-001","LE-APAC-001"]

def rand_date(y1, y2):
    s, e = date(y1, 1, 1), date(y2, 12, 31)
    return s + timedelta(days=random.randint(0, (e - s).days))

def oracle_date(d):
    """Oracle dates are typically DD-MON-YYYY format in exports."""
    if d is None:
        return None
    return d.strftime("%d-%b-%Y").upper()

def gen_us_ssn():
    return f"{random.randint(1,899):03d}-{random.randint(1,99):02d}-{random.randint(1,9999):04d}"

def gen_phone(country):
    cc = {"US":"+1","PH":"+63","GB":"+44","SG":"+65","JP":"+81","AU":"+61"}[country]
    return f"{cc} ({random.randint(100,999)}) {random.randint(100,999)}-{random.randint(1000,9999)}"

rows = []
for i in range(1, 51):
    # Oracle PERSON_ID often has leading zeros / padding
    person_id = f"{100000 + i:08d}"  # 8-digit zero-padded ID
    gender = random.choice(["M","F","X"])
    first  = random.choice(FIRST_NAMES_M if gender=="M" else FIRST_NAMES_F)
    last   = random.choice(LAST_NAMES)
    country = random.choice(COUNTRIES)
    dob   = rand_date(1960, 2000)
    hire  = rand_date(2015, 2025)
    is_terminated = random.random() < 0.12
    term  = rand_date(hire.year+1, 2026) if is_terminated else None
    job_code, _ = random.choice(JOB_CODES)
    pay_basis = random.choice(PAY_BASIS_CODES)
    flsa = "EX" if pay_basis == "SALARIED" else "NE"
    annual_salary = round(random.uniform(30000, 150000), 2)

    rows.append({
        # PER_ALL_PEOPLE_F columns
        "PERSON_ID":           person_id,
        "PERSON_NUMBER":       f"E{100000+i}",
        "FIRST_NAME":          first.upper(),       # Oracle often stores names in UPPER
        "LAST_NAME":           last.upper(),
        "MIDDLE_NAMES":        random.choice([None, "A", "M", "J", None, None]),
        "DATE_OF_BIRTH":       oracle_date(dob),    # DD-MON-YYYY
        "SEX":                 gender,
        "NATIONAL_IDENTIFIER": gen_us_ssn() if country=="US" else f"NID-{country}-{random.randint(100000,999999)}",
        "EMAIL_ADDRESS":       f"{first}.{last.replace(' ','')}@COMPANY.COM",  # uppercase, will be cleaned
        "PHONE_NUMBER":        gen_phone(country),  # formatted, needs cleaning
        # PER_ALL_ASSIGNMENTS_M columns
        "HIRE_DATE":           oracle_date(hire),
        "EFFECTIVE_START_DATE":oracle_date(hire),
        "TERMINATION_DATE":    oracle_date(term),
        "EMPLOYMENT_STATUS_CODE": "T" if is_terminated else "A",
        "PERSON_TYPE_ID":      random.choice(PERSON_TYPE_IDS),
        "JOB_CODE":            job_code,
        "DEPARTMENT_CODE":     random.choice(DEPT_CODES),
        "LEGAL_ENTITY_ID":     random.choice(LEGAL_ENTITIES),
        "LOCATION_CODE":       f"LOC-{country}-{random.randint(1,5):03d}",
        "MANAGER_PERSON_ID":   f"{100000+random.randint(1,10):08d}" if i > 10 else None,
        "FLSA_STATUS":         flsa,
        "PAY_BASIS_CODE":      pay_basis,
        # CMP_SALARY columns
        "ANNUAL_SALARY":       annual_salary,
        "CURRENCY_CODE":       {"US":"USD","PH":"PHP","GB":"GBP","SG":"SGD","JP":"JPY","AU":"AUD"}[country],
        # Address (PER_ADDRESSES)
        "ADDRESS_LINE_1":      f"{random.randint(1,9999)} {random.choice(['MAIN','OAK','PINE','ELM','MAPLE'])} ST",
        "CITY":                {"US":"New York","PH":"Manila","GB":"London","SG":"Singapore","JP":"Tokyo","AU":"Sydney"}[country],
        "POSTAL_CODE":         f"{random.randint(10000,99999)}" if country=="US" else f"{random.randint(1000,9999)}",
        "COUNTRY_CODE":        country,
    })

# Inject some realistic dirty data — Oracle exports are messy
rows[5]["FIRST_NAME"]   = "  MARIA  "         # whitespace
rows[7]["LAST_NAME"]    = None
rows[10]["EMAIL_ADDRESS"] = "broken-email-no-at"
rows[13]["HIRE_DATE"]   = "01-JAN-2099"       # future hire
rows[15]["ANNUAL_SALARY"] = -5000             # bad salary
rows[20]["TERMINATION_DATE"] = "01-JAN-2010"
rows[20]["EMPLOYMENT_STATUS_CODE"] = "T"
rows[20]["HIRE_DATE"] = "01-JAN-2020"         # term before hire
rows[24]["PERSON_ID"] = None                  # null PK
rows[28]["FIRST_NAME"] = "john"               # lowercase
rows[33]["EMAIL_ADDRESS"] = None              # null email
rows[40]["DEPARTMENT_CODE"] = None            # missing dept

pd.DataFrame(rows).to_excel("/home/claude/streamlit_app/oracle_hcm_export.xlsx", index=False)
print(f"Wrote oracle_hcm_export.xlsx: {len(rows)} rows x {len(rows[0])} columns")


# ============================================================
# 2. MAPPING FILE (Oracle -> Workday)
# Two sheets: 'mappings' and 'crosswalks'
# ============================================================

mappings = pd.DataFrame([
    # Identity
    {"source_field":"PERSON_ID",        "target_field":"Employee ID",         "transformation":"trim_leading_zeros", "parameter":"",          "required":"Yes", "description":"Strip Oracle's leading zeros from PERSON_ID"},
    {"source_field":"PERSON_TYPE_ID",   "target_field":"Worker Type",         "transformation":"crosswalk",          "parameter":"PERSON_TYPE","required":"Yes", "description":"Map Oracle person type code to Workday worker type"},

    # Name fields
    {"source_field":"FIRST_NAME",       "target_field":"First Name",          "transformation":"title_case",         "parameter":"",          "required":"Yes", "description":"Convert UPPERCASE first name to Title Case"},
    {"source_field":"LAST_NAME",        "target_field":"Last Name",           "transformation":"title_case",         "parameter":"",          "required":"Yes", "description":"Convert UPPERCASE last name to Title Case"},
    {"source_field":"MIDDLE_NAMES",     "target_field":"Middle Name",         "transformation":"title_case",         "parameter":"",          "required":"No",  "description":"Optional middle name"},

    # Demographics
    {"source_field":"DATE_OF_BIRTH",    "target_field":"Date of Birth",       "transformation":"format_date",        "parameter":"%Y-%m-%d",  "required":"Yes", "description":"Convert DD-MON-YYYY to ISO date"},
    {"source_field":"SEX",              "target_field":"Gender",              "transformation":"crosswalk",          "parameter":"GENDER",    "required":"No",  "description":"Map Oracle gender codes to Workday labels"},
    {"source_field":"NATIONAL_IDENTIFIER","target_field":"SSN",               "transformation":"trim",               "parameter":"",          "required":"No",  "description":"Oracle national ID -> Workday SSN field"},

    # Contact
    {"source_field":"EMAIL_ADDRESS",    "target_field":"Work Email",          "transformation":"lowercase",          "parameter":"",          "required":"Yes", "description":"Lowercase email address"},
    {"source_field":"PHONE_NUMBER",     "target_field":"Work Phone",          "transformation":"digits_only",        "parameter":"",          "required":"No",  "description":"Strip formatting from phone numbers"},

    # Employment dates
    {"source_field":"HIRE_DATE",        "target_field":"Hire Date",           "transformation":"format_date",        "parameter":"%Y-%m-%d",  "required":"Yes", "description":"Convert DD-MON-YYYY to ISO date"},
    {"source_field":"HIRE_DATE",        "target_field":"Original Hire Date",  "transformation":"format_date",        "parameter":"%Y-%m-%d",  "required":"Yes", "description":"Oracle has no separate original hire date — use HIRE_DATE"},
    {"source_field":"TERMINATION_DATE", "target_field":"Termination Date",    "transformation":"format_date",        "parameter":"%Y-%m-%d",  "required":"No",  "description":"Convert DD-MON-YYYY to ISO date"},
    {"source_field":"EMPLOYMENT_STATUS_CODE","target_field":"Employment Status","transformation":"crosswalk",        "parameter":"EMP_STATUS","required":"Yes", "description":"Map A/T codes to Active/Terminated"},

    # Org / Job
    {"source_field":"JOB_CODE",         "target_field":"Job Profile",         "transformation":"none",               "parameter":"",          "required":"Yes", "description":"Pass through job code"},
    {"source_field":"DEPARTMENT_CODE",  "target_field":"Cost Center",         "transformation":"none",               "parameter":"",          "required":"Yes", "description":"Oracle department maps to Workday cost center"},
    {"source_field":"LEGAL_ENTITY_ID",  "target_field":"Company",             "transformation":"none",               "parameter":"",          "required":"Yes", "description":"Legal entity = Workday company"},
    {"source_field":"LOCATION_CODE",    "target_field":"Location",            "transformation":"none",               "parameter":"",          "required":"Yes", "description":"Pass through location code"},
    {"source_field":"MANAGER_PERSON_ID","target_field":"Manager",             "transformation":"trim_leading_zeros", "parameter":"",          "required":"No",  "description":"Strip leading zeros from manager person ID"},

    # Compensation / classification
    {"source_field":"FLSA_STATUS",      "target_field":"Exempt / Non-Exempt", "transformation":"crosswalk",          "parameter":"FLSA",      "required":"Yes", "description":"Map EX/NE to Exempt/Non-Exempt"},
    {"source_field":"PAY_BASIS_CODE",   "target_field":"Pay Rate Type",       "transformation":"crosswalk",          "parameter":"PAY_BASIS", "required":"Yes", "description":"Map SALARIED/HOURLY to Workday values"},
    {"source_field":"ANNUAL_SALARY",    "target_field":"Base Pay",            "transformation":"round_decimals",     "parameter":"2",         "required":"Yes", "description":"Round salary to 2 decimal places"},
    {"source_field":"CURRENCY_CODE",    "target_field":"Currency",            "transformation":"none",               "parameter":"",          "required":"Yes", "description":"Currency code"},

    # Address
    {"source_field":"ADDRESS_LINE_1",   "target_field":"Home Address Line 1", "transformation":"title_case",         "parameter":"",          "required":"No",  "description":"Convert UPPERCASE street to Title Case"},
    {"source_field":"CITY",             "target_field":"City",                "transformation":"none",               "parameter":"",          "required":"No",  "description":"City"},
    {"source_field":"POSTAL_CODE",      "target_field":"Postal Code",         "transformation":"none",               "parameter":"",          "required":"No",  "description":"Postal code"},
    {"source_field":"COUNTRY_CODE",     "target_field":"Country",             "transformation":"none",               "parameter":"",          "required":"Yes", "description":"Country code"},

    # Constant — every row gets the same value (useful for ETL provenance)
    {"source_field":"",                 "target_field":"Source System",       "transformation":"constant",           "parameter":"ORACLE",    "required":"No",  "description":"Tag every row as coming from Oracle"},
])

crosswalks = pd.DataFrame([
    {"crosswalk_name":"PERSON_TYPE", "source_value":"1", "target_value":"Employee"},
    {"crosswalk_name":"PERSON_TYPE", "source_value":"2", "target_value":"Contingent Worker"},
    {"crosswalk_name":"PERSON_TYPE", "source_value":"3", "target_value":"Intern"},
    {"crosswalk_name":"PERSON_TYPE", "source_value":"4", "target_value":"Retiree"},

    {"crosswalk_name":"GENDER", "source_value":"M", "target_value":"Male"},
    {"crosswalk_name":"GENDER", "source_value":"F", "target_value":"Female"},
    {"crosswalk_name":"GENDER", "source_value":"X", "target_value":"Non-Binary"},

    {"crosswalk_name":"EMP_STATUS", "source_value":"A", "target_value":"Active"},
    {"crosswalk_name":"EMP_STATUS", "source_value":"T", "target_value":"Terminated"},
    {"crosswalk_name":"EMP_STATUS", "source_value":"L", "target_value":"Leave"},

    {"crosswalk_name":"FLSA", "source_value":"EX", "target_value":"Exempt"},
    {"crosswalk_name":"FLSA", "source_value":"NE", "target_value":"Non-Exempt"},

    {"crosswalk_name":"PAY_BASIS", "source_value":"SALARIED", "target_value":"Salary"},
    {"crosswalk_name":"PAY_BASIS", "source_value":"HOURLY",   "target_value":"Hourly"},
])

# Write both sheets to one workbook
with pd.ExcelWriter("/home/claude/streamlit_app/oracle_to_workday_mapping.xlsx", engine="openpyxl") as w:
    mappings.to_excel(w, sheet_name="mappings", index=False)
    crosswalks.to_excel(w, sheet_name="crosswalks", index=False)

print(f"Wrote oracle_to_workday_mapping.xlsx: {len(mappings)} mappings, {len(crosswalks)} crosswalk entries")
