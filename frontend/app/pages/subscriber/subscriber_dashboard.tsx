"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Info, Pencil, RotateCw, Sparkles, Wand2 } from "lucide-react";
import { Card } from "@/app/components/card/Card";
import { Button } from "@/app/components/button/Button";
import { DemoBanner } from "@/app/components/banner/DemoBanner";
import { Delta } from "@/app/components/ui/Primitives";
import {
  DUMMY_DATA,
  SEVERITY_WORKDAY,
  type DashboardData,
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
  // Guard against an empty breakdown from the real API (Math.max() = -Infinity).
  const maxCount = data.breakdown.length ? Math.max(...data.breakdown.map((b) => b.count)) : 1;
  const crit = data.distribution.critical;

  return (
    <>
      {demo && <DemoBanner onRetry={onRetry} className="mb-5" />}

      {/* Consequence-first: the blocking hard-stops lead, above the reassuring score. */}
      {crit > 0 && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-critical/40 bg-critical-subtle px-4 py-3"
        >
          <AlertTriangle size={18} className="text-critical-text" aria-hidden />
          <p className="flex-1 text-sm">
            <span className="font-semibold text-critical-text">
              {crit} critical {crit === 1 ? "error" : "errors"} will block the Workday load.
            </span>{" "}
            <span className="text-muted-foreground">Resolve the Hard Stops before go-live.</span>
          </p>
          <a
            href="#insights"
            className="rounded-lg border border-critical/50 px-3 py-1.5 text-xs font-medium text-critical-text hover:bg-critical/10"
          >
            Review required fixes
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Data Quality Score */}
        <Card className="p-5">
          <Label>Data Quality Score</Label>
          <div className="mt-3 text-6xl font-bold text-success">{data.qualityScore}</div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">{data.recordsEvaluated}</span>
            <Delta delta={data.qualityDelta} />
          </div>

          <div className="mt-6">
            <Label>Error Distribution</Label>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
              {(Object.keys(data.distribution) as Severity[]).map((s) => (
                <div
                  key={s}
                  className={SEV[s].bar}
                  style={{ width: `${(data.distribution[s] / data.errorTotal) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs">
              {(Object.keys(data.distribution) as Severity[]).map((s) => (
                <span key={s} className={SEV[s].text}>
                  {data.distribution[s]} {s === "medium" ? "med" : s}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Stacked stats */}
        <Card className="divide-y divide-border">
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
        </Card>

        {/* Error Breakdown by Severity */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Error Breakdown by Severity</h2>
            <span className="text-xs text-muted-foreground">{data.errorTotal} total</span>
          </div>
          <div className="flex flex-col gap-4">
            {data.breakdown.map((b) => (
              <div key={b.severity} className="flex items-center gap-3">
                <span
                  className={`w-16 shrink-0 rounded-md px-2 py-1 text-center text-xs font-medium ${SEV[b.severity].pill}`}
                  title={`Workday: ${SEVERITY_WORKDAY[b.severity]}`}
                >
                  {b.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div className={`h-full ${SEV[b.severity].bar}`} style={{ width: `${(b.count / maxCount) * 100}%` }} />
                  </div>
                  <div className="mt-1.5 truncate text-xs text-muted-foreground" title={b.note}>
                    {b.note}
                  </div>
                </div>
                <span className="w-6 shrink-0 text-right text-sm font-semibold">{b.count}</span>
              </div>
            ))}
          </div>
          {/* Keep Valigo's 4-tier rollup, but spell out the Workday mapping. */}
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Workday severity: <span className={SEV.critical.text}>Critical → Hard Stop</span> ·{" "}
            <span className={SEV.high.text}>High</span>/<span className={SEV.medium.text}>Medium → Soft Warning</span> ·{" "}
            <span className={SEV.low.text}>Low → Info</span>
          </p>
        </Card>

        {/* AI Insights */}
        <Card className="p-5" id="insights">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={17} className="text-accent-strong" aria-hidden />
            <h2 className="text-base font-semibold text-accent-strong">AI Insights</h2>
          </div>
          <div className="flex flex-col gap-3">
            {data.insights.map((ins) => (
              <div key={ins.title} className="rounded-xl border border-border bg-surface-muted p-4">
                <div className="text-sm font-semibold">{ins.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{ins.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ins.actions.map((a) =>
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
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</span>;
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
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle size={28} className="text-danger" aria-hidden />
      <div>
        <div className="text-base font-semibold">Couldn’t load the dashboard</div>
        <p className="mt-1 text-sm text-muted-foreground">{message}. Check your connection and try again.</p>
      </div>
      <Button variant="primary" onClick={onRetry}>
        <RotateCw size={14} aria-hidden /> Retry
      </Button>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-busy="true" aria-label="Loading dashboard">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-3 w-32 rounded bg-surface-muted" />
            <div className="h-10 w-40 rounded bg-surface-muted" />
            <div className="h-2 w-full rounded bg-surface-muted" />
            <div className="h-2 w-2/3 rounded bg-surface-muted" />
          </div>
        </Card>
      ))}
    </div>
  );
}
