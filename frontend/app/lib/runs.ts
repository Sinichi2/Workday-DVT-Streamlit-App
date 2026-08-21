"use client";

import { api, fileForm } from "@/app/lib/api";
import type { Finding, ValidationRun } from "@/app/data/subscriber/subscriber.workflow_data";

/** Record the run and store the source before the engine sees the file, so a
 *  crash mid-validation still leaves an auditable row pointing at the exact
 *  input that caused it. */
export async function createRun(workspaceId: string, _userId: string, file: File) {
  const run = await api.post<{ id: string }>("/runs", {
    workspace_id: workspaceId,
    source_name: file.name,
  });
  const { path } = await api.upload<{ path: string }>(
    `/runs/${run.id}/source`,
    fileForm({ workspace_id: workspaceId, file }),
  );
  return { id: run.id, path };
}

/** `quality_score` is a generated column — the database derives it from these
 *  counts, so it cannot disagree with the findings stored beside it. */
export async function completeRun(runId: string, run: ValidationRun, rulesUsed: string) {
  await api.post(`/runs/${runId}/complete`, {
    rules_used: rulesUsed,
    total_rows: run.records,
    rows_passing: run.passed,
    rows_failing: Math.max(0, run.records - run.passed),
    findings: run.findings.map((f: Finding) => ({
      row_num: f.row,
      field: f.field,
      current_value: f.value,
      issue: f.issue,
      severity: f.severity,
      suggested_fix: f.fix || null,
    })),
  });
}

export async function failRun(runId: string, message: string) {
  await api.post(`/runs/${runId}/fail`, { message });
}

export async function saveFixes(runId: string, edits: { row: number; field: string; value: string }[]) {
  await api.post(
    `/runs/${runId}/fixes`,
    edits.map((e) => ({ row_num: e.row, field: e.field, value: e.value })),
  );
}

/** Private bucket: readable only through a short-lived signed URL. */
export async function sourceUrl(path: string) {
  const { url } = await api.get<{ url: string }>(`/storage/source-url?path=${encodeURIComponent(path)}`);
  return url;
}
