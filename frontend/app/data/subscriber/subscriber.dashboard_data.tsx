export type Severity = "critical" | "high" | "medium" | "low";

/** A trend delta. `direction` is the arrow (sign of the change); `good` is the
 *  color (is this change good FOR THIS METRIC?). They're separate on purpose:
 *  "−14 errors" points down but is good (green down-arrow), not a red one. */
export type Delta = { text: string; direction: "up" | "down"; good: boolean };

export type DashboardData = {
  qualityScore: string;
  recordsEvaluated: string;
  qualityDelta: Delta;
  errorTotal: number;
  distribution: Record<Severity, number>;
  stats: { label: string; sublabel: string; hint: string; value: string; delta: Delta }[];
  breakdown: { severity: Severity; label: string; count: number; note: string }[];
  insights: { title: string; body: string; actions: ("ai" | "manual" | "manual-required")[] }[];
};

/** Valigo keeps its own 4-tier rollup (critical/high/medium/low), but the person
 *  approving the load reads Workday's native tiers. This maps rollup -> Workday
 *  so the UI can show both and the reviewer can translate. */
export const SEVERITY_WORKDAY: Record<Severity, string> = {
  critical: "Hard Stop — blocks the load",
  high: "Soft Warning",
  medium: "Soft Warning",
  low: "Info",
};

export const DUMMY_DATA: DashboardData = {
  qualityScore: "97.3%",
  recordsEvaluated: "4,218 records evaluated",
  qualityDelta: { text: "+1.2% from last run", direction: "up", good: true },
  errorTotal: 76,
  distribution: { critical: 3, high: 11, medium: 24, low: 38 },
  stats: [
    {
      label: "Data Integrity",
      sublabel: "Field mapping coverage",
      hint: "Share of source fields with a confirmed mapping to a Workday field.",
      value: "83.3%",
      delta: { text: "−0.4%", direction: "down", good: false },
    },
    {
      label: "Total Errors",
      sublabel: "Across all severity levels",
      hint: "Every rule failure in this run, from Hard Stop down to Info.",
      value: "76",
      delta: { text: "−14 from last run", direction: "down", good: true },
    },
    {
      label: "Records Passed",
      sublabel: "Out of 4,218 total",
      hint: "Records with zero Hard Stop failures — clear to load.",
      value: "4,142",
      delta: { text: "+60 from last run", direction: "up", good: true },
    },
  ],
  breakdown: [
    { severity: "critical", label: "Critical", count: 3, note: "Missing manager assignments" },
    { severity: "high", label: "High", count: 11, note: "Pay group & cost center lookup mismatches" },
    { severity: "medium", label: "Medium", count: 24, note: "Date formats, whitespace, currency symbols" },
    { severity: "low", label: "Low", count: 38, note: "Email casing, minor trim issues" },
  ],
  insights: [
    {
      title: "3 critical — manager not assigned",
      body: "Employee IDs 10042, 10077, 10213 have no manager assigned. Will block Workday org hierarchy load.",
      actions: ["manual-required"],
    },
    {
      title: "Pay group mismatch ×11",
      body: "“BW-US” does not match Workday reference table.",
      actions: ["ai", "manual"],
    },
    {
      title: "ZIP whitespace ×24",
      body: "Leading or trailing spaces in Postal_Code field.",
      actions: ["ai", "manual"],
    },
  ],
};
