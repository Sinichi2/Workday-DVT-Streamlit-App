"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Info, Pencil, RotateCw, Sparkles, Wand2, X } from "lucide-react";
import { Button } from "@/app/components/button/Button";
import { Delta, Panel } from "@/app/components/ui/Primitives";
import {
  DUMMY_DATA,
  SEVERITY_WORKDAY,
  type DashboardData,
  type Insight,
  type Severity,
} from "@/app/data/subscriber/subscriber.dashboard_data";

const DASHBOARD_ENDPOINT = "https://api.valigo.local/subscriber/dashboard";
const IS_DEV = process.env.NODE_ENV !== "production";

const SEV: Record<Severity, { bar: string; pill: string; text: string }> = {
  critical: { bar: "bg-critical", pill: "bg-critical-subtle text-critical-text", text: "text-critical-text" },
  high: { bar: "bg-high", pill: "bg-high-subtle text-high-text", text: "text-high-text" },
  medium: { bar: "bg-medium", pill: "bg-medium-subtle text-medium-text", text: "text-medium-text" },
  low: { bar: "bg-low", pill: "bg-low-subtle text-low-text", text: "text-low-text" },
};

const SEVERITIES = ["critical", "high", "medium", "low"] as const;

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: DashboardData; demo: boolean }
  | { status: "error"; message: string };

export default function SubscriberDashboard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async (signal?: AbortSignal) => {
    setState({ status: "loading" });
    try {
      const res = await fetch(DASHBOARD_ENDPOINT, { signal });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = (await res.json()) as DashboardData;
      setState({ status: "ready", data, demo: false });
    } catch (err) {
      if (signal?.aborted) return;
      // Backend not up yet. Dev: show dummy WITH a banner. Prod: honest error.
      if (IS_DEV) {
        setState({ status: "ready", data: DUMMY_DATA, demo: true });
      } else {
        setState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" });
      }
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-3xl font-semibold">Dashboard</h1>
      {state.status === "loading" && <SkeletonGrid />}
      {state.status === "error" && <ErrorCard message={state.message} onRetry={() => load()} />}
      {state.status === "ready" && <DashboardBody data={state.data} demo={state.demo} onRetry={() => load()} />}
    </div>
  );
}

