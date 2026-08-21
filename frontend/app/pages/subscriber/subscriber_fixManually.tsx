"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Code, Panel, SeverityChip } from "@/app/components/ui/Primitives";
import type { Finding } from "@/app/data/subscriber/subscriber.workflow_data";

type Props = {
  findings: Finding[];
  onCancel: () => void;
  /** Receives only the rows the reviewer actually changed. */
  onSave: (edits: { finding: Finding; value: string }[]) => void;
};

type Tab = "all" | "needsFix" | "fixed";

/** Manual remediation table: one row per validation finding, each editable in
 *  place against its suggested fix.
 *
 *  A row counts as fixed when its value differs from what validation saw —
 *  derived, not a second status flag to keep in sync with the text input. */
export default function SubscriberFixManually({ findings, onCancel, onSave }: Props) {
  // Keyed by index: (row, field) is not unique — one row can fail several rules.
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const original = (f: Finding) => f.value ?? "";
  const valueOf = (f: Finding, i: number) => drafts[i] ?? original(f);
  const isFixed = (f: Finding, i: number) => valueOf(f, i).trim() !== original(f).trim();

  const fixedCount = findings.filter(isFixed).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return findings
      .map((f, i) => ({ f, i }))
      .filter(({ f, i }) => {
        if (tab === "fixed" && !isFixed(f, i)) return false;
        if (tab === "needsFix" && isFixed(f, i)) return false;
        if (!q) return true;
        return f.field.toLowerCase().includes(q) || String(f.row).includes(q);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findings, drafts, tab, query]);

  const TABS: [Tab, string][] = [
    ["all", `All (${findings.length})`],
    ["needsFix", `Needs Fix (${findings.length - fixedCount})`],
    ["fixed", `Fixed (${fixedCount})`],
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-[1024px] px-4 pt-4 sm:px-6">
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-strong px-4 py-3">
            <div className="flex items-center gap-1">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  aria-pressed={tab === id}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    tab === id ? "bg-accent-subtle text-accent-strong" : "text-muted-foreground hover:bg-surface-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground-2"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search rows or fields"
                placeholder="Search rows or fields…"
                className="h-[30px] w-[208px] rounded-lg border border-border-strong bg-surface pl-8 pr-3 text-xs placeholder:text-muted-foreground-2"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border-strong text-xs font-medium text-muted-foreground-2">
                  <th scope="col" className="px-4 py-2.5 font-medium">Row</th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">Field</th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">Validation Rule</th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">Current Value</th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">Suggested Fix</th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ f, i }) => {
                  const fixed = isFixed(f, i);
                  return (
                    <tr key={i} className="border-b border-border-strong last:border-0 even:bg-surface-muted/60">
                      <td className="whitespace-nowrap px-4 py-3 align-middle">
                        <Code className="text-muted-foreground-2">Row {f.row}</Code>
                      </td>
                      <td className="py-3 pr-4 align-middle">
                        <span className="flex items-center gap-2">
                          <span className="whitespace-nowrap text-xs font-medium">{f.field}</span>
                          <SeverityChip severity={f.severity} />
                        </span>
                      </td>
                      <td className="max-w-[180px] py-3 pr-4 align-middle text-[11px] leading-[15px] text-muted-foreground">
                        {f.issue}
                      </td>
                      <td className="py-3 pr-4 align-middle">
                        <input
                          value={valueOf(f, i)}
                          onChange={(e) => setDrafts((d) => ({ ...d, [i]: e.target.value }))}
                          aria-label={`${f.field} value for row ${f.row}`}
                          placeholder="(empty)"
                          className="h-[26px] w-[144px] rounded border border-border-strong bg-surface px-2 text-xs placeholder:text-muted-foreground-2"
                        />
                      </td>
                      <td className="py-3 pr-4 align-middle">
                        {/* Empty until the AI agent supplies remediations — the
                            engine only validates. Renders as a dash, not blank. */}
                        {f.fix ? (
                          <Code className="text-success-text">{f.fix}</Code>
                        ) : (
                          <span className="text-xs text-muted-foreground-2" aria-label="No suggestion yet">
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            fixed ? "bg-success-subtle text-success-text" : "bg-critical-subtle text-critical-text"
                          }`}
                        >
                          {fixed ? <Check size={10} aria-hidden /> : <X size={10} aria-hidden />}
                          {fixed ? "Fixed" : "Needs Fix"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <button
                          onClick={() => setDrafts((d) => ({ ...d, [i]: f.fix }))}
                          disabled={!f.fix}
                          title={f.fix ? undefined : "No suggestion available for this finding"}
                          className="whitespace-nowrap rounded bg-accent-subtle px-2.5 py-1 text-[10px] font-medium text-accent-strong hover:brightness-95 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground-2"
                        >
                          Apply suggestion
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visible.length === 0 && (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground-2">
                {findings.length === 0 ? "Nothing to fix — validation found no findings." : "No rows match this filter."}
              </p>
            )}
          </div>
        </Panel>
      </div>

      {/* Action bar stays on screen: the reviewer edits down a long table and
          must never scroll back up to find Save. */}
      <div className="sticky bottom-0 mt-4 border-t border-border-strong bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1024px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="whitespace-nowrap text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{fixedCount}</span> of{" "}
              <span className="font-semibold text-foreground">{findings.length}</span> records fixed
            </p>
            <div
              role="progressbar"
              aria-valuenow={fixedCount}
              aria-valuemin={0}
              aria-valuemax={findings.length}
              aria-label="Records fixed"
              className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-muted"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: findings.length ? `${(fixedCount / findings.length) * 100}%` : "0%" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onCancel} className="text-sm text-muted-foreground underline hover:text-foreground">
              Cancel
            </button>
            <button
              onClick={() =>
                // Every edit, not just the visible ones - a search left in the
                // box must never quietly drop work the reviewer already did.
                onSave(
                  findings
                    .map((f, i) => ({ f, i }))
                    .filter(({ f, i }) => isFixed(f, i))
                    .map(({ f, i }) => ({ finding: f, value: valueOf(f, i) })),
                )
              }
              disabled={fixedCount === 0}
              title={fixedCount === 0 ? "Edit at least one value first" : undefined}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground-2"
            >
              Save &amp; Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
