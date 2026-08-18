export type Severity = "critical" | "high" | "medium" | "low";

export type DashboardData = {
  qualityScore: string;
  recordsEvaluated: string;
  qualityDelta: string;
  errorTotal: number;
  distribution: Record<Severity, number>;
  stats: { label: string; sublabel: string; value: string; delta: string; trend: "up" | "down" }[];
  breakdown: { severity: Severity; label: string; count: number; note: string }[];
  insights: { title: string; body: string; actions: ("ai" | "manual" | "manual-required")[] }[];
};