import type { Severity } from "@/app/data/subscriber/subscriber.dashboard_data";

/** The four workflow steps, in the order the sidebar and the "Continue to …"
 *  buttons walk through them. */
export const WORKFLOW_ORDER = ["profile", "transform", "validate", "compare"] as const;
export type Step = (typeof WORKFLOW_ORDER)[number];

/** `as const` so callers get the literal labels, not bare `string` — the app
 *  shell routes on these values. */
export const STEP_LABEL = {
  profile: "Profile",
  transform: "Transform",
  validate: "Validate",
  compare: "Compare",
} as const satisfies Record<Step, string>;

// Transform

/** Mapping health, in the designer's own vocabulary. Deliberately NOT reusing
 *  `Severity`: "unmapped" is a mapping state, not a rule failure. */
export type MappingStatus = "mapped" | "review" | "warning" | "unmapped";

export const TRANSFORM_OPTIONS = [
  "Direct",
  "Trim",
  "Lowercase",
  "Date Convert",
  "Lookup",
  "Strip Currency",
] as const;

/** What each transform actually does — surfaced by the "?" button next to the
 *  dropdown, so the reviewer never has to guess what will run. */
export const TRANSFORM_HINT: Record<string, string> = {
  Direct: "Copies the source value through unchanged.",
  Trim: "Removes leading and trailing whitespace.",
  Lowercase: "Lowercases the whole value.",
  "Date Convert": "Reformats the date to Workday's MM/DD/YYYY.",
  Lookup: "Translates the code via the Workday reference table.",
  "Strip Currency": "Removes currency symbols and thousands separators.",
};

export type Mapping = {
  source: string;
  sourceLabel: string;
  transform: string;
  target: string;
  status: MappingStatus;
};

export const DUMMY_MAPPINGS: Mapping[] = [
  { source: "EMP_ID", sourceLabel: "Employee ID", transform: "Direct", target: "Employee_ID", status: "mapped" },
  { source: "FIRST_NM", sourceLabel: "First Name", transform: "Trim", target: "Legal_First_Name", status: "mapped" },
  { source: "LAST_NM", sourceLabel: "Last Name", transform: "Trim", target: "Legal_Last_Name", status: "mapped" },
  { source: "HIRE_DT", sourceLabel: "Hire Date", transform: "Date Convert", target: "Hire_Date", status: "mapped" },
  { source: "PAY_GRP", sourceLabel: "Pay Group", transform: "Lookup", target: "Pay_Group", status: "review" },
  { source: "DEPT_CD", sourceLabel: "Department Code", transform: "Lookup", target: "Cost_Center", status: "review" },
  { source: "MGR_ID", sourceLabel: "Manager ID", transform: "Direct", target: "Manager_ID", status: "mapped" },
  { source: "JOB_CD", sourceLabel: "Job Code", transform: "Lookup", target: "Job_Profile", status: "review" },
  { source: "BASE_SAL", sourceLabel: "Base Salary", transform: "Strip Currency", target: "Annual_Salary", status: "mapped" },
  { source: "POSTAL", sourceLabel: "Postal Code", transform: "Trim", target: "Postal_Code", status: "warning" },
  { source: "COUNTRY", sourceLabel: "Country", transform: "Lookup", target: "Country", status: "mapped" },
  { source: "WORK_EMAIL", sourceLabel: "Work Email", transform: "Lowercase", target: "Work_Email", status: "mapped" },
  { source: "TAX_CD", sourceLabel: "Tax Code", transform: "Direct", target: "Tax_Code", status: "unmapped" },
  { source: "WRK_TYP", sourceLabel: "Worker Type", transform: "Lookup", target: "Worker_Type", status: "mapped" },
];

// Validate

export type Finding = {
  row: number;
  field: string;
  /** `null` renders as the italic "empty" the design calls for — an empty
   *  string would silently render as nothing at all. */
  value: string | null;
  issue: string;
  severity: Severity;
  fix: string;
};

