"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, ImagePlus, Plus, Trash2, Type } from "lucide-react";
import { Bar, DetailHead, Empty, Facts, Frame, Row, Split, type AdminPageProps } from "@/app/components/admin/Workbench";
import { api, fileForm } from "@/app/lib/api";
import { reportError } from "@/app/lib/errors";
import {
  isImageBlock,
  type ArticleBlock,
  type ArticleImage,
  type ArticleParagraph,
} from "@/app/data/subscriber/subscriber.helpCenter_data";

type Ticket = {
  id: string;
  subject: string;
  description: string;
  priority: "Low" | "Normal" | "High" | "Urgent";
  status: "open" | "pending" | "resolved";
  context: Record<string, string>;
  created_at: string;
  profiles: { email: string; first_name: string; last_name: string } | null;
};

type ArticleRow = {
  slug: string;
  category: string;
  title: string;
  blurb: string;
  minutes: number;
  body: ArticleBlock[];
  published: boolean;
};

type FaqRow = { id: string; question: string; answer: string; published: boolean };

const TABS = ["Tickets", "Articles", "FAQs"] as const;
type Tab = (typeof TABS)[number];

const STATUS_TONE: Record<Ticket["status"], string> = {
  open: "bg-critical-subtle text-critical-text",
  pending: "bg-medium-subtle text-medium-text",
  resolved: "bg-success-subtle text-success-text",
};

const PRIORITY_TONE: Record<Ticket["priority"], string> = {
  Urgent: "text-critical-text",
  High: "text-high-text",
  Normal: "text-muted-foreground",
  Low: "text-muted-foreground-2",
};

export default function AdminSupport({
  account,
  onOpenNav,
  focusTicketId,
  onFocusHandled,
}: AdminPageProps & { focusTicketId?: string | null; onFocusHandled?: () => void }) {
  const [tab, setTab] = useState<Tab>("Tickets");
  return (
    <div className="-mx-4 -mt-2 sm:-mx-6 lg:-mx-8">
      <Bar account={account} onOpenNav={onOpenNav} section="Admin" title="Support">
        <div role="tablist" aria-label="Support sections" className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                tab === t ? "bg-accent-subtle text-accent-strong" : "text-muted-foreground hover:bg-surface-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Bar>
      {tab === "Tickets" && <Tickets focusId={focusTicketId} onFocusHandled={onFocusHandled} />}
      {tab === "Articles" && <Articles />}
      {tab === "FAQs" && <Faqs />}
    </div>
  );
}

/* ------------------------------------------------------------------ tickets */

const STATUSES = ["open", "pending", "resolved"] as const;
const PRIORITIES = ["Urgent", "High", "Normal", "Low"] as const;

/** Urgent first, then High, and so on. Sorting by priority is the whole point
 *  of the queue - "newest first" tells you nothing about what to pick up. */
const PRIORITY_RANK: Record<Ticket["priority"], number> = { Urgent: 0, High: 1, Normal: 2, Low: 3 };

