/** Shared surface, table and text atoms. Used by the dashboard, the workflow
 *  steps and Reports — they render the same cards, column headers and deltas. */
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Delta as DeltaT, Severity } from "@/app/data/subscriber/subscriber.dashboard_data";

/** The bordered panel every table, stat card and empty state sits in. */
export function Panel({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-border-strong bg-surface ${className}`} {...props} />;
}

/** Uppercase column label, shared by every table head. */
export function Th({ className = "", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.275px] text-muted-foreground-2 ${className}`}
      {...props}
    />
  );
}

/** Monospace identifier — column names, report ids, raw cell values. These are
 *  literal strings from the data, so the mono face stops them reading as prose. */
export function Code({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <span className={`font-mono text-xs ${className}`}>{children}</span>;
}

/** A trend delta. The arrow follows the sign of the change; the color follows
 *  whether the change is good FOR THIS METRIC — "−14 errors" points down and is
 *  green, not red. */
export function Delta({ delta, className = "" }: { delta: DeltaT; className?: string }) {
  // "flat" is no change (or no run to compare against) — it is neither good nor
  // bad, and a green up-arrow on an unchanged metric reads as improvement.
  const Icon = delta.direction === "flat" ? Minus : delta.direction === "down" ? TrendingDown : TrendingUp;
  const color =
    delta.direction === "flat" ? "text-muted-foreground-2" : delta.good ? "text-success-text" : "text-danger";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color} ${className}`}>
      <Icon size={13} aria-hidden />
      {delta.text}
    </span>
  );
}

/** Severity pill - the same chip the Validate table, the dashboard breakdown and
 *  the manual-fix table all render. `-subtle` background + `-text` foreground is
 *  the AA-safe pairing; never a bare `bg-<sev>` fill behind text.
 *
 *  Spelled out rather than composed as `bg-${sev}-subtle` - Tailwind scans source
 *  text, so a class it never sees written out is a class it never generates. */
const SEVERITY: Record<Severity, { label: string; chip: string }> = {
  critical: { label: "Critical", chip: "bg-critical-subtle text-critical-text" },
  high: { label: "High", chip: "bg-high-subtle text-high-text" },
  medium: { label: "Medium", chip: "bg-medium-subtle text-medium-text" },
  low: { label: "Low", chip: "bg-low-subtle text-low-text" },
};

export function SeverityChip({ severity, className = "" }: { severity: Severity; className?: string }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-[14.286px] ${SEVERITY[severity].chip} ${className}`}>
      {SEVERITY[severity].label}
    </span>
  );
}
