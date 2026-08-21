"use client";

import { useMemo, useState } from "react";
import { Check, Save } from "lucide-react";
import {
  AiCard,
  ContinueButton,
  WorkflowHeader,
} from "@/app/components/workflow/WorkflowChrome";
import { Code, Panel, Th } from "@/app/components/ui/Primitives";
import {
  DUMMY_COLUMN_MATCHES,
  DUMMY_COMPARISON,
  type ColumnMatch,
} from "@/app/data/subscriber/subscriber.workflow_data";

// TODO(backend): step 1 should come from the auto-matcher and step 2 from a real
// diff of the sampled record against the Workday target.

type Props = { onComplete: () => void };

export default function SubscriberWorkflowCompare({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  return step === 1 ? <MapColumns onNext={() => setStep(2)} /> : <Comparison onComplete={onComplete} />;
}

// Map Source Columns to Target Fields

function MapColumns({ onNext }: { onNext: () => void }) {
  const [matches, setMatches] = useState<ColumnMatch[]>(DUMMY_COLUMN_MATCHES);

  const pending = matches.filter((m) => m.confidence === "confirm").length;
  const auto = matches.length - pending;

  function confirm(source: string) {
    setMatches((ms) => ms.map((m) => (m.source === source ? { ...m, confidence: "auto" } : m)));
  }

  function retarget(source: string, target: string) {
    setMatches((ms) => ms.map((m) => (m.source === source ? { ...m, target } : m)));
  }

  return (
    <div className="mx-auto w-full max-w-[845px] py-4 sm:py-6 lg:p-8">
      <WorkflowHeader crumb="Compare · Step 1 of 2" title="Map Source Columns to Target Fields" />

      <div className="flex flex-wrap items-center gap-4 pt-8">
        <span className="inline-flex items-center gap-2 rounded-lg bg-success-subtle px-3 py-2 text-xs text-success-text">
          <Check size={14} aria-hidden /> {auto} auto-matched
        </span>
        {pending > 0 && (
          <span className="rounded-lg bg-medium-subtle px-3 py-2 text-xs text-medium-text">
            {pending} need your review
          </span>
        )}
      </div>

      <Panel className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border-strong">
              <Th>Source Column</Th>
              <Th className="px-2" aria-label="maps to" />
              <Th className="border-l border-border-strong">Workday Target Field</Th>
              <Th className="w-[120px]">Confidence</Th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr
                key={m.source}
                // The amber wash marks the rows still waiting on a human, so the
                // work left is visible without reading the confidence column.
                className={`border-b border-border-strong last:border-0 ${
                  m.confidence === "confirm" ? "bg-medium-subtle/40" : ""
                }`}
              >
                <td className="px-5 py-3">
                  <Code>{m.source}</Code>{" "}
                  <span className="text-xs text-muted-foreground-2">({m.sourceLabel})</span>
                </td>
                <td className="px-2 text-center text-xs text-muted-foreground-2" aria-hidden>
                  →
                </td>
                <td className="border-l border-border-strong px-5 py-3">
                  <label className="sr-only" htmlFor={`tgt-${m.source}`}>
                    Workday target field for {m.source}
                  </label>
                  <input
                    id={`tgt-${m.source}`}
                    value={m.target}
                    onChange={(e) => retarget(m.source, e.target.value)}
                    className="w-full rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs"
                  />
                </td>
                <td className="px-5 py-3">
                  {m.confidence === "auto" ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success-text">
                      <Check size={12} aria-hidden /> Auto-matched
                    </span>
                  ) : (
                    <button
                      onClick={() => confirm(m.source)}
                      className="rounded-md border border-medium px-2.5 py-1 text-[11px] font-medium text-medium-text hover:bg-medium-subtle"
                    >
                      Confirm
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
        {/* <p className="text-xs text-muted-foreground-2">
          {pending > 0 ? `${pending} mapping${pending === 1 ? "" : "s"} still need confirming` : "All mappings confirmed"}
        </p> */}
        <ContinueButton
          label="Confirm Mappings & Compare"
          disabled={pending > 0}
          disabledReason="Confirm every reviewed mapping first"
          onClick={onNext}
        />
      </div>
    </div>
  );
}

// Step 2 — Source vs Target Comparison

function Comparison({ onComplete }: { onComplete: () => void }) {
  const [saved, setSaved] = useState(false);
  const run = DUMMY_COMPARISON;
  const matched = useMemo(() => run.diffs.filter((d) => d.match).length, [run.diffs]);

  return (
    <div className="mx-auto w-full max-w-[845px] py-4 sm:py-6 lg:p-8">
      <WorkflowHeader crumb="Compare · Step 2 of 2" title="Source vs Target Comparison" />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Panel className="p-4">
          <p className="text-xs text-muted-foreground-2">Field Match Rate</p>
          <p className="pt-1 text-3xl font-semibold leading-9 text-success">{run.matchRate}</p>
          <p className="pt-1 text-xs text-muted-foreground-2">Sample: Row {run.sampleRow}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs text-muted-foreground-2">Exact Matches</p>
          <p className="pt-1 text-3xl font-semibold leading-9">{run.exact}</p>
          <p className="pt-1 text-xs text-muted-foreground-2">of {run.fields} fields</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs text-muted-foreground-2">Mismatches</p>
          <p className="pt-1 text-3xl font-semibold leading-9 text-critical-text">{run.mismatches}</p>
          <p className="pt-1 text-xs text-muted-foreground-2">require action</p>
        </Panel>
      </div>

      <div className="pt-5">
        <AiCard
          label="AI Recommendation"
          body={run.aiRecommendation}
          autoFixCount={run.autoFixable}
          manualCount={run.manualFixes}
        />
      </div>

      <Panel className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border-strong">
              <Th>Field</Th>
              <Th className="border-l border-border-strong">Source Value</Th>
              <Th className="border-l border-border-strong">Target Value</Th>
            </tr>
          </thead>
          <tbody>
            {run.diffs.map((d) => (
              <tr
                key={d.field}
                className={`border-b border-border-strong last:border-0 ${d.match ? "" : "bg-critical-subtle/30"}`}
              >
                <td className="px-5 py-3">
                  <span className="flex items-center gap-2">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${d.match ? "bg-success" : "bg-critical"}`}
                      aria-hidden
                    />
                    <Code className="text-muted-foreground">{d.field}</Code>
                    {/* The dot alone is color-only; name the state for SR users. */}
                    <span className="sr-only">{d.match ? "matches" : "mismatch"}</span>
                  </span>
                </td>
                <td className="border-l border-border-strong px-5 py-3">
                  <Value value={d.sourceValue} className={d.match ? "text-muted-foreground" : "text-critical-text"} />
                </td>
                <td className="border-l border-border-strong px-5 py-3">
                  <span className="flex items-center justify-between gap-3">
                    <Value value={d.targetValue} className={d.match ? "text-success-text" : ""} />
                    {d.note && <span className="shrink-0 text-[11px] text-muted-foreground-2">{d.note}</span>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <p className="text-xs text-muted-foreground-2">
          Validation complete · <span className="text-success-text">{matched} fields match</span> ·{" "}
          <span className="text-critical-text">{run.mismatches} need resolution</span>
        </p>
        <div className="flex gap-3">
          <button className="rounded-lg border border-border-strong px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-muted">
            Export Report
          </button>
          <button
            onClick={() => {
              setSaved(true);
              onComplete();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-success px-5 py-2.5 text-sm font-medium text-accent-foreground hover:brightness-95"
          >
            {saved ? <Check size={14} aria-hidden /> : <Save size={14} aria-hidden />}
            {saved ? "Run saved" : "Complete & Save Run"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** A cell value, with the design's italic "empty" for a missing one. */
function Value({ value, className = "" }: { value: string | null; className?: string }) {
  return value === null ? (
    <Code className="italic text-muted-foreground-2">empty</Code>
  ) : (
    <Code className={className}>{value}</Code>
  );
}
