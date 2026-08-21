"use client";

import { useEffect, useState } from "react";
import { Code, Panel } from "@/app/components/ui/Primitives";
import { supabase } from "@/app/lib/supabase";

type Row = {
  id: string;
  source_name: string;
  status: string;
  total_rows: number;
  rows_failing: number;
  quality_score: number;
  created_at: string;
  workspaces: { name: string } | null;
};

/** Every run on the platform, newest first. The subscriber Reports page shows
 *  one workspace; this is the same data with the tenant column put back. */
export default function AdminReports() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("runs")
        .select("id, source_name, status, total_rows, rows_failing, quality_score, created_at, workspaces(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) setError(error.message);
      else setRows((data as unknown as Row[]) ?? []);
    })();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1024px] px-4 py-6 sm:px-8">
      <h1 className="text-[22px] font-semibold leading-[33px]">All reports</h1>
      <p className="pt-1 text-sm text-muted-foreground">Validation runs across every workspace.</p>

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-critical-subtle px-4 py-3 text-xs font-medium text-critical-text">
          {error}
        </p>
      )}

      <Panel className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border-strong text-xs font-medium text-muted-foreground-2">
              <th scope="col" className="px-5 py-3 font-medium">Run</th>
              <th scope="col" className="py-3 pr-4 font-medium">Workspace</th>
              <th scope="col" className="py-3 pr-4 font-medium">Date</th>
              <th scope="col" className="py-3 pr-4 font-medium">Records</th>
              <th scope="col" className="py-3 pr-4 font-medium">Failing</th>
              <th scope="col" className="px-5 py-3 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <span className="block truncate text-sm">{r.source_name}</span>
                  <Code className="text-muted-foreground-2">{r.id.slice(0, 8)}</Code>
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">{r.workspaces?.name ?? "—"}</td>
                <td className="py-3 pr-4 text-xs text-muted-foreground-2">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 pr-4 text-xs">{r.total_rows.toLocaleString()}</td>
                <td className="py-3 pr-4 text-xs">{r.rows_failing.toLocaleString()}</td>
                <td className="px-5 py-3">
                  <span
                    className={`text-sm font-semibold ${
                      Number(r.quality_score) >= 95 ? "text-success-text" : "text-high-text"
                    }`}
                  >
                    {Number(r.quality_score).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows?.length === 0 && (
          <p className="px-5 py-10 text-center text-xs text-muted-foreground-2">No runs recorded yet.</p>
        )}
        {!rows && !error && <p className="px-5 py-10 text-center text-xs text-muted-foreground-2">Loading…</p>}
      </Panel>
    </div>
  );
}
