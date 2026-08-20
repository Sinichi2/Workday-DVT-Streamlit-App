import type { Delta, Severity } from "@/app/data/subscriber/subscriber.dashboard_data";

export type Report = {
  id: string;
  name: string;
  date: string;
  records: number;
  errors: number;
  /** Percentage of records that cleared every rule, e.g. 97.3. */
  score: number;
};

export const DUMMY_REPORTS: Report[] = [
  { id: "RPT-0029", name: "HCM Workers Q3 Validation", date: "Jul 29, 2026", records: 4218, errors: 76, score: 97.3 },
  { id: "RPT-0028", name: "Compensation Load Validation", date: "Jul 27, 2026", records: 1842, errors: 10, score: 99.1 },
  { id: "RPT-0027", name: "Position Management Validation", date: "Jul 25, 2026", records: 3105, errors: 134, score: 91.4 },
  { id: "RPT-0026", name: "Org Structure Final", date: "Jul 22, 2026", records: 876, errors: 31, score: 96.5 },
  { id: "RPT-0025", name: "Payroll Mapping v2", date: "Jul 20, 2026", records: 2290, errors: 11, score: 99.7 },
  { id: "RPT-0024", name: "Benefits Enrollment Load", date: "Jul 15, 2026", records: 5140, errors: 287, score: 88.2 },
];

/** Rolling figures across the runs above — the summary strip at the top. */
export type ReportsSummary = { averageScore: string; delta: Delta; records: number; errors: number; runs: number };

export const DUMMY_SUMMARY: ReportsSummary = {
  averageScore: "95.4%",
  delta: { text: "+2.1% vs prior period", direction: "up", good: true },
  records: 17471,
  errors: 549,
  runs: 6,
};

/** Score bands. 97+ ships as-is, 95+ wants a look, below that needs work.
 *  Returned as token class names so callers never hardcode a color. */
export function scoreBand(score: number): { fill: string; text: string; verdict: string } {
  if (score >= 97) return { fill: "bg-success", text: "text-success-text", verdict: "On Track" };
  if (score >= 95) return { fill: "bg-medium", text: "text-medium-text", verdict: "Needs Review" };
  return { fill: "bg-high", text: "text-high-text", verdict: "At Risk" };
}

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

/** What each tier means for the person approving the load. */
export const SEVERITY_CONSEQUENCE: Record<Severity, string> = {
  critical: "Will cause load failure in Workday",
  high: "Should be resolved before loading",
  medium: "Recommended fixes for data quality",
  low: "Minor issues, safe to load as-is",
};

/** The severity mix Valigo sees on a typical run (3 : 11 : 24 : 38 of 76).
 *  Used to apportion a report's error total when only the total is known. */
const SEVERITY_MIX: Record<Severity, number> = { critical: 3, high: 11, medium: 24, low: 38 };
const MIX_TOTAL = Object.values(SEVERITY_MIX).reduce((a, b) => a + b, 0);

/** Split an error total across the severities, largest-remainder style so the
 *  parts always add back up to `errors` — a breakdown that doesn't sum to the
 *  headline number is worse than no breakdown. */
export function severityCounts(errors: number): Record<Severity, number> {
  const exact = SEVERITY_ORDER.map((s) => (errors * SEVERITY_MIX[s]) / MIX_TOTAL);
  const counts = exact.map(Math.floor);
  let remainder = errors - counts.reduce((a, b) => a + b, 0);
  // Hand the leftovers to the largest fractional parts first.
  const byFraction = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of byFraction) {
    if (remainder-- <= 0) break;
    counts[i] += 1;
  }
  return Object.fromEntries(SEVERITY_ORDER.map((s, i) => [s, counts[i]])) as Record<Severity, number>;
}

export type ReportDetail = {
  passed: number;
  counts: Record<Severity, number>;
  trend: { label: string; value: string; delta: Delta }[];
};

/** Everything the detail drawer shows, derived from the row so the drawer can
 *  never contradict the table it opened from.
 *  TODO(backend): replace with the stored run once the reports API exists. */
export function reportDetail(report: Report): ReportDetail {
  return {
    passed: report.records - report.errors,
    counts: severityCounts(report.errors),
    trend: [
      { label: "Quality Score", value: `${report.score}%`, delta: { text: "+1.2%", direction: "up", good: true } },
      { label: "Total Errors", value: report.errors.toLocaleString(), delta: { text: "−14", direction: "down", good: true } },
      { label: "Records", value: report.records.toLocaleString(), delta: { text: "+312", direction: "up", good: true } },
    ],
  };
}

export type WatchItem = { severity: Severity; text: string; autoFixable: boolean };

export type ReportInsights = {
  headline: string;
  summary: string;
  counts: Record<Severity, number>;
  wentWell: string[];
  watchOut: WatchItem[];
};

/** Findings specific enough to name rows and values only exist where we have
 *  them. Everything else falls back to the generic, count-derived list below
 *  rather than inventing detail that isn't in the run. */
const SPECIFIC_FINDINGS: Record<string, { wentWell: string[]; watchOut: WatchItem[] }> = {
  "RPT-0029": {
    wentWell: [
      "All employee IDs are unique and properly formatted",
      "Compensation data passed all currency and numeric checks",
      "98% of date fields are in the correct format",
    ],
    watchOut: [
      {
        severity: "critical",
        text: "3 workers have no manager assigned — this will break the org chart in Workday and must be fixed before you load",
        autoFixable: false,
      },
      {
        severity: "high",
        text: "11 pay group codes use an old naming convention ('BW-US' instead of 'Bi-Weekly US')",
        autoFixable: true,
      },
      { severity: "medium", text: "24 records have extra spaces in postal codes — harmless but messy", autoFixable: true },
      { severity: "low", text: "38 work email addresses are not lowercase", autoFixable: true },
    ],
  },
};

export function reportInsights(report: Report): ReportInsights {
  const counts = severityCounts(report.errors);
  const specific = SPECIFIC_FINDINGS[report.id];
  const { verdict } = scoreBand(report.score);

  return {
    headline:
      report.score >= 97
        ? "Your data is nearly go-live ready."
        : report.score >= 95
          ? "Your data needs a review before go-live."
          : "Your data needs work before go-live.",
    summary: `${report.score}% of your ${report.records.toLocaleString()} worker records cleared every Workday validation check. That means only ${report.errors.toLocaleString()} records need any attention at all — and most of those are minor formatting issues that can be fixed automatically.`,
    counts,
    // Generic fallbacks restate the run's own numbers; they never claim a
    // specific field or row we don't actually have.
    wentWell: specific?.wentWell ?? [
      `${(report.records - report.errors).toLocaleString()} of ${report.records.toLocaleString()} records cleared every rule`,
      `Overall quality score is ${report.score}% — ${verdict.toLowerCase()}`,
    ],
    watchOut:
      specific?.watchOut ??
      SEVERITY_ORDER.filter((s) => counts[s] > 0).map((s) => ({
        severity: s,
        text: `${counts[s].toLocaleString()} ${s} ${counts[s] === 1 ? "issue" : "issues"} — ${SEVERITY_CONSEQUENCE[s].toLowerCase()}`,
        autoFixable: s !== "critical",
      })),
  };
}