function Tickets({ focusId, onFocusHandled }: { focusId?: string | null; onFocusHandled?: () => void }) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [open, setOpen] = useState<Ticket | null>(null);
  const [status, setStatusFilter] = useState<Ticket["status"] | "all">("open");
  const [priority, setPriorityFilter] = useState<Ticket["priority"] | "all">("all");
  const [sort, setSort] = useState<"priority" | "newest">("priority");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      setTickets(await api.get<Ticket[]>("/tickets"));
    } catch (err: unknown) {
      reportError("admin/support", err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Arriving from a user's ticket list: select that ticket and widen the filter
  // so it can't be hidden by whatever the previous filter was.
  useEffect(() => {
    if (!focusId || !tickets) return;
    const t = tickets.find((x) => x.id === focusId);
    if (t) {
      setOpen(t);
      setStatusFilter("all");
      setPriorityFilter("all");
    }
    onFocusHandled?.();
  }, [focusId, tickets, onFocusHandled]);

  async function setStatus(t: Ticket, status: Ticket["status"]) {
    try {
      await api.patch(`/tickets/${t.id}`, { status });
    } catch (err: unknown) {
      reportError("admin/support", err);
      return;
    }
    setTickets((ts) => (ts ?? []).map((x) => (x.id === t.id ? { ...x, status } : x)));
    setOpen((o) => (o && o.id === t.id ? { ...o, status } : o));
  }

  const all = tickets ?? [];
  const openCount = all.filter((t) => t.status === "open").length;
  const urgentCount = all.filter((t) => t.status !== "resolved" && (t.priority === "Urgent" || t.priority === "High")).length;
  const needle = q.trim().toLowerCase();

  const list = all
    .filter((t) => (status === "all" ? true : t.status === status))
    .filter((t) => (priority === "all" ? true : t.priority === priority))
    .filter(
      (t) =>
        !needle ||
        t.subject.toLowerCase().includes(needle) ||
        (t.profiles?.email ?? "").toLowerCase().includes(needle),
    )
    .sort((a, b) =>
      sort === "priority"
        ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          +new Date(b.created_at) - +new Date(a.created_at)
        : +new Date(b.created_at) - +new Date(a.created_at),
    );

  return (
    <>
      <Split
        list={
          <Frame>
            <div className="border-b border-border-strong px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground-2">Queue</span>
                <span className="text-[11px] text-muted-foreground-2">
                  {openCount} open · {urgentCount} need attention · {list.length} shown
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <Chip active={status === "all"} onClick={() => setStatusFilter("all")}>
                  All
                </Chip>
                {STATUSES.map((sv) => (
                  <Chip key={sv} active={status === sv} onClick={() => setStatusFilter(sv)}>
                    {sv}
                    <span className="ml-1 opacity-60">{all.filter((t) => t.status === sv).length}</span>
                  </Chip>
                ))}

                <span aria-hidden className="mx-1 h-4 w-px bg-border" />

                {PRIORITIES.map((pv) => (
                  <Chip
                    key={pv}
                    active={priority === pv}
                    // Second click clears it - a filter you can only widen by
                    // hunting for an "All" button is a trap.
                    onClick={() => setPriorityFilter((cur) => (cur === pv ? "all" : pv))}
                    tone={pv === "Urgent" || pv === "High" ? "warn" : undefined}
                  >
                    {pv}
                  </Chip>
                ))}

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "priority" | "newest")}
                  aria-label="Sort tickets"
                  className="ml-auto h-6 rounded border border-border-strong bg-background px-1.5 text-[11px]"
                >
                  <option value="priority">By priority</option>
                  <option value="newest">Newest</option>
                </select>
              </div>

              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search tickets"
                placeholder="Search subject or email…"
                className="mt-2 h-7 w-full rounded-md border border-border-strong bg-background px-2 text-[11px] placeholder:text-muted-foreground-2"
              />
            </div>
            {list.map((t) => (
              <Row key={t.id} selected={open?.id === t.id} onClick={() => setOpen(t)}>
                <span
                  aria-hidden
                  className={`size-1.5 shrink-0 rounded-full ${
                    t.status === "open" ? "bg-critical" : t.status === "pending" ? "bg-medium" : "bg-success"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{t.subject}</span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground-2">
                    {t.profiles?.email ?? "unknown"}
                  </span>
                </span>
                <span className={`shrink-0 text-[10px] font-semibold uppercase ${PRIORITY_TONE[t.priority]}`}>
                  {t.priority}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground-2">
                  {new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </Row>
            ))}
            {tickets && list.length === 0 && (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground-2">
                {all.length === 0 ? "Queue is empty." : "No tickets match these filters."}
              </p>
            )}
            {!tickets && <p className="px-4 py-10 text-center text-xs text-muted-foreground-2">Loading…</p>}
          </Frame>
        }
        detail={
          !open ? (
            <Empty>Select a ticket to read it and change its status.</Empty>
          ) : (
            <Frame>
              <DetailHead
                label={`Ticket · ${open.priority}`}
                title={open.subject}
                right={
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[open.status]}`}>
                    {open.status}
                  </span>
                }
              />

              <Facts
                rows={[
                  ["From", <span key="f" className="font-mono">{open.profiles?.email ?? "unknown"}</span>],
                  ["Raised", new Date(open.created_at).toLocaleString()],
                  ...Object.entries(open.context ?? {}).map(
                    ([k, v]) => [k, String(v)] as [string, React.ReactNode],
                  ),
                ]}
              />

              {open.description && (
                <div className="border-t border-border px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground-2">Message</p>
                  <p className="whitespace-pre-wrap pt-2 text-xs leading-relaxed text-muted-foreground">
                    {open.description}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                {(["open", "pending", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(open, s)}
                    aria-pressed={open.status === s}
                    className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                      open.status === s
                        ? "bg-accent text-accent-foreground"
                        : "border border-border-strong text-muted-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="border-t border-border px-4 py-3">
                <a
                  href={`mailto:${open.profiles?.email ?? ""}?subject=${encodeURIComponent("Re: " + open.subject)}`}
                  className="text-xs font-medium text-accent-strong hover:underline"
                >
                  Reply by email →
                </a>
              </div>
            </Frame>
          )
        }
      />
    </>
  );
}

/** Filter pill. `warn` tints the priorities that should pull the eye. */
function Chip({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "warn";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : tone === "warn"
            ? "border border-high/40 text-high-text hover:bg-high-subtle"
            : "border border-border-strong text-muted-foreground hover:bg-surface-muted"
      }`}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- articles */

const CATEGORIES = ["Guides", "Workflow", "Reference", "Developer"];
const INPUT = "h-8 w-full rounded-md border border-border-strong bg-background px-2.5 text-xs";

const emptyDraft = (): ArticleRow => ({
  slug: "",
  category: "Guides",
  title: "",
  blurb: "",
  minutes: 3,
  body: [{ text: "" }],
  published: true,
});

function Articles() {
  const [rows, setRows] = useState<ArticleRow[] | null>(null);
  const [draft, setDraft] = useState<ArticleRow>(emptyDraft());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await api.get<ArticleRow[]>("/help/articles?published_only=false"));
    } catch (err: unknown) {
      reportError("admin/support", err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
        // Drop empty paragraphs so a stray blank block never ships as a gap.
    const body = draft.body.filter((b) => (isImageBlock(b) ? true : Boolean(b.text?.trim())));
    try {
      await api.put("/help/articles", { ...draft, body });
    } catch (err: unknown) {
      setBusy(false);
      reportError("admin/support", err);
      return;
    }
    setBusy(false);
    setDraft(emptyDraft());
    void load();
  }

  return (
    <Split
      list={
        <div className="flex flex-col gap-4">
          <Frame>
            <div className="flex items-center justify-between border-b border-border-strong px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground-2">
                Published
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground-2">{rows?.length ?? 0}</span>
                <button
                  onClick={() => setDraft(emptyDraft())}
                  className="rounded border border-border-strong px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-surface-muted"
                >
                  New
                </button>
              </div>
            </div>
            <div className="max-h-[152px] overflow-y-auto">
              {(rows ?? []).map((a) => (
                <Row key={a.slug} selected={draft.slug === a.slug} onClick={() => setDraft(a)}>
                  <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {a.category}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{a.title}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground-2">{a.minutes}m</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete ${a.title}`}
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await api.del(`/help/articles/${a.slug}`);
                        void load();
                      } catch (err: unknown) {
                        reportError("admin/support", err);
                      }
                    }}
                    className="shrink-0 rounded p-1 text-muted-foreground-2 hover:bg-critical-subtle hover:text-critical-text"
                  >
                    <Trash2 size={13} aria-hidden />
                  </span>
                </Row>
              ))}
              {rows?.length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground-2">Nothing published.</p>
              )}
            </div>
          </Frame>

          <ArticlePreview draft={draft} />
        </div>
      }
      detail={
        <Frame>
          <DetailHead label={draft.slug ? "Editing" : "New article"} title={draft.title || "Untitled"} />

          <div className="grid gap-2 px-4 py-3">
            <input
              className={INPUT}
              placeholder="Title"
              aria-label="Article title"
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  title: e.target.value,
                  // Slug follows the title until the author edits it directly.
                  slug: d.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                }))
              }
            />
            <div className="grid grid-cols-[1fr_84px] gap-2">
              <input
                className={INPUT}
                placeholder="slug"
                aria-label="Slug"
                value={draft.slug}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              />
              <input
                className={INPUT}
                type="number"
                min={1}
                aria-label="Minutes"
                value={draft.minutes}
                onChange={(e) => setDraft((d) => ({ ...d, minutes: Number(e.target.value) || 1 }))}
              />
            </div>
            <select
              className={INPUT}
              aria-label="Category"
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              className={INPUT}
              placeholder="One-line blurb"
              aria-label="Blurb"
              value={draft.blurb}
              onChange={(e) => setDraft((d) => ({ ...d, blurb: e.target.value }))}
            />
          </div>

          <BlockEditor blocks={draft.body} onChange={(body) => setDraft((d) => ({ ...d, body }))} />

          <div className="flex items-center gap-2 border-t border-border px-4 py-3">
            <button
              onClick={save}
              disabled={!draft.slug.trim() || !draft.title.trim() || busy}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:bg-surface-muted disabled:text-muted-foreground-2"
            >
              <Plus size={13} aria-hidden /> {busy ? "Saving…" : draft.slug ? "Save article" : "Publish"}
            </button>
            {draft.slug && (
              <button
                onClick={() => setDraft(emptyDraft())}
                className="rounded-md border border-border-strong px-3 py-2 text-xs text-muted-foreground hover:bg-surface-muted"
              >
                New
              </button>
            )}
          </div>
        </Frame>
      }
    />
  );
}

