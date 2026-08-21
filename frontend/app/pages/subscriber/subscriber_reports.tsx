"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Download, FileText, Sparkles, X } from "lucide-react";
import { Code, Delta, Panel, Th } from "@/app/components/ui/Primitives";
import {
  SEVERITY_CONSEQUENCE,
  SEVERITY_ORDER,
  scoreBand,
  type Report,
} from "@/app/data/subscriber/subscriber.reports_data";
import type { Delta as DeltaT, Severity } from "@/app/data/subscriber/subscriber.dashboard_data";
import { api } from "@/app/lib/api";
import { reportError } from "@/app/lib/errors";

/** A run as `GET /runs` returns it. */
type RunRow = {
  id: string;
  source_name: string;
  status: string;
  total_rows: number;
  rows_passing: number;
  rows_failing: number;
  quality_score: string | number;
  created_at: string;
};

const toReport = (r: RunRow): Report => ({
  id: r.id,
  name: r.source_name,
  date: new Date(r.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }),
  records: r.total_rows,
  failingRows: r.rows_failing,
  score: Number(r.quality_score),
});

/** Severity → token classes. Literal strings so Tailwind can see every class. */
const SEV: Record<Severity, { label: string; tile: string; text: string; fill: string }> = {
  critical: { label: "Critical", tile: "bg-critical-subtle", text: "text-critical-text", fill: "bg-critical" },
  high: { label: "High", tile: "bg-high-subtle", text: "text-high-text", fill: "bg-high" },
  medium: { label: "Medium", tile: "bg-medium-subtle", text: "text-medium-text", fill: "bg-medium" },
  low: { label: "Low", tile: "bg-low-subtle", text: "text-low-text", fill: "bg-low" },
};

export default function SubscriberReports() {
  const [reports, setReports] = useState<Report[] | null>(null);
  /** The report whose detail drawer is open. */
  const [viewing, setViewing] = useState<Report | null>(null);
  /** The report whose AI Insights modal is open — stacks over the drawer. */
  const [explaining, setExplaining] = useState<Report | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Completed runs only — a run still in flight has no score to rank.
        const runs = await api.get<RunRow[]>("/runs?limit=200");
        setReports(runs.filter((r) => r.status === "complete").map(toReport));
      } catch (err: unknown) {
        reportError("subscriber/reports", err);
        setReports([]);
      }
    })();
  }, []);

  // One Esc handler for both overlays, closing the topmost first.
  useEffect(() => {
    if (!viewing && !explaining) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (explaining) setExplaining(null);
      else setViewing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing, explaining]);

  const list = reports ?? [];
  const average = list.length ? list.reduce((a, r) => a + r.score, 0) / list.length : 0;

  return (
    <div className="mx-auto w-full max-w-[845px] py-4 sm:py-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[22px] font-semibold leading-[33px]">Reports</h1>
        <button
          disabled
          title="Not available yet — export is still being built"
          className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        >
          Export All
        </button>
      </div>

      {/* Rolling summary across every run in the table below. Derived from those
          rows rather than fetched, so the two can never disagree. */}
      {list.length > 0 && (
        <Panel className="mt-8 flex flex-wrap items-center justify-between gap-6 p-5">
          <div>
            <p className="text-xs text-muted-foreground-2">
              Average Quality Score ({list.length} run{list.length === 1 ? "" : "s"})
            </p>
            <div className="flex items-end gap-2 pt-1">
              <span className="text-4xl font-semibold leading-10">{average.toFixed(1)}%</span>
            </div>
          </div>
          <dl className="flex gap-6">
            <SummaryStat
              value={list.reduce((a, r) => a + r.records, 0).toLocaleString()}
              label="Total records"
            />
            <SummaryStat
              value={list.reduce((a, r) => a + r.failingRows, 0).toLocaleString()}
              label="Failing rows"
            />
            <SummaryStat value={String(list.length)} label="Runs" />
          </dl>
        </Panel>
      )}

      <Panel className="mt-6 overflow-x-auto">
        <table className={`w-full min-w-[760px] border-collapse ${list.length ? "" : "hidden"}`}>
          <thead>
            <tr className="border-b border-border-strong">
              <Th className="px-4">Report ID</Th>
              <Th className="px-0">Name</Th>
              <Th className="px-0">Date</Th>
              <Th className="px-0">Records</Th>
              <Th className="px-0">Failing rows</Th>
              <Th className="px-0">Score</Th>
              <Th className="px-0"><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const band = scoreBand(r.score);
              return (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3.5">
                    <Code className="text-accent-strong" title={r.id}>
                      {r.id.slice(0, 8)}
                    </Code>
                  </td>
                  <td className="max-w-[150px] py-3.5 pr-4 text-xs font-medium">{r.name}</td>
                  <td className="py-3.5 pr-4 text-xs text-muted-foreground-2">{r.date}</td>
                  <td className="py-3.5 pr-4 text-xs text-muted-foreground">{r.records.toLocaleString()}</td>
                  <td className="py-3.5 pr-4 text-xs text-muted-foreground">{r.failingRows.toLocaleString()}</td>
                  <td className="py-3.5 pr-4">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                        <span className={`block h-full rounded-full ${band.fill}`} style={{ width: `${r.score}%` }} />
                      </span>
                      <span className={`text-xs font-semibold ${band.text}`}>{r.score}%</span>
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setExplaining(r)}
                        aria-label={`AI insights for ${r.name}`}
                        className="flex size-7 items-center justify-center rounded-md text-accent-strong hover:bg-accent-subtle"
                      >
                        <Sparkles size={14} aria-hidden />
                      </button>
                      <button
                        onClick={() => setViewing(r)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
                      >
                        View <ChevronRight size={12} aria-hidden />
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {reports && list.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            No completed runs yet. Validate a Workday extract and its report lands here.
          </p>
        )}
        {!reports && <p className="px-4 py-12 text-center text-sm text-muted-foreground-2">Loading…</p>}
      </Panel>

      {viewing && (
        <ReportDrawer
          report={viewing}
          previous={list[list.findIndex((r) => r.id === viewing.id) + 1]}
          onClose={() => setViewing(null)}
          onExplain={() => setExplaining(viewing)}
        />
      )}
      {explaining && <InsightsModal report={explaining} onClose={() => setExplaining(null)} />}
    </div>
  );
}

