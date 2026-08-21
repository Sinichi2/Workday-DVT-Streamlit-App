export type Severity = "critical" | "high" | "medium" | "low";

/** A trend delta. `direction` is the arrow (sign of the change); `good` is the
 *  color (is this change good FOR THIS METRIC?). They're separate on purpose:
 *  "−14 errors" points down but is good (green down-arrow), not a red one. */
export type Delta = { text: string; direction: "up" | "down" | "flat"; good: boolean };

/** One AI suggestion. `severity` ties it to a row of the severity breakdown, so
 *  the sparkle on that row can open just the insights that apply to it. */
export type Insight = {
  severity: Severity;
  title: string;
  body: string;
  actions: ("ai" | "manual" | "manual-required")[];
};

export type DashboardData = {
  qualityScore: string;
  recordsEvaluated: string;
  qualityDelta: Delta;
  errorTotal: number;
  distribution: Record<Severity, number>;
  stats: { label: string; sublabel: string; hint: string; value: string; delta: Delta }[];
  breakdown: { severity: Severity; label: string; count: number; note: string }[];
  insights: Insight[];
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
