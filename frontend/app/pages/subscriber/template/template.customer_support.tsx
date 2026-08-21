"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, UploadCloud, X } from "lucide-react";
import {
  SUPPORT_CONTEXT,
  SUPPORT_PRIORITIES,
  type SupportPriority,
} from "@/app/data/subscriber/subscriber.helpCenter_data";

type Props = { open: boolean; onClose: () => void };

/** Customer support request. Native <dialog> for the same reasons Settings uses
 *  one: top layer, backdrop, Escape and focus trap without hand-rolling any. */
export default function TemplateCustomerSupport({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const subjectId = useId();
  const priorityId = useId();
  const descriptionId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<SupportPriority>("High");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sent, setSent] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Reopening after a send should start a fresh request, not show the receipt
  // for the previous one.
  useEffect(() => {
    if (!open) return;
    setSent(false);
    setSubject("");
    setDescription("");
    setFiles([]);
    setPriority("High");
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="open:flex max-sm:h-dvh max-h-none w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-background p-0 text-foreground backdrop:bg-[rgb(10_11_15/0.6)] sm:m-auto sm:max-h-[calc(100dvh-3rem)] sm:w-[560px] sm:max-w-[calc(100%-3rem)] sm:rounded-2xl sm:border sm:border-border-strong sm:shadow-2xl"
    >
      {sent ? (
        <div className="flex flex-col items-center px-6 py-10 text-center sm:px-10">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-subtle">
            <Check size={22} className="text-success-text" aria-hidden />
          </span>
          <h2 id={titleId} className="pt-4 text-base font-semibold">
            Message sent
          </h2>
          <p className="max-w-[380px] pt-2 text-sm leading-6 text-muted-foreground">
            Our team will respond within 4 business hours. You&rsquo;ll receive a confirmation at{" "}
            {SUPPORT_CONTEXT.replyTo}.
          </p>
          <button
            onClick={onClose}
            className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            Back to Home
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-border-strong px-5 py-4 sm:px-6">
            <h2 id={titleId} className="text-sm font-semibold">
              Customer Support Request
            </h2>
            <button
              onClick={onClose}
              aria-label="Close support request"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5 sm:px-6">
            {/* Stated up front rather than collected silently — the user should
                know what leaves with their message. */}
            <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
              <p className="text-[11px] font-medium text-muted-foreground-2">Session context (sent automatically)</p>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-1 pt-2 text-xs sm:grid-cols-2">
                {[
                  ["Workspace", SUPPORT_CONTEXT.workspace],
                  ["Plan", SUPPORT_CONTEXT.plan],
                  ["Last run", SUPPORT_CONTEXT.lastRun],
                  ["Quality score", SUPPORT_CONTEXT.qualityScore],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-1.5">
                    <dt className="text-muted-foreground-2">{label}:</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-[1fr_140px]">
              <div>
                <label htmlFor={subjectId} className="block pb-1.5 text-xs font-medium text-muted-foreground">
                  Subject
                </label>
                <input
                  id={subjectId}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Briefly describe your issue…"
                  className="h-[38px] w-full rounded-lg border border-border-strong bg-surface px-3 text-sm placeholder:text-muted-foreground-2"
                />
              </div>
              <div>
                <label htmlFor={priorityId} className="block pb-1.5 text-xs font-medium text-muted-foreground">
                  Priority
                </label>
                <select
                  id={priorityId}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as SupportPriority)}
                  className="h-[38px] w-full rounded-lg border border-border-strong bg-surface px-3 text-sm"
                >
                  {SUPPORT_PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4">
              <label htmlFor={descriptionId} className="block pb-1.5 text-xs font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                id={descriptionId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what you're experiencing, any error messages, and steps to reproduce…"
                className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground-2"
              />
            </div>

            <div className="pt-4">
              <p className="pb-1.5 text-xs font-medium text-muted-foreground">Attachments</p>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  setFiles(Array.from(e.dataTransfer.files));
                }}
                className={`flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-7 text-xs transition-colors ${
                  dragging ? "border-accent bg-accent-subtle/40" : "border-border-strong text-muted-foreground-2"
                }`}
              >
                <UploadCloud size={20} aria-hidden />
                {files.length === 0
                  ? "Click or Drag here to upload files"
                  : `${files.length} file${files.length === 1 ? "" : "s"} attached`}
              </button>
              {files.length > 0 && (
                <ul className="pt-2 text-xs text-muted-foreground-2">
                  {files.map((f) => (
                    <li key={f.name} className="truncate">
                      {f.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 border-t border-border-strong px-5 py-4 sm:px-6">
            <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button
              onClick={() => {
                // TODO(backend): POST to the support desk. Nothing is sent yet —
                // the receipt below is a UI state, not a delivery confirmation.
                setSent(true);
              }}
              disabled={!subject.trim()}
              title={subject.trim() ? undefined : "Add a subject first"}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground-2"
            >
              Send to Support
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