/** Live preview. Renders the draft the way the Help Center will, so an author
 *  who has never seen a JSON block still knows what they are making. Kept
 *  visually identical to template.documentation on purpose - if the two drift,
 *  the preview stops being worth having. */
function ArticlePreview({ draft }: { draft: ArticleRow }) {
  const blocks = draft.body.filter((b) => (isImageBlock(b) ? true : Boolean((b as ArticleParagraph).text?.trim())));
  return (
    <Frame>
      <div className="flex items-center justify-between border-b border-border-strong px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground-2">Preview</span>
        <span className="text-[11px] text-muted-foreground-2">as readers will see it</span>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="rounded bg-accent-subtle px-2 py-0.5 text-[11px] font-medium text-accent-strong">
            {draft.category}
          </span>
          <span className="text-xs text-muted-foreground-2">{draft.minutes} min read</span>
        </div>

        <h2 className="pt-3 text-[22px] font-semibold leading-[33px]">{draft.title || "Untitled article"}</h2>
        {draft.blurb && <p className="pt-1 text-xs text-muted-foreground-2">{draft.blurb}</p>}

        <div className="flex flex-col gap-4 pt-5">
          {blocks.map((b, i) =>
            isImageBlock(b) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={b.url} alt={b.alt ?? ""} className="w-full rounded-lg border border-border" />
            ) : (
              <p key={i} className="text-sm leading-6 text-muted-foreground">
                {(b as ArticleParagraph).strong && (
                  <span className="font-semibold text-foreground">{(b as ArticleParagraph).strong} </span>
                )}
                {(b as ArticleParagraph).text}
              </p>
            ),
          )}
          {blocks.length === 0 && (
            <p className="rounded-lg border border-dashed border-border-strong px-4 py-8 text-center text-xs text-muted-foreground-2">
              Add a paragraph or an image on the right and it appears here.
            </p>
          )}
        </div>
      </div>
    </Frame>
  );
}