/** A trend row's value + delta. `flat` when nothing moved: an unchanged metric
 *  is neither good nor bad, and a green up-arrow would read as an improvement. */
function diff(now: number, before: number, unit: string, upIsGood: boolean): { delta: DeltaT } {
  const d = Math.round((now - before) * 10) / 10;
  if (d === 0) return { delta: { text: "unchanged", direction: "flat", good: true } };
  return {
    delta: {
      text: `${d > 0 ? "+" : "−"}${Math.abs(d).toLocaleString()}${unit}`,
      direction: d > 0 ? "up" : "down",
      good: d > 0 === upIsGood,
    },
  };
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="text-lg font-semibold leading-7">{value}</dd>
      <dt className="text-xs text-muted-foreground-2">{label}</dt>
    </div>
  );
}

// Detail drawer

function ReportDrawer({
  report,
  previous,
  onClose,
  onExplain,
}: {
  report: Report;
  /** The run before this one, for the trend rows. Absent on the first run. */
  previous?: Report;
  onClose: () => void;
  onExplain: () => void;
}) {
  const [counts, setCounts] = useState<Record<Severity, number> | null>(null);
  const band = scoreBand(report.score);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The real per-severity split, one request, only when a drawer opens —
        // fetching this for every table row would be a request per run.
        const findings = await api.get<{ severity: Severity }[]>(`/runs/${report.id}/findings?limit=10000`);
        if (cancelled) return;
        setCounts(
          SEVERITY_ORDER.reduce(
            (acc, sev) => ({ ...acc, [sev]: findings.filter((f) => f.severity === sev).length }),
            {} as Record<Severity, number>,
          ),
        );
      } catch (err: unknown) {
        reportError("subscriber/reports drawer", err);
        if (!cancelled) setCounts(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [report.id]);

  const total = counts ? SEVERITY_ORDER.reduce((a, s) => a + counts[s], 0) : 0;
  const trend: { label: string; value: string; delta: DeltaT }[] = previous
    ? [
        {
          label: "Quality score",
          value: `${report.score.toFixed(1)}%`,
          ...diff(report.score, previous.score, "%", true),
        },
        {
          label: "Failing rows",
          value: report.failingRows.toLocaleString(),
          ...diff(report.failingRows, previous.failingRows, "", false),
        },
        {
          label: "Records",
          value: report.records.toLocaleString(),
          ...diff(report.records, previous.records, "", true),
        },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-drawer-title"
        className="relative flex h-full w-full max-w-[576px] flex-col border-l border-border-strong bg-surface shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <Code className="text-accent-strong" title={report.id}>{report.id.slice(0, 8)}</Code>
            <h2 id="report-drawer-title" className="pt-1 text-base font-semibold">
              {report.name}
            </h2>
            <p className="pt-0.5 text-xs text-muted-foreground-2">{report.date}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${SEV.low.tile} ${band.text}`}>
              {report.score}%
            </span>
            <button
              onClick={onClose}
              aria-label="Close report"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground-2 hover:bg-surface-muted"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Records" value={report.records.toLocaleString()} />
            <StatTile label="Findings" value={counts ? total.toLocaleString() : "…"} />
            <StatTile
              label="Passed"
              value={(report.records - report.failingRows).toLocaleString()}
            />
          </div>

          <h3 className="pt-6 text-xs font-semibold uppercase tracking-[0.3px] text-muted-foreground-2">
            Error Breakdown
          </h3>
          <div className="mt-3 rounded-xl border border-border">
            {SEVERITY_ORDER.map((s) => (
              <div key={s} className="flex items-center gap-4 border-b border-surface-muted px-4 py-3 last:border-0">
                <span className={`w-16 shrink-0 rounded px-2 py-0.5 text-center text-[11px] font-medium ${SEV[s].tile} ${SEV[s].text}`}>
                  {SEV[s].label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {/* Bars are each severity's share of this run's error total,
                        so their lengths add up to the whole bar width. */}
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                      <span
                        className={`block h-full rounded-full ${SEV[s].fill}`}
                        style={{ width: total ? `${((counts?.[s] ?? 0) / total) * 100}%` : "0%" }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right text-xs font-semibold">
                      {counts ? counts[s] : "—"}
                    </span>
                  </div>
                  <p className="pt-1 text-[11px] text-muted-foreground-2">{SEVERITY_CONSEQUENCE[s]}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="pt-6 text-xs font-semibold uppercase tracking-[0.3px] text-muted-foreground-2">
            Trend vs Previous Run
          </h3>
          {trend.length === 0 && (
            <p className="pt-2 text-xs text-muted-foreground-2">
              Nothing to compare against — this is the first run.
            </p>
          )}
          <div className="mt-1">
            {trend.map((t) => (
              <div key={t.label} className="flex items-center justify-between border-b border-surface-muted py-2 last:border-0">
                <span className="text-xs text-muted-foreground">{t.label}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs font-semibold">{t.value}</span>
                  <Delta delta={t.delta} className="text-[11px]" />
                </span>
              </div>
            ))}
          </div>
        </div>

        <footer className="border-t border-border px-4 py-4 sm:px-6">
          <button
            disabled
            title="Not available yet — export is still being built"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-accent-foreground hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} aria-hidden /> Download Workday File (.csv)
          </button>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onExplain}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-strong px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
            >
              <Sparkles size={14} aria-hidden /> AI Insights
            </button>
            <button
              disabled
              title="Not available yet — export is still being built"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-strong px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <FileText size={14} aria-hidden /> Download Report
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.25px] text-muted-foreground-2">{label}</p>
      <p className="pt-1 text-xl font-semibold leading-7">{value}</p>
    </div>
  );
}

// AI Insights modal

function InsightsModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const band = scoreBand(report.score);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insights-title"
        className="relative flex max-h-[85vh] w-full max-w-[576px] flex-col rounded-2xl border border-border-strong bg-surface shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent-strong" aria-hidden />
            <span className="text-xs font-semibold text-accent-strong">AI Insights</span>
            <span className="text-xs text-muted-foreground-2">· {report.date}</span>
          </span>
          <button
            onClick={onClose}
            aria-label="Close insights"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground-2 hover:bg-surface-muted"
          >
            <X size={12} aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-start justify-between gap-4">
            <h2 id="insights-title" className="text-sm font-semibold leading-[19.25px]">
              {report.name}
            </h2>
            <div className="shrink-0 text-right">
              <div className={`text-lg font-semibold leading-7 ${band.text}`}>{report.score.toFixed(1)}%</div>
              <div className={`text-[10px] font-semibold ${band.text}`}>{band.verdict}</div>
            </div>
          </div>

          {/* Written by the validation agent once it lands. Anything else here
              would be a narrative invented from the score. */}
          <p className="py-10 text-center text-sm text-muted-foreground">
            No suggestions for this run yet. Insights appear here once the validation agent has reviewed the
            findings.
          </p>
        </div>
      </div>
    </div>
  );
}
