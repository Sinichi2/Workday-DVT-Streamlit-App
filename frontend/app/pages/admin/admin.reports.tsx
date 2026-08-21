"use client";

import { useEffect, useState } from "react";
import { Bar, DetailHead, Empty, Facts, Frame, Row, Split, type AdminPageProps } from "@/app/components/admin/Workbench";
import { api } from "@/app/lib/api";
import { reportError } from "@/app/lib/errors";

type Run = {
  id: string;
  source_name: string;
  source_path: string | null;
  status: string;
  total_rows: number;
  rows_passing: number;
  rows_failing: number;
  quality_score: number;
  rules_used: string;
  created_at: string;
  workspaces: { name: string } | null;
  profiles: { email: string } | null;
};

type Finding = { id: string; row_num: number; field: string; severity: string; issue: string };

const SEV_TONE: Record<string, string> = {
  critical: "text-critical-text",
  high: "text-high-text",
  medium: "text-medium-text",
  low: "text-muted-foreground-2",
};

/** Every run on the platform. Selecting one loads its findings, so a support
 *  question about a specific run can be answered here rather than by asking
 *  the customer to read their screen out. */
export default function AdminReports({ account, onOpenNav }: AdminPageProps) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [open, setOpen] = useState<Run | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setRuns(await api.get<Run[]>("/runs?limit=200"));
      } catch (err: unknown) {
        reportError("admin/reports", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!open) {
      setFindings(null);
      return;
    }
    let cancelled = false;
    setFindings(null);
    (async () => {
      try {
        const f = await api.get<Finding[]>(`/runs/${open.id}/findings?limit=50`);
        if (!cancelled) setFindings(f);
      } catch {
        if (!cancelled) setFindings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const list = runs ?? [];

  return (
    <div className="-mx-4 -mt-2 sm:-mx-6 lg:-mx-8">
      <Bar account={account} onOpenNav={onOpenNav} section="Admin" title="Runs" stats={[["total", list.length]]} />


      <Split
        list={
          <Frame>
            <div className="flex items-center justify-between border-b border-border-strong px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground-2">
                All workspaces
              </span>
              <span className="text-[11px] text-muted-foreground-2">{list.length}</span>
            </div>
            {list.map((r) => (
              <Row key={r.id} selected={open?.id === r.id} onClick={() => setOpen(r)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{r.source_name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground-2">
                    {r.workspaces?.name ?? "—"}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground-2">
                  {r.total_rows.toLocaleString()} rows
                </span>
                <span
                  className={`shrink-0 font-mono text-[11px] ${
                    Number(r.quality_score) >= 95 ? "text-success-text" : "text-high-text"
                  }`}
                >
                  {Number(r.quality_score).toFixed(1)}%
                </span>
              </Row>
            ))}
            {runs && list.length === 0 && (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground-2">No runs recorded yet.</p>
            )}
            {!runs && <p className="px-4 py-10 text-center text-xs text-muted-foreground-2">Loading…</p>}
          </Frame>
        }
        detail={
          !open ? (
            <Empty>Select a run to see its findings.</Empty>
          ) : (
            <div className="flex flex-col gap-4">
              <Frame>
                <DetailHead label={`Run · ${open.status}`} title={open.source_name} />
                <Facts
                  rows={[
                    ["Workspace", open.workspaces?.name ?? "—"],
                    ["Started by", <span key="b" className="font-mono">{open.profiles?.email ?? "—"}</span>],
                    ["When", new Date(open.created_at).toLocaleString()],
                    ["Rows", `${open.rows_passing.toLocaleString()} passed / ${open.total_rows.toLocaleString()}`],
                    ["Failing", open.rows_failing.toLocaleString()],
                    ["Score", `${Number(open.quality_score).toFixed(1)}%`],
                    ["Rule set", <span key="r" className="font-mono text-[11px]">{open.rules_used}</span>],
                    ["Run ID", <span key="i" className="font-mono text-[11px]">{open.id.slice(0, 18)}…</span>],
                  ]}
                />
              </Frame>

              <Frame>
                <DetailHead label="Findings" title={`${findings?.length ?? 0} shown`} />
                <div className="max-h-[380px] overflow-y-auto">
                  {(findings ?? []).map((f) => (
                    <div key={f.id} className="flex items-start gap-2.5 border-b border-border px-4 py-2 last:border-0">
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground-2">{f.row_num}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[11px]">{f.field}</span>
                        <span className="block text-[11px] text-muted-foreground">{f.issue}</span>
                      </span>
                      <span className={`shrink-0 text-[10px] font-semibold uppercase ${SEV_TONE[f.severity] ?? ""}`}>
                        {f.severity}
                      </span>
                    </div>
                  ))}
                  {findings && findings.length === 0 && (
                    <p className="px-4 py-8 text-center text-xs text-muted-foreground-2">No findings on this run.</p>
                  )}
                  {!findings && <p className="px-4 py-8 text-center text-xs text-muted-foreground-2">Loading…</p>}
                </div>
              </Frame>
            </div>
          )
        }
      />
    </div>
  );
}