function DashboardBody({ data, demo, onRetry }: { data: DashboardData; demo: boolean; onRetry: () => void }) {
  /** Which sparkle was clicked — a severity row, or the run as a whole.
   *  `null` = the AI Insights modal is closed. */
  const [scope, setScope] = useState<{ label: string; severity?: Severity } | null>(null);
  const crit = data.distribution.critical;

  useEffect(() => {
    if (!scope) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setScope(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scope]);

  return (
    <>
      {/* {demo && <DemoBanner onRetry={onRetry} className="mb-5" />} */}

      {/* Consequence-first: the blocking hard-stops lead, above the reassuring score. */}
      {/* {crit > 0 && (
        // <div
        //   role="alert"
        //   className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-critical/40 bg-critical-subtle px-4 py-3"
        // >
        //   <AlertTriangle size={18} className="text-critical-text" aria-hidden />
        //   <p className="flex-1 text-sm">
        //     <span className="font-semibold text-critical-text">
        //       {crit} critical {crit === 1 ? "error" : "errors"} will block the Workday load.
        //     </span>{" "}
        //     <span className="text-muted-foreground">Resolve the Hard Stops before go-live.</span>
        //   </p>
        //   <a
        //     href="#insights"
        //     className="rounded-lg border border-critical/50 px-3 py-1.5 text-xs font-medium text-critical-text hover:bg-critical/10"
        //   >
        //     Review required fixes
        //   </a>
        // </div>
      )} */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Data Quality Score */}
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-2">
            <Label>Data Quality Score</Label>
            <AiButton label="AI insights for this run" onClick={() => setScope({ label: "This run" })} />
          </div>
          <div className="pt-2 text-[60px] font-semibold leading-[1.05] text-success">{data.qualityScore}</div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
            <span className="text-xs text-muted-foreground-2">{data.recordsEvaluated}</span>
            <Delta delta={data.qualityDelta} />
          </div>

          {/* Distribution rides the same total as the breakdown card, so the two
              read as one number split four ways. */}
          <div className="mt-5 border-t border-border pt-3">
            <p className="text-[10px] uppercase leading-[15px] tracking-[0.25px] text-muted-foreground-2">
              Error Distribution · {data.errorTotal} total
            </p>
            <div className="mt-2 flex h-2 gap-px overflow-hidden rounded-full" aria-hidden>
              {SEVERITIES.map((s) => (
                <div
                  key={s}
                  className={SEV[s].bar}
                  style={{ width: `${(data.distribution[s] / data.errorTotal) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-[15px]">
              {SEVERITIES.map((s) => (
                <span key={s} className={SEV[s].text}>
                  {data.distribution[s]} {s === "medium" ? "med" : s}
                </span>
              ))}
            </div>
          </div>
        </Panel>

        {/* Stacked stats */}
        <Panel className="divide-y divide-border">
          {data.stats.map((s) => (
            <div key={s.label} className="flex items-start justify-between gap-4 px-5 py-[18px]">
              <div className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <Label>{s.label}</Label>
                  <InfoDot hint={s.hint} />
                </span>
                <div className="mt-1 text-sm text-muted-foreground">{s.sublabel}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xl font-semibold">{s.value}</div>
                <Delta delta={s.delta} className="mt-1" />
              </div>
            </div>
          ))}
        </Panel>

        {/* Error Breakdown by Severity */}
        <Panel>
          <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-5">
            <h2 className="text-sm font-semibold leading-5">Error Breakdown by Severity</h2>
            <span className="text-[10px] leading-[15px] text-muted-foreground-2">{data.errorTotal} total</span>
          </div>
          <div className="divide-y divide-border">
            {data.breakdown.map((b) => (
              <div key={b.severity} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`w-16 shrink-0 rounded px-2.5 py-0.5 text-center text-[11px] font-medium leading-[16.5px] ${SEV[b.severity].pill}`}
                  title={`Workday: ${SEVERITY_WORKDAY[b.severity]}`}
                >
                  {b.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    {/* Share of the run's total errors — same scale on every row. */}
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className={`h-full rounded-full ${SEV[b.severity].bar}`}
                        style={{ width: `${(b.count / data.errorTotal) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-xs font-semibold">{b.count}</span>
                  </div>
                  <p className="truncate pt-1 text-[11px] leading-[16.5px] text-muted-foreground-2" title={b.note}>
                    {b.note}
                  </p>
                </div>
                <AiButton
                  label={`AI insights for ${b.label.toLowerCase()} errors`}
                  onClick={() => setScope({ label: b.label, severity: b.severity })}
                />
              </div>
            ))}
          </div>
        </Panel>

        {/* AI Insights */}
        <Panel className="p-5" id="insights">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={17} className="text-accent-strong" aria-hidden />
            <h2 className="text-base font-semibold text-accent-strong">AI Insights</h2>
          </div>
          <div className="flex flex-col gap-3">
            {data.insights.map((ins) => (
              <InsightItem key={ins.title} insight={ins} />
            ))}
          </div>
        </Panel>
      </div>

      {scope && (
        <InsightsModal
          scope={scope.label}
          insights={scope.severity ? data.insights.filter((i) => i.severity === scope.severity) : data.insights}
          onClose={() => setScope(null)}
        />
      )}
    </>
  );
}

/** The sparkle from the design: a 24px icon button that opens AI Insights for
 *  whatever it sits on — the whole run, or one severity row. */
function AiButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground-2 transition-colors hover:bg-accent-subtle hover:text-accent-strong"
    >
      <Sparkles size={14} aria-hidden />
    </button>
  );
}

/** One AI suggestion + its fix actions. Shared by the AI Insights card and the
 *  modal the sparkles open, so both stay the same thing. */
function InsightItem({ insight }: { insight: Insight }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4">
      <div className="text-sm font-semibold">{insight.title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{insight.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {insight.actions.map((a) =>
          a === "ai" ? (
            <Button key={a} variant="ai">
              <Wand2 size={13} aria-hidden /> Fix with AI
            </Button>
          ) : (
            <Button key={a} variant="outline">
              <Pencil size={13} aria-hidden /> Fix Manually{a === "manual-required" && " (Required)"}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}

/** Same shell as the Reports AI Insights modal — one AI surface across the app. */
function InsightsModal({ scope, insights, onClose }: { scope: string; insights: Insight[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dash-insights-title"
        className="relative flex max-h-[85vh] w-full max-w-[576px] flex-col rounded-2xl border border-border-strong bg-surface shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent-strong" aria-hidden />
            <span id="dash-insights-title" className="text-xs font-semibold text-accent-strong">
              AI Insights
            </span>
            <span className="text-xs text-muted-foreground-2">· {scope}</span>
          </span>
          <button
            onClick={onClose}
            aria-label="Close insights"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground-2 hover:bg-surface-muted"
          >
            <X size={12} aria-hidden />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {insights.length ? (
            insights.map((i) => <InsightItem key={i.title} insight={i} />)
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing to fix here — no AI suggestions for {scope.toLowerCase()} errors.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase leading-4 tracking-[0.3px] text-muted-foreground-2">{children}</span>
  );
}

function InfoDot({ hint }: { hint: string }) {
  return (
    <button type="button" className="text-muted-foreground/70 hover:text-foreground" title={hint} aria-label={hint}>
      <Info size={12} aria-hidden />
    </button>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Panel className="flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle size={28} className="text-danger" aria-hidden />
      <div>
        <div className="text-base font-semibold">Couldn’t load the dashboard</div>
        <p className="mt-1 text-sm text-muted-foreground">{message}. Check your connection and try again.</p>
      </div>
      <Button variant="primary" onClick={onRetry}>
        <RotateCw size={14} aria-hidden /> Retry
      </Button>
    </Panel>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-busy="true" aria-label="Loading dashboard">
      {Array.from({ length: 4 }).map((_, i) => (
        <Panel key={i} className="p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-3 w-32 rounded bg-surface-muted" />
            <div className="h-10 w-40 rounded bg-surface-muted" />
            <div className="h-2 w-full rounded bg-surface-muted" />
            <div className="h-2 w-2/3 rounded bg-surface-muted" />
          </div>
        </Panel>
      ))}
    </div>
  );
}
