/** Engine `/validate` response -> the shape the Validate screen already renders.
 *
 *  The engine flags ROWS and names the rules each row tripped; the table shows
 *  one line per FIELD problem. This file is that fan-out, and it is the only
 *  real logic in the wiring — hence findings.test.ts next door. */
import type { Severity } from "@/app/data/subscriber/subscriber.dashboard_data";
import type { Finding, ValidationRun } from "@/app/data/subscriber/subscriber.workflow_data";

export type ValidateResponse = {
  summary: { total_rows: number; rows_passing: number; rows_failing: number; validations_run: number };
  findings: Record<string, string | number | null>[];
  rules: Record<string, { field: string; description: string; severity: string }>;
  columns: string[];
  rules_used?: string;
};

/** The engine speaks Workday's three tiers; the UI has four. "high" stays empty
 *  rather than inventing a split the rule book doesn't make. */
const SEVERITY_OF: Record<string, Severity> = {
  "Hard Stop": "critical",
  "Soft Warning": "medium",
  Info: "low",
};

/** `_errors` is "R001(Hard Stop); R014(Soft Warning)" — one row can trip several
 *  rules. Rule ids may themselves contain no parens, so anchor on the last pair. */
export function parseErrors(errors: string): { ruleId: string; severity: string }[] {
  return errors
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((tag) => {
      const m = /^(.*)\(([^()]*)\)$/.exec(tag);
      return m ? { ruleId: m[1].trim(), severity: m[2].trim() } : { ruleId: tag, severity: "" };
    });
}

export function toRun(res: ValidateResponse): ValidationRun {
  const findings: Finding[] = [];
  for (const row of res.findings) {
    for (const { ruleId, severity } of parseErrors(String(row._errors ?? ""))) {
      const rule = res.rules[ruleId];
      // An unknown id still becomes a visible finding — silently dropping it
      // would under-report the failure count the summary already states.
      const field = rule?.field ?? ruleId;
      const raw = row[field];
      findings.push({
        row: Number(row._row ?? 0),
        field,
        value: raw === null || raw === undefined || raw === "" ? null : String(raw),
        issue: rule?.description ?? `Failed rule ${ruleId}`,
        severity: SEVERITY_OF[rule?.severity ?? severity] ?? "low",
        // The engine validates; it does not propose remediations.
        fix: "",
      });
    }
  }

  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.severity]++;

  const { total_rows, rows_passing, validations_run } = res.summary;
  return {
    records: total_rows,
    fields: res.columns.length,
    rules: validations_run,
    qualityScore: total_rows ? `${((rows_passing / total_rows) * 100).toFixed(1)}%` : "—",
    passed: rows_passing,
    counts,
    aiSummary:
      `${findings.length} finding(s) across ${total_rows - rows_passing} failing row(s). ` +
      `${counts.critical} are Workday hard stops and must be fixed before load.`,
    // No auto-fix service exists — the engine's transforms already ran.
    autoFixable: 0,
    manualFixes: findings.length,
    findings,
  };
}
