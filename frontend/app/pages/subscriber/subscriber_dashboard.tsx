"use client";

import { useEffect, useState } from "react";
import { Pencil, Sparkles, TrendingDown, TrendingUp, Wand2 } from "lucide-react";
import { Card } from "@/app/components/card/Card";
import { Button } from "@/app/components/button/Button";
import { Severity, DashboardData } from "@/app/data/subscriber/subscriber.dashboard_data";

// change URL once the API exists.
const DASHBOARD_ENDPOINT = "https://api.valigo.local/subscriber/dashboard";


const DUMMY_DATA: DashboardData = {
  qualityScore: "97.3%",
  recordsEvaluated: "4,218 records evaluated",
  qualityDelta: "+1.2% from last run",
  errorTotal: 76,
  distribution: { critical: 3, high: 11, medium: 24, low: 38 },
  stats: [
    { label: "Data Integrity", sublabel: "Field mapping coverage", value: "83.3%", delta: "−0.4%", trend: "down" },
    { label: "Total Errors", sublabel: "Across all severity levels", value: "76", delta: "−14 from last run", trend: "up" },
    { label: "Records Passed", sublabel: "Out of 4,218 total", value: "4,142", delta: "+60 from last run", trend: "up" },
  ],
  breakdown: [
    { severity: "critical", label: "Critical", count: 3, note: "Missing manager assignments" },
    { severity: "high", label: "High", count: 11, note: "Pay group & cost center lookup mismatches" },
    { severity: "medium", label: "Medium", count: 24, note: "Date formats, whitespace, currency symbols" },
    { severity: "low", label: "Low", count: 38, note: "Email casing, minor trim issues" },
  ],
  insights: [
    {
      title: "3 critical — manager not assigned",
      body: "Employee IDs 10042, 10077, 10213 have no manager assigned. Will block Workday org hierarchy load.",
      actions: ["manual-required"],
    },
    {
      title: "Pay group mismatch ×11",
      body: "“BW-US” does not match Workday reference table.",
      actions: ["ai", "manual"],
    },
    {
      title: "ZIP whitespace ×24",
      body: "Leading or trailing spaces in Postal_Code field.",
      actions: ["ai", "manual"],
    },
  ],
};

// Severity → token classes
const SEV: Record<Severity, { bar: string; pill: string; text: string }> = {
  critical: { bar: "bg-critical", pill: "bg-critical-subtle text-critical", text: "text-critical" },
  high: { bar: "bg-high", pill: "bg-high-subtle text-high", text: "text-high" },
  medium: { bar: "bg-medium", pill: "bg-medium-subtle text-medium", text: "text-medium" },
  low: { bar: "bg-low", pill: "bg-low-subtle text-low", text: "text-muted-foreground" },
};

export default function SubscriberDashboard() {
  const [data, setData] = useState<DashboardData>(DUMMY_DATA);

  useEffect(() => {
    let alive = true;
    fetch(DASHBOARD_ENDPOINT)
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => {
        /* backend not up yet — keep DUMMY_DATA */
      });
    return () => {
      alive = false;
    };
  }, []);

  const maxCount = Math.max(...data.breakdown.map((b) => b.count));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-3xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Data Quality Score */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <Label>Data Quality Score</Label>
            <Sparkles size={16} className="text-muted-foreground/60" />
          </div>
          <div className="mt-3 text-6xl font-bold text-success">{data.qualityScore}</div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{data.recordsEvaluated}</span>
            <Delta trend="up" text={data.qualityDelta} />
          </div>

          <div className="mt-6">
            <Label>Error Distribution · {data.errorTotal} total</Label>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-muted">
              {(Object.keys(data.distribution) as Severity[]).map((s) => (
                <div
                  key={s}
                  className={SEV[s].bar}
                  style={{ width: `${(data.distribution[s] / data.errorTotal) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-4 text-xs">
              <span className={SEV.critical.text}>{data.distribution.critical} critical</span>
              <span className={SEV.high.text}>{data.distribution.high} high</span>
              <span className={SEV.medium.text}>{data.distribution.medium} med</span>
              <span className="text-muted-foreground">{data.distribution.low} low</span>
            </div>
          </div>
        </Card>

        {/* Stacked stats */}
        <Card className="divide-y divide-border">
          {data.stats.map((s) => (
            <div key={s.label} className="flex items-start justify-between px-5 py-[18px]">
              <div>
                <Label>{s.label}</Label>
                <div className="mt-1 text-sm text-muted-foreground">{s.sublabel}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">{s.value}</div>
                <Delta trend={s.trend} text={s.delta} className="mt-1" />
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
                <span className={`w-16 shrink-0 rounded-md px-2 py-1 text-center text-xs font-medium ${SEV[b.severity].pill}`}>
                  {b.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div className={`h-full ${SEV[b.severity].bar}`} style={{ width: `${(b.count / maxCount) * 100}%` }} />
                  </div>
                  <div className="mt-1.5 truncate text-xs text-muted-foreground">{b.note}</div>
                </div>
                <span className="w-6 shrink-0 text-right text-sm font-semibold">{b.count}</span>
                <Sparkles size={14} className="shrink-0 text-muted-foreground/50" />
              </div>
            ))}
          </div>
        </Card>

        {/* AI Insights */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={17} className="text-accent" />
            <h2 className="text-base font-semibold text-accent">AI Insights</h2>
          </div>
          <div className="flex flex-col gap-3">
            {data.insights.map((ins) => (
              <div key={ins.title} className="rounded-xl border border-border bg-surface-muted p-4">
                <div className="text-sm font-semibold">{ins.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{ins.body}</p>
                <div className="mt-3 flex gap-2">
                  {ins.actions.map((a) =>
                    a === "ai" ? (
                      <Button key={a} variant="ai">
                        <Wand2 size={13} /> Fix with AI
                      </Button>
                    ) : (
                      <Button key={a} variant="outline">
                        <Pencil size={13} /> Fix Manually{a === "manual-required" && " (Required)"}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</span>;
}

function Delta({ trend, text, className = "" }: { trend: "up" | "down"; text: string; className?: string }) {
  const Icon = trend === "down" ? TrendingDown : TrendingUp;
  const color = trend === "down" ? "text-danger" : "text-success";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color} ${className}`}>
      <Icon size={13} />
      {text}
    </span>
  );
}
