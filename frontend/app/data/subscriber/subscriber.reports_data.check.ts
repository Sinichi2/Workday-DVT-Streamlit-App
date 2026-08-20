/** Self-check for the error-breakdown split. Run: `bun app/data/subscriber/subscriber.reports_data.check.ts`
 *  The one rule that matters: the parts must always add back up to the total. */
import assert from "node:assert/strict";
import { DUMMY_REPORTS, severityCounts } from "@/app/data/subscriber/subscriber.reports_data";

// The Figma reference run splits exactly, with no remainder to hand out.
assert.deepEqual(severityCounts(76), { critical: 3, high: 11, medium: 24, low: 38 });

// Every seeded run — and every awkward total — must still sum to the headline.
for (const errors of [...DUMMY_REPORTS.map((r) => r.errors), 0, 1, 2, 5, 7, 99, 1000]) {
  const counts = severityCounts(errors);
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(sum, errors, `split of ${errors} summed to ${sum}`);
  assert.ok(Object.values(counts).every((c) => c >= 0), `negative count for ${errors}`);
}

console.log("severityCounts: ok");
