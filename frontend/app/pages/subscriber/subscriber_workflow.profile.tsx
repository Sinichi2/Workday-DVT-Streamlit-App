"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { ContinueButton, WorkflowHeader } from "@/app/components/workflow/WorkflowChrome";
import { Panel } from "@/app/components/ui/Primitives";
import { api, fileForm } from "@/app/lib/api";
import { reportError } from "@/app/lib/errors";

type ProfileResponse = {
  overview: {
    total_rows: number;
    total_columns: number;
    blank_cells: number;
    overall_missing_pct: number;
    duplicate_rows: number;
  };
  issues: { Column: string; Severity: string; Issue: string; Detail: string }[];
};

/** The engine grades issues High/Medium/Low; reuse the severity tokens. */
const ISSUE_TONE: Record<string, string> = {
  High: "bg-high-subtle text-high-text",
  Medium: "bg-medium-subtle text-medium-text",
  Low: "bg-low-subtle text-low-text",
};

// The design states ".csv only · Max 50 MB" — enforce both here rather than
// letting a 2 GB XLSX reach the parser and fail somewhere less legible.
const MAX_BYTES = 50 * 1024 * 1024;

type Props = { file: File | null; onFile: (file: File | null) => void; onContinue: () => void };

export default function SubscriberWorkflowProfile({ file, onFile, onContinue }: Props) {
  const [dragging, setDragging] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profiling, setProfiling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Profiling is the whole point of this step, so it runs on selection rather
  // than behind another button. Aborts if the file changes mid-flight, so a
  // slow response for an old file can't overwrite a newer one.
  useEffect(() => {
    if (!file) {
      setProfile(null);
      return;
    }
    const ctrl = new AbortController();
    setProfiling(true);
    api.upload<ProfileResponse>("/profile", fileForm({ file }), ctrl.signal)
      .then((res) => {
        setProfile(res);
              })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setProfile(null);
        reportError("workflow.profile", err);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setProfiling(false);
      });
    return () => ctrl.abort();
  }, [file]);

  function accept(candidate: File | undefined) {
    if (!candidate) return;
    // Client-side gate. Rejecting is the feedback: the file simply is not
    // accepted, and the reason goes to the console.
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      reportError("workflow.profile", new Error(`${candidate.name} is not a .csv file`));
      return;
    }
    if (candidate.size > MAX_BYTES) {
      reportError("workflow.profile", new Error(`${candidate.name} is ${formatSize(candidate.size)}; limit is 50 MB`));
      return;
    }
        onFile(candidate);
  }

  return (
    <div className="mx-auto w-full max-w-[672px] py-4 sm:py-6 lg:p-8">
      <WorkflowHeader crumb="Profile" title="Upload Source File" subtitle="Upload your source extract to start the process" />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files[0]);
        }}
        className={`mt-8 flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-8 transition-colors sm:p-14 ${
          dragging ? "border-accent bg-accent-subtle/40" : "border-border-strong"
        }`}
      >
        {/* One hidden native input drives both the drop zone and the button —
            no second file-picker implementation to keep in sync. */}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => accept(e.target.files?.[0])}
        />

        {file ? (
          <>
            <span className="flex size-16 items-center justify-center rounded-full bg-success-subtle">
              <FileText size={28} className="text-success-text" aria-hidden />
            </span>
            <div className="text-center">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="pt-1 text-xs text-muted-foreground-2">
                {formatSize(file.size)} · {profiling ? "profiling…" : profile ? "profiled" : "ready to profile"}
              </p>
            </div>
            <button
              onClick={() => {
                onFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
            >
              <X size={13} aria-hidden /> Remove file
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              aria-label="Choose a CSV file"
              className="flex size-16 items-center justify-center rounded-full bg-surface-muted text-muted-foreground hover:bg-border"
            >
              <UploadCloud size={28} aria-hidden />
            </button>
            <div className="text-center">
              <p className="text-sm font-medium">Drop your CSV file here</p>
              <p className="pt-1 text-xs text-muted-foreground-2">or press the icon above · .csv only · Max 50 MB</p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-border-strong bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
            >
              Choose file
            </button>
          </>
        )}
      </div>


      {profile && <ProfileResult profile={profile} />}

      <div className="flex justify-end pt-6">
        <ContinueButton
          label="Continue to Transform"
          disabled={!file}
          disabledReason="Upload a CSV file first"
          onClick={onContinue}
        />
      </div>
    </div>
  );
}

/** Real numbers from the engine. Every figure here is measured, not seeded —
 *  this is the one screen in the app currently reading live data. */
function ProfileResult({ profile }: { profile: ProfileResponse }) {
  const { overview, issues } = profile;
  const stats: [string, string][] = [
    [overview.total_rows.toLocaleString(), "Rows"],
    [String(overview.total_columns), "Columns"],
    [`${overview.overall_missing_pct}%`, "Blank cells"],
    [overview.duplicate_rows.toLocaleString(), "Duplicate rows"],
  ];

  return (
    <Panel className="animate-rise mt-6 p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label}>
            <div className="text-2xl font-semibold leading-8">{value}</div>
            <div className="text-xs text-muted-foreground-2">{label}</div>
          </div>
        ))}
      </div>

      {issues.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-[10px] uppercase tracking-[0.25px] text-muted-foreground-2">
            {issues.length} issue{issues.length === 1 ? "" : "s"} flagged
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {issues.map((iss, i) => (
              <li key={`${iss.Column}-${iss.Issue}-${i}`} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${
                    ISSUE_TONE[iss.Severity] ?? "bg-low-subtle text-low-text"
                  }`}
                >
                  {iss.Severity}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium">
                    {iss.Column} — {iss.Issue}
                  </p>
                  <p className="text-xs text-muted-foreground-2">{iss.Detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
