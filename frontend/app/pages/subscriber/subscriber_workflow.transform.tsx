"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  ContinueButton,
  FilterChip,
  WorkflowHeader,
} from "@/app/components/workflow/WorkflowChrome";
import { Code, Panel, Th } from "@/app/components/ui/Primitives";
import {
  DUMMY_MAPPINGS,
  TRANSFORM_HINT,
  TRANSFORM_OPTIONS,
  type Mapping,
  type MappingStatus,
} from "@/app/data/subscriber/subscriber.workflow_data";

// TODO(backend): mappings should arrive from the profiling run for the uploaded
// file. Until then these are seeded rows, flagged by the demo banner.

const ORDER: MappingStatus[] = ["mapped", "review", "warning", "unmapped"];

/** Status → token classes. Literal strings so Tailwind can see every class. */
const STATUS: Record<MappingStatus, { label: string; chip: string; pill: string }> = {
  mapped: { label: "Mapped", chip: "border-success/25 bg-success-subtle text-success-text", pill: "bg-success-subtle text-success-text" },
  review: { label: "Review", chip: "border-medium/25 bg-medium-subtle text-medium-text", pill: "bg-medium-subtle text-medium-text" },
  warning: { label: "Warning", chip: "border-high/25 bg-high-subtle text-high-text", pill: "bg-high-subtle text-high-text" },
  unmapped: { label: "Unmapped", chip: "border-critical/25 bg-critical-subtle text-critical-text", pill: "bg-critical-subtle text-critical-text" },
};

type Props = { onContinue: () => void };

export default function SubscriberWorkflowTransform({ onContinue }: Props) {
  const [rows, setRows] = useState<Mapping[]>(DUMMY_MAPPINGS);
  const [filter, setFilter] = useState<MappingStatus | null>(null);

  const counts = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
        { mapped: 0, review: 0, warning: 0, unmapped: 0 } as Record<MappingStatus, number>,
      ),
    [rows],
  );

  const visible = filter ? rows.filter((r) => r.status === filter) : rows;

  function setTransform(source: string, transform: string) {
    setRows((rs) => rs.map((r) => (r.source === source ? { ...r, transform } : r)));
  }

  return (
    <div className="mx-auto w-full max-w-[845px] py-4 sm:py-6 lg:p-8">
      <WorkflowHeader
        crumb="Transform"
        title="Field Mapping & Transform"
        subtitle="Each row reads left to right: source field → how it transforms → where it lands in Workday."
      />

      {/* Filters. Selecting one narrows the table; "Clear" only appears while a
          filter is active, so the unfiltered view stays quiet. */}
      <div className="flex flex-wrap items-center gap-2 pt-8">
        {ORDER.map((s) => (
          <FilterChip
            key={s}
            tone={STATUS[s].chip}
            label={STATUS[s].label}
            count={counts[s]}
            pressed={filter === s}
            onClick={() => setFilter((f) => (f === s ? null : s))}
          />
        ))}
        {filter && (
          <button onClick={() => setFilter(null)} className="px-3 py-1.5 text-xs font-medium text-muted-foreground-2 hover:text-foreground">
            Clear
          </button>
        )}
        <button
          onClick={() =>
            setRows((rs) => [
              ...rs,
              { source: "NEW_FIELD", sourceLabel: "unnamed", transform: "Direct", target: "", status: "unmapped" },
            ])
          }
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-accent-strong hover:bg-surface-muted"
        >
          <Plus size={14} aria-hidden /> Add mapping
        </button>
      </div>

      <Panel className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border-strong bg-surface-muted">
              <Th>Source Field</Th>
              <Th className="text-center">Transform</Th>
              <Th>Target Field</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.source} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <Code>{r.source}</Code>{" "}
                  <span className="text-xs text-muted-foreground-2">({r.sourceLabel})</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <label className="sr-only" htmlFor={`tf-${r.source}`}>
                      Transform for {r.source}
                    </label>
                    <select
                      id={`tf-${r.source}`}
                      value={r.transform}
                      onChange={(e) => setTransform(r.source, e.target.value)}
                      className="w-[110px] rounded-lg border border-border-strong bg-surface px-2 py-1 text-center text-xs"
                    >
                      {TRANSFORM_OPTIONS.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                    <span
                      title={TRANSFORM_HINT[r.transform]}
                      aria-label={TRANSFORM_HINT[r.transform]}
                      role="note"
                      tabIndex={0}
                      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-muted-foreground-2"
                    >
                      ?
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-muted-foreground-2" aria-hidden>
                      →
                    </span>
                    {r.target ? (
                      <Code className="text-accent-strong">{r.target}</Code>
                    ) : (
                      <span className="text-xs italic text-muted-foreground-2">no target</span>
                    )}
                    <span className={`ml-auto rounded px-2 py-0.5 text-[10px] font-medium ${STATUS[r.status].pill}`}>
                      {STATUS[r.status].label}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-xs text-muted-foreground">
                  No {filter && STATUS[filter].label.toLowerCase()} fields.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <p className="text-xs text-muted-foreground-2">
          {counts.mapped} of {rows.length} fields mapped
          {counts.unmapped > 0 && ` · ${counts.unmapped} still unmapped`}
        </p>
        <ContinueButton label="Continue to Validate" onClick={onContinue} />
      </div>
    </div>
  );
}
