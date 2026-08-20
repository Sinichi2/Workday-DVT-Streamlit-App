"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Search, X } from "lucide-react";
import { DemoBanner } from "@/app/components/banner/DemoBanner";
import {
  AiCard,
  ContinueButton,
  FilterChip,
  WorkflowHeader,
} from "@/app/components/workflow/WorkflowChrome";
import { Code, Panel, Th } from "@/app/components/ui/Primitives";
import { DUMMY_RUN, type ValidationRun } from "@/app/data/subscriber/subscriber.workflow_data";
import type { Severity } from "@/app/data/subscriber/subscriber.dashboard_data";

// TODO(backend): POST the mapped file to the validation service and stream real
// progress. The interval below is a stand-in so the running state is reachable.
const IS_DEV = process.env.NODE_ENV !== "production";
const FAKE_RUN_MS = 2400;

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

const SEV: Record<Severity, { label: string; chip: string; pill: string; num: string }> = {
  critical: { label: "Critical", chip: "border-critical/25 bg-critical-subtle text-critical-text", pill: "bg-critical-subtle text-critical-text", num: "text-critical-text" },
  high: { label: "High", chip: "border-high/25 bg-high-subtle text-high-text", pill: "bg-high-subtle text-high-text", num: "text-high-text" },
  medium: { label: "Medium", chip: "border-medium/25 bg-medium-subtle text-medium-text", pill: "bg-medium-subtle text-medium-text", num: "text-medium-text" },
  low: { label: "Low", chip: "border-low/25 bg-low-subtle text-low-text", pill: "bg-low-subtle text-low-text", num: "text-muted-foreground" },
};

type Phase = "idle" | "running" | "done";
type Props = { onContinue: () => void; onComplete: () => void };

export default function SubscriberWorkflowValidate({ onContinue, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState(0);
  const run = DUMMY_RUN;

  // Drive the progress bar, then hand off to the results view. Cleared on
  // unmount so navigating away mid-run can't finish a run that isn't showing.
  useEffect(() => {
    if (phase !== "running") return;
    const started = Date.now();
    const id = setInterval(() => {
      const pct = Math.min(1, (Date.now() - started) / FAKE_RUN_MS);
      setProgress(pct);
      if (pct === 1) {
        clearInterval(id);
        setPhase("done");
        onComplete();
      }
    }, 60);
    return () => clearInterval(id);
  }, [phase, onComplete]);

  return (
    <div className="mx-auto w-full max-w-[1024px] py-4 sm:py-6 lg:p-8">
      <WorkflowHeader
        crumb="Validate"
        title="Run Validation"
        subtitle="Execute validation rules against your mapped data and review results."
      />

      {phase === "idle" && <IdleCard run={run} onRun={() => setConfirming(true)} />}
      {phase === "running" && <RunningCard run={run} progress={progress} />}
      {phase === "done" && <Results run={run} onContinue={onContinue} onRerun={() => setConfirming(true)} />}

      {confirming && (
        <ConfirmDialog
          run={run}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            setProgress(0);
            setPhase("running");
          }}
        />
      )}
    </div>
  );
}

function IdleCard({ run, onRun }: { run: ValidationRun; onRun: () => void }) {
  return (
    <Panel className="mt-8 flex flex-col items-center p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-subtle">
        <Play size={20} className="text-accent-strong" aria-hidden />
      </span>
      <p className="pt-4 text-sm font-semibold">Ready to validate</p>
      <p className="max-w-[320px] pt-1.5 text-xs text-muted-foreground">
        Valigo will check all {run.fields} mapped fields across {run.records.toLocaleString()} records against Workday
        validation rules.
      </p>
      <RunStats run={run} className="pt-5 text-lg" />
      <button
        onClick={onRun}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
      >
        <Play size={14} aria-hidden /> Run Validation
      </button>
    </Panel>
  );
}

function RunningCard({ run, progress }: { run: ValidationRun; progress: number }) {
  const done = Math.round(run.records * progress);
  const pct = Math.round(progress * 100);
  return (
    <Panel className="mt-8 p-8 text-center">
      <p className="text-sm font-semibold">Validating records…</p>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Validation progress"
        className="mx-auto mt-4 h-1.5 w-full max-w-[384px] overflow-hidden rounded-full bg-surface-muted"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-100" style={{ width: `${pct}%` }} />
      </div>
      <p className="pt-3 text-xs text-muted-foreground-2">
        {done.toLocaleString()} / {run.records.toLocaleString()} · {pct}%
      </p>
    </Panel>
  );
}

