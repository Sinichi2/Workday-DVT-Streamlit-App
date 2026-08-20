"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Download, FileText, Pencil, Sparkles, Wand2, X } from "lucide-react";
import { DemoBanner } from "@/app/components/banner/DemoBanner";
import { Code, Delta, Panel, Th } from "@/app/components/ui/Primitives";
import {
  DUMMY_REPORTS,
  DUMMY_SUMMARY,
  SEVERITY_CONSEQUENCE,
  SEVERITY_ORDER,
  reportDetail,
  reportInsights,
  scoreBand,
  type Report,
} from "@/app/data/subscriber/subscriber.reports_data";
import type { Severity } from "@/app/data/subscriber/subscriber.dashboard_data";

// TODO(backend): list, detail and insights should all come from the reports API.
// Until then these are seeded runs, flagged by the demo banner.
const IS_DEV = process.env.NODE_ENV !== "production";

/** Severity → token classes. Literal strings so Tailwind can see every class. */
const SEV: Record<Severity, { label: string; tile: string; text: string; fill: string }> = {
  critical: { label: "Critical", tile: "bg-critical-subtle", text: "text-critical-text", fill: "bg-critical" },
  high: { label: "High", tile: "bg-high-subtle", text: "text-high-text", fill: "bg-high" },
  medium: { label: "Medium", tile: "bg-medium-subtle", text: "text-medium-text", fill: "bg-medium" },
  low: { label: "Low", tile: "bg-low-subtle", text: "text-low-text", fill: "bg-low" },
};