export type ValidationRun = {
  records: number;
  fields: number;
  rules: number;
  qualityScore: string;
  passed: number;
  counts: Record<Severity, number>;
  aiSummary: string;
  autoFixable: number;
  manualFixes: number;
  findings: Finding[];
};

export const DUMMY_RUN: ValidationRun = {
  records: 4218,
  fields: 14,
  rules: 28,
  qualityScore: "97.3%",
  passed: 4142,
  counts: { critical: 3, high: 3, medium: 4, low: 2 },
  aiSummary:
    "3 critical errors require manual resolution — missing manager assignments block the org hierarchy. 7 high/medium issues are auto-fixable with TRIM and lookup transforms. 2 low-severity email issues are safe to auto-clean. Estimated fix time is 12 min.",
  autoFixable: 8,
  manualFixes: 3,
  findings: [
    { row: 103, field: "Manager_ID", value: null, issue: "Manager ID is required for all workers", severity: "critical", fix: "Assign manager 10001 (Sarah Johnson, HR Director)" },
    { row: 218, field: "Manager_ID", value: null, issue: "Manager ID is required for all workers", severity: "critical", fix: "Review org structure — may be top-level position" },
    { row: 447, field: "Manager_ID", value: "MGR_99", issue: "Manager ID does not exist in target system", severity: "critical", fix: "Map MGR_99 → Employee_ID 10412" },
    { row: 56, field: "Pay_Group", value: "BW-US", issue: "Pay group value not in Workday reference table", severity: "high", fix: 'Standardize to "Bi-Weekly US"' },
    { row: 89, field: "Pay_Group", value: "BW-US", issue: "Pay group value not in Workday reference table", severity: "high", fix: 'Standardize to "Bi-Weekly US"' },
    { row: 342, field: "Cost_Center", value: "CC-HQ-100", issue: "Cost center code format mismatch", severity: "high", fix: 'Remove prefix "CC-" — Workday expects "HQ-100"' },
    { row: 12, field: "Postal_Code", value: "10001", issue: "Leading whitespace detected", severity: "medium", fix: "Apply TRIM() — auto-clean available" },
    { row: 34, field: "Postal_Code", value: "90210", issue: "Trailing whitespace detected", severity: "medium", fix: "Apply TRIM()" },
    { row: 78, field: "Hire_Date", value: "2020/03/15", issue: "Date format should be MM/DD/YYYY", severity: "medium", fix: "Reformat to 03/15/2020" },
    { row: 156, field: "Annual_Salary", value: "$85,000", issue: "Currency symbol present — numeric value expected", severity: "medium", fix: 'Remove "$" and commas — use 85000' },
    { row: 203, field: "Work_Email", value: "John.Doe@Company.C", issue: "Email not lowercase", severity: "low", fix: "Apply LOWER()" },
    { row: 301, field: "Legal_First_Name", value: "James ", issue: "Leading whitespace detected", severity: "low", fix: "Apply TRIM()" },
  ],
};

// Compare

/** Step 1: how confident Valigo is that a source column maps to a target field.
 *  "confirm" means a human has to sign off before the comparison runs. */
export type ColumnMatch = {
  source: string;
  sourceLabel: string;
  target: string;
  confidence: "auto" | "confirm";
};

