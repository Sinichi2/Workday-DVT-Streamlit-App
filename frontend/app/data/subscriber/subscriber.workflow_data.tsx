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


export type Mapping = {
  source: string;
  sourceLabel: string;
  transform: string;
  target: string;
  status: MappingStatus;
};


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


// Compare

/** Step 1: how confident Valigo is that a source column maps to a target field.
 *  "confirm" means a human has to sign off before the comparison runs. */
export type ColumnMatch = {
  source: string;
  sourceLabel: string;
  target: string;
  confidence: "auto" | "confirm";
};


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

