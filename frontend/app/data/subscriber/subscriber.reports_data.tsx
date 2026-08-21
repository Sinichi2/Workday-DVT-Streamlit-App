import type { Severity } from "@/app/data/subscriber/subscriber.dashboard_data";

/** One completed validation run, as the Reports table shows it. Sourced from
 *  `GET /runs` — every number here is stored, none derived from a sample mix. */
export type Report = {
  id: string;
  name: string;
  date: string;
  /** Rows in the source file. */
  records: number;
  /** Rows carrying at least one rule failure. The per-severity split needs the
   *  findings themselves, so the drawer fetches them; the list does not. */
  failingRows: number;
  /** Percentage of records that cleared every rule, e.g. 97.3. */
  score: number;
};

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
