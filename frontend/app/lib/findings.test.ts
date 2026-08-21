// Run: node --test app/lib/findings.test.ts   (node strips the types itself)
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseErrors, toRun, type ValidateResponse } from "./findings.ts";

test("parseErrors splits multi-rule rows and keeps ids with dashes", () => {
  assert.deepEqual(parseErrors("R001(Hard Stop); WD-14(Soft Warning)"), [
    { ruleId: "R001", severity: "Hard Stop" },
    { ruleId: "WD-14", severity: "Soft Warning" },
  ]);
  assert.deepEqual(parseErrors(""), []);
  assert.deepEqual(parseErrors("BARE"), [{ ruleId: "BARE", severity: "" }]);
});

test("toRun fans one row out to one finding per rule, and counts by severity", () => {
  const res: ValidateResponse = {
    summary: { total_rows: 10, rows_passing: 8, rows_failing: 2, validations_run: 3 },
    columns: ["Manager_ID", "Pay_Group"],
    rules: {
      R001: { field: "Manager_ID", description: "Manager is required", severity: "Hard Stop" },
      R002: { field: "Pay_Group", description: "Unknown pay group", severity: "Soft Warning" },
    },
    findings: [
      { _row: 42, _errors: "R001(Hard Stop); R002(Soft Warning)", Manager_ID: "", Pay_Group: "BW-US" },
    ],
  };
  const run = toRun(res);

  assert.equal(run.findings.length, 2);
  assert.equal(run.counts.critical, 1);
  assert.equal(run.counts.medium, 1);
  assert.equal(run.qualityScore, "80.0%");
  assert.equal(run.fields, 2);

  // Empty cell must surface as null — the table renders that as italic "empty",
  // where "" would render as nothing at all.
  assert.equal(run.findings[0].value, null);
  assert.equal(run.findings[0].row, 42);
  assert.equal(run.findings[1].value, "BW-US");
});

test("toRun keeps unknown rule ids visible instead of dropping the finding", () => {
  const run = toRun({
    summary: { total_rows: 1, rows_passing: 0, rows_failing: 1, validations_run: 1 },
    columns: ["A"],
    rules: {},
    findings: [{ _row: 1, _errors: "GHOST(Info)", A: "x" }],
  });
  assert.equal(run.findings.length, 1);
  assert.equal(run.findings[0].severity, "low");
  assert.match(run.findings[0].issue, /GHOST/);
});

test("toRun survives a zero-row result without dividing by zero", () => {
  const run = toRun({
    summary: { total_rows: 0, rows_passing: 0, rows_failing: 0, validations_run: 0 },
    columns: [],
    rules: {},
    findings: [],
  });
  assert.equal(run.qualityScore, "—");
  assert.equal(run.findings.length, 0);
});