export const DUMMY_COLUMN_MATCHES: ColumnMatch[] = [
  { source: "EMP_ID", sourceLabel: "Employee ID", target: "Employee_ID", confidence: "auto" },
  { source: "FIRST_NM", sourceLabel: "First Name", target: "Legal_First_Name", confidence: "auto" },
  { source: "LAST_NM", sourceLabel: "Last Name", target: "Legal_Last_Name", confidence: "auto" },
  { source: "HIRE_DT", sourceLabel: "Hire Date", target: "Hire_Date", confidence: "auto" },
  { source: "PAY_GRP", sourceLabel: "Pay Group", target: "Pay_Group", confidence: "confirm" },
  { source: "DEPT_CD", sourceLabel: "Department Code", target: "Cost_Center", confidence: "confirm" },
  { source: "MGR_ID", sourceLabel: "Manager ID", target: "Manager_ID", confidence: "auto" },
  { source: "JOB_CD", sourceLabel: "Job Code", target: "Job_Profile", confidence: "confirm" },
  { source: "BASE_SAL", sourceLabel: "Base Salary", target: "Annual_Salary", confidence: "confirm" },
  { source: "POSTAL", sourceLabel: "Postal Code", target: "Postal_Code", confidence: "auto" },
  { source: "COUNTRY", sourceLabel: "Country", target: "Country", confidence: "auto" },
  { source: "WORK_EMAIL", sourceLabel: "Work Email", target: "Work_Email", confidence: "auto" },
  { source: "TAX_CD", sourceLabel: "Tax Code", target: "Tax_Code", confidence: "confirm" },
  { source: "WRK_TYP", sourceLabel: "Worker Type", target: "Worker_Type", confidence: "confirm" },
];

/** Step 2: one field of the sampled record, source value vs what would land in
 *  Workday. `note` is the short right-aligned reason a row does not match. */
export type FieldDiff = {
  field: string;
  sourceValue: string | null;
  targetValue: string | null;
  note?: string;
  match: boolean;
};

export type ComparisonRun = {
  sampleRow: number;
  matchRate: string;
  exact: number;
  fields: number;
  mismatches: number;
  aiRecommendation: string;
  autoFixable: number;
  manualFixes: number;
  diffs: FieldDiff[];
};

export const DUMMY_COMPARISON: ComparisonRun = {
  sampleRow: 103,
  matchRate: "21%",
  exact: 3,
  fields: 14,
  mismatches: 11,
  aiRecommendation:
    "8 of 11 mismatches are auto-correctable via TRIM, LOWER, date reformat, and lookup standardization. Manager_ID, Tax_Code mapping, and Worker_Type lookup require manual intervention before a clean Workday load.",
  autoFixable: 8,
  manualFixes: 3,
  diffs: [
    { field: "Employee_ID", sourceValue: "10042", targetValue: "10042", match: true },
    { field: "Legal_First_Name", sourceValue: "Sarah ", targetValue: "Sarah", note: "Trim needed", match: false },
    { field: "Legal_Last_Name", sourceValue: "Johnson", targetValue: "Johnson", match: true },
    { field: "Hire_Date", sourceValue: "2019/06/01", targetValue: "06/01/2019", note: "Date format", match: false },
    { field: "Pay_Group", sourceValue: "BW-US", targetValue: "Bi-Weekly US", note: "Lookup mismatch", match: false },
    { field: "Cost_Center", sourceValue: "CC-HQ-100", targetValue: "HQ-100", note: "Prefix to remove", match: false },
    { field: "Manager_ID", sourceValue: null, targetValue: "10001", note: "Critical: empty", match: false },
    { field: "Job_Profile", sourceValue: "MGR-SR-01", targetValue: "Senior Manager", note: "Lookup mismatch", match: false },
    { field: "Annual_Salary", sourceValue: "$95,000", targetValue: "95000", note: "Format strip", match: false },
    { field: "Postal_Code", sourceValue: "10001", targetValue: "10001", match: true },
    { field: "Country", sourceValue: "USA", targetValue: "United States", note: "Lookup mismatch", match: false },
    { field: "Work_Email", sourceValue: "Sarah.Johnson@Corp.com", targetValue: "sarah.johnson@corp.com", note: "Lowercase", match: false },
    { field: "Tax_Code", sourceValue: "FED-EX-01", targetValue: null, note: "Unmapped target", match: false },
    { field: "Worker_Type", sourceValue: "FT", targetValue: "Regular", note: "Lookup mismatch", match: false },
  ],
};
