/** Shared surface, table and text atoms. Used by the dashboard, the workflow
 *  steps and Reports — they render the same cards, column headers and deltas. */
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Delta as DeltaT } from "@/app/data/subscriber/subscriber.dashboard_data";

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
  const Icon = delta.direction === "down" ? TrendingDown : TrendingUp;
  const color = delta.good ? "text-success-text" : "text-danger";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color} ${className}`}>
      <Icon size={13} aria-hidden />
      {delta.text}
    </span>
  );
}