export default function SubscriberReports() {
  /** The report whose detail drawer is open. */
  const [viewing, setViewing] = useState<Report | null>(null);
  /** The report whose AI Insights modal is open — stacks over the drawer. */
  const [explaining, setExplaining] = useState<Report | null>(null);

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

  return (
    <div className="mx-auto w-full max-w-[845px] py-4 sm:py-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[22px] font-semibold leading-[33px]">Reports</h1>
        <button className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-muted">
          Export All
        </button>
      </div>

      {IS_DEV && <DemoBanner className="mt-6" />}

      {/* Rolling summary across every run in the table below. */}
      <Panel className="mt-8 flex flex-wrap items-center justify-between gap-6 p-5">
        <div>
          <p className="text-xs text-muted-foreground-2">
            Average Quality Score (last {DUMMY_SUMMARY.runs} runs)
          </p>
          <div className="flex items-end gap-2 pt-1">
            <span className="text-4xl font-semibold leading-10">{DUMMY_SUMMARY.averageScore}</span>
            <Delta delta={DUMMY_SUMMARY.delta} className="pb-1.5" />
          </div>
        </div>
        <dl className="flex gap-6">
          <SummaryStat value={DUMMY_SUMMARY.records.toLocaleString()} label="Total records" />
          <SummaryStat value={DUMMY_SUMMARY.errors.toLocaleString()} label="Total errors" />
          <SummaryStat value={String(DUMMY_SUMMARY.runs)} label="Runs" />
        </dl>
      </Panel>

      <Panel className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-border-strong">
              <Th className="px-4">Report ID</Th>
              <Th className="px-0">Name</Th>
              <Th className="px-0">Date</Th>
              <Th className="px-0">Records</Th>
              <Th className="px-0">Errors</Th>
              <Th className="px-0">Score</Th>
              <Th className="px-0"><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody>
            {DUMMY_REPORTS.map((r) => {
              const band = scoreBand(r.score);
              return (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3.5">
                    <Code className="text-accent-strong">{r.id}</Code>
                  </td>
                  <td className="max-w-[150px] py-3.5 pr-4 text-xs font-medium">{r.name}</td>
                  <td className="py-3.5 pr-4 text-xs text-muted-foreground-2">{r.date}</td>
                  <td className="py-3.5 pr-4 text-xs text-muted-foreground">{r.records.toLocaleString()}</td>
                  <td className="py-3.5 pr-4 text-xs text-muted-foreground">{r.errors.toLocaleString()}</td>
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
      </Panel>

      {viewing && (
        <ReportDrawer
          report={viewing}
          onClose={() => setViewing(null)}
          onExplain={() => setExplaining(viewing)}
        />
      )}
      {explaining && <InsightsModal report={explaining} onClose={() => setExplaining(null)} />}
    </div>
  );
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
  onClose,
  onExplain,
}: {
  report: Report;
  onClose: () => void;
  onExplain: () => void;
}) {
  const detail = reportDetail(report);
  const band = scoreBand(report.score);

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
            <Code className="text-accent-strong">{report.id}</Code>
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
            <StatTile label="Errors" value={report.errors.toLocaleString()} />
            <StatTile label="Passed" value={detail.passed.toLocaleString()} />
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
                        style={{ width: report.errors ? `${(detail.counts[s] / report.errors) * 100}%` : "0%" }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right text-xs font-semibold">{detail.counts[s]}</span>
                  </div>
                  <p className="pt-1 text-[11px] text-muted-foreground-2">{SEVERITY_CONSEQUENCE[s]}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="pt-6 text-xs font-semibold uppercase tracking-[0.3px] text-muted-foreground-2">
            Trend vs Previous Run
          </h3>
          <div className="mt-1">
            {detail.trend.map((t) => (
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
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-accent-foreground hover:brightness-95">
            <Download size={16} aria-hidden /> Download Workday File (.csv)
          </button>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onExplain}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-strong px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
            >
              <Sparkles size={14} aria-hidden /> AI Insights
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-strong px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-muted">
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
  const insights = reportInsights(report);
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
              {insights.headline}
            </h2>
            <div className="shrink-0 text-right">
              <div className={`text-lg font-semibold leading-7 ${band.text}`}>{report.score}%</div>
              <div className={`text-[10px] font-semibold ${band.text}`}>{band.verdict}</div>
            </div>
          </div>

          <p className="pt-4 text-xs leading-[19.5px] text-muted-foreground">{insights.summary}</p>

          <div className="grid grid-cols-2 gap-1.5 pt-4 sm:grid-cols-4">
            {SEVERITY_ORDER.map((s) => (
              <div key={s} className={`rounded-lg p-2 text-center ${SEV[s].tile}`}>
                <div className={`text-base font-semibold leading-6 ${SEV[s].text}`}>{insights.counts[s]}</div>
                <div className={`text-[9px] font-medium ${SEV[s].text}`}>{SEV[s].label}</div>
              </div>
            ))}
          </div>

          <h3 className="pt-4 text-[10px] font-semibold uppercase tracking-[0.25px] text-success-text">
            What went well
          </h3>
          <ul className="pt-1.5">
            {insights.wentWell.map((item) => (
              <li key={item} className="flex gap-1.5 pt-1 text-xs text-muted-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <h3 className="pt-4 text-[10px] font-semibold uppercase tracking-[0.25px] text-high-text">
            Watch out for
          </h3>
          <ul className="flex flex-col gap-2 pt-2">
            {insights.watchOut.map((item) => (
              <li key={item.text} className="rounded-lg bg-background px-3 py-2.5">
                <p className="flex gap-1.5 text-xs leading-4 text-muted-foreground">
                  <span className={`mt-1.5 size-1 shrink-0 rounded-full ${SEV[item.severity].fill}`} aria-hidden />
                  {item.text}
                </p>
                <div className="flex gap-2 pt-2">
                  {/* Only offer "Fix with AI" where a transform can actually do
                      it — a critical missing value needs a human decision. */}
                  {item.autoFixable && (
                    <button className="inline-flex items-center gap-1.5 rounded-md bg-accent-subtle px-2.5 py-1 text-[11px] font-medium text-accent-strong hover:brightness-95">
                      <Wand2 size={12} aria-hidden /> Fix with AI
                    </button>
                  )}
                  <button className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-surface-muted">
                    <Pencil size={12} aria-hidden /> Fix Manually
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
