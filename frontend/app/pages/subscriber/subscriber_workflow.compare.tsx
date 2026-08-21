"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowLeftRight, UploadCloud } from "lucide-react";
import { ContinueButton, WorkflowHeader } from "@/app/components/workflow/WorkflowChrome";
import { Code, Panel, Th } from "@/app/components/ui/Primitives";
import { fileForm, post } from "@/app/lib/api";

type CompareResponse = {
  summary: {
    expected_rows: number;
    actual_rows: number;
    matched_keys: number;
    missing_rows: number;
    extra_rows: number;
    rows_with_mismatch: number;
    field_mismatch_count: number;
    match_pct: number;
  };
  field_mismatches: Record<string, string | number | null>[];
  missing_rows: Record<string, string | number | null>[];
  extra_rows: Record<string, string | number | null>[];
};

type Props = { file: File | null; onComplete: () => void };

/** Stage 4 — fidelity check. Compares what you loaded against what the target
 *  system gave back, keyed on a column you choose. The key picker is populated
 *  from the file itself via /columns, so a typo can't silently match nothing. */
export default function SubscriberWorkflowCompare({ file, onComplete }: Props) {
  const expectedId = useId();
  const actualId = useId();
  const keyId = useId();

  const [expected, setExpected] = useState<File | null>(file);
  const [actual, setActual] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [keyColumn, setKeyColumn] = useState("");
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadColumns = useCallback(async (f: File) => {
    try {
      const res = await post<{ columns: string[] }>("/columns", fileForm({ file: f }));
      setColumns(res.columns);
      // Pre-select the first column that looks like an identifier rather than
      // making the reviewer hunt for it.
      setKeyColumn(res.columns.find((c) => /id$/i.test(c.trim())) ?? res.columns[0] ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not read that file");
    }
  }, []);

  // The expected side is pre-filled from the Profile step, but a file that
  // arrives as a prop never goes through the picker — without this its columns
  // are never fetched and the key select stays empty, leaving Run permanently
  // disabled with nothing on screen explaining why.
  useEffect(() => {
    if (file) void loadColumns(file);
  }, [file, loadColumns]);

  async function chooseExpected(f: File | undefined) {
    if (!f) return;
    setExpected(f);
    setResult(null);
    setError(null);
    await loadColumns(f);
  }

  async function run() {
    if (!expected || !actual || !keyColumn) return;
    setBusy(true);
    setError(null);
    try {
      setResult(
        await post<CompareResponse>("/compare", fileForm({ expected, actual, key_column: keyColumn })),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setBusy(false);
    }
  }

  const s = result?.summary;

  return (
    <div className="mx-auto w-full max-w-[1024px] py-4 sm:py-6 lg:p-8">
      <WorkflowHeader
        crumb="Compare"
        title="Compare Expected vs Actual"
        subtitle="Check what the target system returned against what you sent it, row by row and field by field."
      />

      <Panel className="mt-8 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FilePicker
            id={expectedId}
            label="Expected (what you loaded)"
            file={expected}
            onPick={chooseExpected}
          />
          <FilePicker
            id={actualId}
            label="Actual (what came back)"
            file={actual}
            onPick={(f) => {
              setActual(f ?? null);
              setResult(null);
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label htmlFor={keyId} className="block pb-1.5 text-xs font-medium text-muted-foreground">
              Key column
            </label>
            <select
              id={keyId}
              value={keyColumn}
              onChange={(e) => setKeyColumn(e.target.value)}
              disabled={columns.length === 0}
              className="h-[38px] w-full rounded-lg border border-border-strong bg-background px-3 text-sm disabled:opacity-60"
            >
              {columns.length === 0 && <option>Choose the expected file first</option>}
              {columns.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={run}
            disabled={!expected || !actual || !keyColumn || busy}
            title={!actual ? "Both files are required" : undefined}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground-2"
          >
            <ArrowLeftRight size={14} aria-hidden /> {busy ? "Comparing…" : "Run comparison"}
          </button>
        </div>
      </Panel>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-critical-subtle px-4 py-3 text-xs font-medium text-critical-text">
          {error}
        </p>
      )}

      {s && (
        <>
          <div className="animate-rise mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Panel className="p-4">
              <p className="text-2xl font-semibold leading-8 text-success">{s.match_pct}%</p>
              <p className="pt-1 text-xs text-muted-foreground-2">Match rate</p>
            </Panel>
            {(
              [
                [s.matched_keys.toLocaleString(), "Matched keys"],
                [s.missing_rows.toLocaleString(), "Missing rows"],
                [s.extra_rows.toLocaleString(), "Extra rows"],
                [s.field_mismatch_count.toLocaleString(), "Field mismatches"],
              ] as [string, string][]
            ).map(([value, label]) => (
              <Panel key={label} className="p-4">
                <p className="text-2xl font-semibold leading-8">{value}</p>
                <p className="pt-1 text-xs text-muted-foreground-2">{label}</p>
              </Panel>
            ))}
          </div>

          <DiffTable title="Field mismatches" rows={result.field_mismatches} />
          <DiffTable title="Missing rows — sent but not returned" rows={result.missing_rows} />
          <DiffTable title="Extra rows — returned but never sent" rows={result.extra_rows} />
        </>
      )}

      <div className="flex justify-end pt-6">
        <ContinueButton
          label="Complete & Save Run"
          disabled={!result}
          disabledReason="Run a comparison first"
          onClick={onComplete}
        />
      </div>
    </div>
  );
}

function FilePicker({
  id,
  label,
  file,
  onPick,
}: {
  id: string;
  label: string;
  file: File | null;
  onPick: (f: File | undefined) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label htmlFor={id} className="block pb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        type="file"
        accept=".csv,.xlsx,.xls,.xlsm"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <button
        onClick={() => ref.current?.click()}
        className="flex h-[38px] w-full items-center gap-2 rounded-lg border border-border-strong bg-background px-3 text-left text-sm hover:bg-surface-muted"
      >
        <UploadCloud size={14} className="shrink-0 text-muted-foreground-2" aria-hidden />
        <span className={`min-w-0 truncate ${file ? "" : "text-muted-foreground-2"}`}>
          {file ? file.name : "Choose a file…"}
        </span>
      </button>
    </div>
  );
}

/** The engine returns arbitrary column sets per diff, so the table is derived
 *  from the first row rather than a fixed schema. */
function DiffTable({ title, rows }: { title: string; rows: Record<string, string | number | null>[] }) {
  if (rows.length === 0) {
    return (
      <Panel className="mt-4 px-5 py-4">
        <p className="text-sm font-semibold">{title}</p>
        <p className="pt-1 text-xs text-muted-foreground-2">None — nothing to review here.</p>
      </Panel>
    );
  }
  const columns = Object.keys(rows[0]);
  return (
    <Panel className="mt-4 overflow-x-auto">
      <div className="flex items-center justify-between border-b border-border-strong px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground-2">{rows.length.toLocaleString()} shown</span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-strong">
            {columns.map((c) => (
              <Th key={c} className="whitespace-nowrap">
                {c}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {columns.map((c) => (
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
  );
}
