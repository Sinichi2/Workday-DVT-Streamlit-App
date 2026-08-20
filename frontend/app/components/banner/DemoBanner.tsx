import { Info, RotateCw } from "lucide-react";

/** Shown whenever the figures on screen are sample values rather than a real
 *  run. Never render seeded numbers without it — a reviewer approving a
 *  Workday load has to be able to tell demo data from their own.
 *  `onRetry` is omitted on screens that have nothing to re-fetch yet. */
export function DemoBanner({ onRetry, className = "" }: { onRetry?: () => void; className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border border-high/40 bg-high-subtle px-4 py-3 ${className}`}
    >
      <Info size={18} className="text-high-text" aria-hidden />
      <p className="flex-1 text-sm text-high-text">
        <span className="font-semibold">Demo data.</span> The backend isn’t connected — these figures are sample values, not a real run.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-high/50 px-3 py-1.5 text-xs font-medium text-high-text hover:bg-high/10"
        >
          <RotateCw size={13} aria-hidden /> Retry
        </button>
      )}
    </div>
  );
}
