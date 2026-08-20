"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { ContinueButton, WorkflowHeader } from "@/app/components/workflow/WorkflowChrome";

// The design states ".csv only · Max 50 MB" — enforce both here rather than
// letting a 2 GB XLSX reach the parser and fail somewhere less legible.
const MAX_BYTES = 50 * 1024 * 1024;

type Props = { file: File | null; onFile: (file: File | null) => void; onContinue: () => void };

export default function SubscriberWorkflowProfile({ file, onFile, onContinue }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function accept(candidate: File | undefined) {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      setError(`“${candidate.name}” isn’t a .csv file. Export your source extract as CSV and try again.`);
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError(`“${candidate.name}” is ${formatSize(candidate.size)} — the limit is 50 MB.`);
      return;
    }
    setError(null);
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
              <p className="pt-1 text-xs text-muted-foreground-2">{formatSize(file.size)} · ready to profile</p>
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

      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-critical-text">
          {error}
        </p>
      )}

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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