/* -------------------------------------------------------------- block editor */

/** Paragraphs and images in one ordered list, reordered by dragging.
 *
 *  Uses the native HTML5 drag API rather than a drag-and-drop library: the
 *  whole interaction is dragstart/dragover/drop plus an index, and a library
 *  would be a dependency for three event handlers. `dragOver` state drives a
 *  drop line so the author can see where the block will land. */
function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: ArticleBlock[];
  onChange: (b: ArticleBlock[]) => void;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Patch is the union of both shapes: a given call only ever touches keys
  // that exist on the block it targets.
  const set = (i: number, patch: Partial<ArticleParagraph & ArticleImage>) =>
    onChange(blocks.map((b, j) => (i === j ? ({ ...b, ...patch } as ArticleBlock) : b)));

  const remove = (i: number) => onChange(blocks.filter((_, j) => j !== i));

  function move(from: number, to: number) {
    if (from === to) return;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    // Removing the item first shifts everything after it down by one, so a
    // forward move lands one slot short without this adjustment.
    next.splice(from < to ? to - 1 : to, 0, item);
    onChange(next);
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const { url } = await api.upload<{ url: string }>("/article-images", fileForm({ file }));
      onChange([...blocks, { url, alt: "" }]);
    } catch (err: unknown) {
      // No block is appended, so a failed upload leaves the body untouched.
      reportError("admin/articles.upload", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground-2">Body</span>
        <span className="text-[10px] text-muted-foreground-2">drag to reorder</span>
      </div>

      <div className="px-4 py-2">
        {blocks.map((b, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragEnd={() => {
              setDragFrom(null);
              setDragOver(null);
            }}
            onDragOver={(e) => {
              // Without preventDefault the browser refuses the drop outright.
              e.preventDefault();
              setDragOver(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom !== null) move(dragFrom, i);
              setDragFrom(null);
              setDragOver(null);
            }}
            className={`group relative rounded-md border border-transparent py-1 ${
              dragOver === i && dragFrom !== null && dragFrom !== i ? "border-t-2 border-t-accent" : ""
            } ${dragFrom === i ? "opacity-40" : ""}`}
          >
            <div className="flex items-start gap-1.5">
              <span
                aria-hidden
                className="mt-1.5 cursor-grab text-muted-foreground-2 active:cursor-grabbing"
                title="Drag to reposition"
              >
                <GripVertical size={13} />
              </span>

              <div className="min-w-0 flex-1">
                {isImageBlock(b) ? (
                  <div className="rounded-md border border-border-strong bg-background p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.url} alt={b.alt ?? ""} className="max-h-28 w-full rounded object-cover" />
                    <input
                      className="mt-1.5 h-7 w-full rounded border border-border-strong bg-surface px-2 text-[11px]"
                      placeholder="Alt text — describe the image"
                      aria-label="Image alt text"
                      value={b.alt ?? ""}
                      onChange={(e) => set(i, { alt: e.target.value })}
                    />
                  </div>
                ) : (
                  <textarea
                    rows={2}
                    className="w-full rounded-md border border-border-strong bg-background px-2 py-1.5 text-xs"
                    placeholder="Paragraph…"
                    aria-label={`Paragraph ${i + 1}`}
                    value={(b as ArticleParagraph).text ?? ""}
                    onChange={(e) => set(i, { text: e.target.value })}
                  />
                )}
              </div>

              <button
                onClick={() => remove(i)}
                aria-label={`Remove block ${i + 1}`}
                className="mt-1 rounded p-1 text-muted-foreground-2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-critical-subtle hover:text-critical-text"
              >
                <Trash2 size={12} aria-hidden />
              </button>
            </div>
          </div>
        ))}

        {/* Tail drop zone, so a block can be moved to the very end. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(blocks.length);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragFrom !== null) move(dragFrom, blocks.length);
            setDragFrom(null);
            setDragOver(null);
          }}
          className={`h-4 rounded ${dragOver === blocks.length && dragFrom !== null ? "border-t-2 border-t-accent" : ""}`}
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />

      <div className="flex gap-2 px-4 pb-3">
        <button
          onClick={() => onChange([...blocks, { text: "" }])}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-surface-muted"
        >
          <Type size={12} aria-hidden /> Paragraph
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-surface-muted disabled:opacity-60"
        >
          <ImagePlus size={12} aria-hidden /> {uploading ? "Uploading…" : "Image"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- faqs */

function Faqs() {
  const [rows, setRows] = useState<FaqRow[] | null>(null);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(await api.get<FaqRow[]>("/help/faqs?published_only=false"));
    } catch (err: unknown) {
      reportError("admin/support", err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Split
      list={
        <Frame>
          <div className="flex items-center justify-between border-b border-border-strong px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground-2">Questions</span>
            <span className="text-[11px] text-muted-foreground-2">{rows?.length ?? 0}</span>
          </div>
          {(rows ?? []).map((f) => (
            <div key={f.id} className="flex items-start gap-3 border-b border-border px-3 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{f.question}</p>
                <p className="pt-0.5 text-[11px] text-muted-foreground-2">{f.answer}</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await api.del(`/help/faqs/${f.id}`);
                    void load();
                  } catch (err: unknown) {
                    reportError("admin/support", err);
                  }
                }}
                aria-label={`Delete ${f.question}`}
                className="shrink-0 rounded p-1 text-muted-foreground-2 hover:bg-critical-subtle hover:text-critical-text"
              >
                <Trash2 size={13} aria-hidden />
              </button>
            </div>
          ))}
          {rows?.length === 0 && <p className="px-4 py-10 text-center text-xs text-muted-foreground-2">No FAQs yet.</p>}
        </Frame>
      }
      detail={
        <Frame>
          <DetailHead label="New" title="Add a question" />
          <div className="grid gap-2 px-4 py-3">
            <input className={INPUT} placeholder="Question" aria-label="Question" value={q} onChange={(e) => setQ(e.target.value)} />
            <textarea
              rows={5}
              className="w-full rounded-md border border-border-strong bg-background px-2.5 py-2 text-xs"
              placeholder="Answer"
              aria-label="Answer"
              value={a}
              onChange={(e) => setA(e.target.value)}
            />
          </div>
          <div className="border-t border-border px-4 py-3">
            <button
              onClick={async () => {
                try {
                  await api.post("/help/faqs", { question: q, answer: a, position: rows?.length ?? 0 });
                } catch (err: unknown) {
                  reportError("admin/support", err);
                  return;
                }
                setQ("");
                setA("");
                void load();
              }}
              disabled={!q.trim() || !a.trim()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:bg-surface-muted disabled:text-muted-foreground-2"
            >
              <Plus size={13} aria-hidden /> Add FAQ
            </button>
          </div>
        </Frame>
      }
    />
  );
}
