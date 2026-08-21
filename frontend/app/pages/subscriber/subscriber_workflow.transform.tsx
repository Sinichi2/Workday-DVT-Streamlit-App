"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { ContinueButton, WorkflowHeader } from "@/app/components/workflow/WorkflowChrome";
import { Code, Panel, Th } from "@/app/components/ui/Primitives";
import { api, fileForm } from "@/app/lib/api";
import { reportError } from "@/app/lib/errors";

type TransformResponse = {
  summary: {
    source_rows: number;
    source_columns: number;
    target_columns: number;
    crosswalks_loaded: number;
    rules_total: number;
    rules_applied: number;
  };
  columns: string[];
  preview: Record<string, string | number | null>[];
  total_rows: number;
};

type Props = { file: File | null; onContinue: () => void };

/** Stage 2. The mapping workbook defines source → target and the transform per
 *  field, so the upload IS the configuration — there is nothing to pick here.
 *  What the reviewer needs to see is what the mapping actually produced. */
export default function SubscriberWorkflowTransform({ file, onContinue }: Props) {
  const [mapping, setMapping] = useState<File | null>(null);
  const [result, setResult] = useState<TransformResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function run(candidate: File) {
    if (!file) return;
    setMapping(candidate);
    setBusy(true);
        setResult(null);
    try {
      setResult(await api.upload<TransformResponse>("/transform", fileForm({ source: file, mapping: candidate })));
    } catch (err: unknown) {
      reportError("workflow.transform", err);
    } finally {
      setBusy(false);
    }
  }

  const s = result?.summary;

  return (
    <div className="mx-auto w-full max-w-[845px] py-4 sm:py-6 lg:p-8">
      <WorkflowHeader
        crumb="Transform"
        title="Field Mapping & Transform"
        subtitle="Upload your mapping workbook to map the source extract into Workday's target shape."
      />

      {!file && (
        <Panel className="mt-8 px-5 py-6 text-center text-sm text-muted-foreground">
          Upload a source file on the Profile step first.
        </Panel>
      )}

      {file && (
        <Panel className="mt-8 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-subtle">
              <FileSpreadsheet size={17} className="text-accent-strong" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{mapping ? mapping.name : "No mapping workbook yet"}</p>
              <p className="truncate text-xs text-muted-foreground-2">
                Source: {file.name} · .xlsx with a mappings sheet and any crosswalks
              </p>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void run(f);
            }}
          />
          <div className="flex shrink-0 items-center gap-2">
            {mapping && (
              <button
                onClick={() => {
                  setMapping(null);
                  setResult(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
              >
                <X size={13} aria-hidden /> Remove
              </button>
            )}
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
            >
              <UploadCloud size={13} aria-hidden /> {busy ? "Mapping…" : mapping ? "Replace" : "Choose workbook"}
            </button>
          </div>
        </Panel>
      )}


      {s && (
        <>
          <div className="animate-rise mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                [s.source_rows.toLocaleString(), "Source rows"],
                [String(s.source_columns), "Source columns"],
                [String(s.target_columns), "Target columns"],
                [`${s.rules_applied}/${s.rules_total}`, "Rules applied"],
                [String(s.crosswalks_loaded), "Crosswalks"],
              ] as [string, string][]
            ).map(([value, label]) => (
              <Panel key={label} className="p-4">
                <p className="text-2xl font-semibold leading-8">{value}</p>
                <p className="pt-1 text-xs text-muted-foreground-2">{label}</p>
              </Panel>
            ))}
          </div>

          <Panel className="mt-6 overflow-x-auto">
            <div className="flex items-center justify-between border-b border-border-strong px-5 py-3">
              <h2 className="text-sm font-semibold">Mapped output</h2>
              {/* The engine caps the preview; saying so stops the row count
                  reading as the whole dataset. */}
              <span className="text-xs text-muted-foreground-2">
                Showing {result.preview.length} of {result.total_rows.toLocaleString()} rows
              </span>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border-strong">
                  {result.columns.map((c) => (
                    <Th key={c} className="whitespace-nowrap">
                      {c}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.preview.slice(0, 25).map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {result.columns.map((c) => (
                      <td key={c} className="whitespace-nowrap px-5 py-2.5 text-xs">
                        {row[c] === null || row[c] === "" ? (
                          <span className="italic text-muted-foreground-2">empty</span>
                        ) : (
                          <Code>{String(row[c])}</Code>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}

      <div className="flex justify-end pt-6">
        <ContinueButton
          label="Continue to Validate"
          disabled={!result}
          disabledReason="Upload a mapping workbook first"
          onClick={onContinue}
        />
      </div>
    </div>
  );
}