function Results({ run, onContinue, onRerun }: { run: ValidationRun; onContinue: () => void; onRerun: () => void }) {
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [query, setQuery] = useState("");

  const findings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return run.findings.filter(
      (f) =>
        (!severity || f.severity === severity) &&
        (!q || f.field.toLowerCase().includes(q) || f.issue.toLowerCase().includes(q)),
    );
  }, [run.findings, severity, query]);

  return (
    <>
      {IS_DEV && <DemoBanner className="mt-6" onRetry={onRerun} />}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Panel className="p-4">
          <p className="text-xs text-muted-foreground-2">Quality Score</p>
          <p className="pt-2 text-4xl font-semibold leading-10 text-success">{run.qualityScore}</p>
          <p className="pt-1 text-xs text-muted-foreground-2">
            {run.passed.toLocaleString()} / {run.records.toLocaleString()} passed
          </p>
        </Panel>
        {SEVERITIES.map((s) => (
          <Panel key={s} className="p-4">
            <p className="text-xs text-muted-foreground-2">{SEV[s].label}</p>
            <p className={`pt-2 text-2xl font-semibold leading-8 ${SEV[s].num}`}>{run.counts[s]}</p>
          </Panel>
        ))}
      </div>

      <div className="pt-5">
        <AiCard label="AI Summary" body={run.aiSummary} autoFixCount={run.autoFixable} manualCount={run.manualFixes} />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground-2" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search field or rule…"
            aria-label="Search findings by field or rule"
            className="h-[34px] w-[204px] rounded-lg border border-border-strong bg-surface pl-8 pr-3 text-xs placeholder:text-muted-foreground-2"
          />
        </div>
        <FilterChip
          tone="border-transparent bg-accent-subtle text-accent-strong"
          label={`All (${run.findings.length})`}
          pressed={severity === null}
          onClick={() => setSeverity(null)}
        />
        {SEVERITIES.map((s) => (
          <FilterChip
            key={s}
            tone={SEV[s].chip}
            label={SEV[s].label}
            count={run.counts[s]}
            pressed={severity === s}
            onClick={() => setSeverity((v) => (v === s ? null : s))}
          />
        ))}
      </div>

      <Panel className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse">
          <thead>
            <tr className="border-b border-border-strong">
              <Th className="px-4">Row</Th>
              <Th className="px-0">Field</Th>
              <Th className="px-0">Current Value</Th>
              <Th className="px-0">Issue</Th>
              <Th className="px-0">Severity</Th>
              <Th className="px-0">Suggested Fix</Th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <tr key={`${f.row}-${f.field}`} className="border-b border-border last:border-0 align-top">
                <td className="px-4 py-4">
                  <Code className="text-muted-foreground-2">{f.row}</Code>
                </td>
                <td className="py-4 pr-4">
                  <Code className="text-accent-strong">{f.field}</Code>
                </td>
                <td className="py-4 pr-4">
                  {f.value === null ? (
                    <Code className="italic text-muted-foreground-2">empty</Code>
                  ) : (
                    <Code>{f.value}</Code>
                  )}
                </td>
                <td className="max-w-[150px] py-4 pr-4 text-xs text-muted-foreground">{f.issue}</td>
                <td className="py-4 pr-4">
                  <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${SEV[f.severity].pill}`}>
                    {SEV[f.severity].label}
                  </span>
                </td>
                <td className="max-w-[170px] py-4 pr-4 text-xs text-info-text">{f.fix}</td>
              </tr>
            ))}
            {findings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-xs text-muted-foreground">
                  No findings match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      <div className="flex justify-end pt-6">
        <ContinueButton label="Continue to Compare" onClick={onContinue} />
      </div>
    </>
  );
}

/** Shared 3-up Records / Fields / Rules figure strip. */
function RunStats({ run, className = "" }: { run: ValidationRun; className?: string }) {
  const items: [string, string][] = [
    [run.records.toLocaleString(), "Records"],
    [String(run.fields), "Fields"],
    [String(run.rules), "Rules"],
  ];
  return (
    <div className={`flex justify-center gap-4 ${className}`}>
      {items.map(([value, label]) => (
        <div key={label} className="text-center">
          <div className="font-semibold">{value}</div>
          <div className="text-xs font-normal text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({
  run,
  onCancel,
  onConfirm,
}: {
  run: ValidationRun;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // Esc closes, matching the backdrop click — a modal that only the mouse can
  // dismiss is a keyboard trap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-validation-title"
        className="relative w-full max-w-[384px] rounded-2xl border border-border-strong bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border-strong px-6 pb-4 pt-5">
          <h2 id="run-validation-title" className="text-sm font-semibold">
            Run Validation?
          </h2>
          <button onClick={onCancel} aria-label="Close" className="flex size-7 items-center justify-center rounded-lg text-muted-foreground-2 hover:bg-surface-muted">
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="border-b border-border-strong pb-4">
            <RunStats run={run} className="text-base" />
          </div>
          <p className="pt-4 text-xs leading-[19.5px] text-muted-foreground">
            Valigo will run all {run.rules} validation rules against your mapped data. This usually takes under 30
            seconds and cannot be cancelled once started.
          </p>
          <p className="mt-3 rounded-lg border border-medium/40 bg-medium-subtle px-3 py-2.5 text-xs leading-[19.5px] text-medium-text">
            ⚠ Running a new validation will replace your current results for this file.
          </p>
        </div>

        <div className="flex justify-end gap-2.5 px-6 pb-5">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border-strong px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-accent-foreground hover:bg-accent-hover"
          >
            <Play size={12} aria-hidden /> Run Validation
          </button>
        </div>
      </div>
    </div>
  );
}
