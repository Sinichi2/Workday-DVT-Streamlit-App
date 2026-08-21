"use client";

import { supabase } from "@/app/lib/supabase";
import type { Finding } from "@/app/data/subscriber/subscriber.workflow_data";
import type { ValidationRun } from "@/app/data/subscriber/subscriber.workflow_data";

const BUCKET = "source-files";

/** Upload the source extract, then record the run that used it.
 *
 *  Object key is `<workspace>/<run>/<filename>` — the storage policy reads the
 *  first segment to decide access, so the key layout IS the authorisation
 *  model. Changing it changes who can read the file. */
export async function createRun(workspaceId: string, userId: string, file: File) {
  const { data: run, error } = await supabase
    .from("runs")
    .insert({ workspace_id: workspaceId, created_by: userId, source_name: file.name, status: "running" })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const path = `${workspaceId}/${run.id}/${file.name}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (upErr) {
    // The row would otherwise sit "running" forever pointing at nothing.
    await supabase.from("runs").update({ status: "failed", error_message: upErr.message }).eq("id", run.id);
    throw new Error(`Upload failed: ${upErr.message}`);
  }

  await supabase.from("runs").update({ source_path: path }).eq("id", run.id);
  return { id: run.id as string, path };
}

/** Write the engine's verdict and its findings. `quality_score` is a generated
 *  column — the database derives it from these counts, so it cannot disagree
 *  with the findings stored beside it. */
export async function completeRun(runId: string, run: ValidationRun, rulesUsed: string) {
  const { error } = await supabase
    .from("runs")
    .update({
      status: "complete",
      rules_used: rulesUsed,
      total_rows: run.records,
      rows_passing: run.passed,
      rows_failing: Math.max(0, run.records - run.passed),
    })
    .eq("id", runId);
  if (error) throw new Error(error.message);

  if (run.findings.length === 0) return;
  const rows = run.findings.map((f: Finding) => ({
    run_id: runId,
    row_num: f.row,
    field: f.field,
    current_value: f.value,
    issue: f.issue,
    severity: f.severity,
    suggested_fix: f.fix || null,
  }));
  const { error: fErr } = await supabase.from("findings").insert(rows);
  if (fErr) throw new Error(fErr.message);
}

export async function failRun(runId: string, message: string) {
  await supabase.from("runs").update({ status: "failed", error_message: message }).eq("id", runId);
}

/** Persist manual corrections from the Fix Manually screen. */
export async function saveFixes(runId: string, edits: { row: number; field: string; value: string }[], userId: string) {
  const now = new Date().toISOString();
  for (const e of edits) {
    const { error } = await supabase
      .from("findings")
      .update({ fixed_value: e.value, fixed_at: now, fixed_by: userId })
      .eq("run_id", runId)
      .eq("row_num", e.row)
      .eq("field", e.field);
    if (error) throw new Error(error.message);
  }
}

/** A signed URL is the only way to read from the private bucket. Short-lived on
 *  purpose: these are HR extracts, not public assets. */
export async function sourceUrl(path: string, seconds = 60) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
