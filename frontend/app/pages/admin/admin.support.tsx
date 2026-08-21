"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Panel } from "@/app/components/ui/Primitives";
import { supabase } from "@/app/lib/supabase";

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

type ArticleRow = { slug: string; category: string; title: string; blurb: string; minutes: number; published: boolean };
type FaqRow = { id: string; question: string; answer: string; published: boolean };

const TABS = ["Tickets", "Articles", "FAQs"] as const;
type Tab = (typeof TABS)[number];

/** Support desk + Help Center authoring. Both are "answering users", and the
 *  admin doing one is usually about to do the other. */
export default function AdminSupport() {
  const [tab, setTab] = useState<Tab>("Tickets");

  return (
    <div className="mx-auto w-full max-w-[1024px] px-4 py-6 sm:px-8">
      <h1 className="text-[22px] font-semibold leading-[33px]">Support</h1>
      <p className="pt-1 text-sm text-muted-foreground">Answer tickets and publish Help Center content.</p>

      <div role="tablist" aria-label="Support sections" className="mt-6 grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-2 text-xs font-medium transition-colors ${
              tab === t ? "bg-accent-subtle text-accent-strong" : "text-muted-foreground hover:bg-surface-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="pt-6">
        {tab === "Tickets" && <Tickets />}
        {tab === "Articles" && <Articles />}
        {tab === "FAQs" && <Faqs />}
      </div>
    </div>
  );
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 rounded-lg bg-critical-subtle px-4 py-3 text-xs font-medium text-critical-text">
      {message}
    </p>
  );
}

const STATUS_TONE: Record<Ticket["status"], string> = {
  open: "bg-critical-subtle text-critical-text",
  pending: "bg-medium-subtle text-medium-text",
  resolved: "bg-success-subtle text-success-text",
};

function Tickets() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*, profiles(email, first_name, last_name)")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setTickets((data as unknown as Ticket[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(t: Ticket, status: Ticket["status"]) {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", t.id);
    if (error) setError(error.message);
    else setTickets((ts) => (ts ?? []).map((x) => (x.id === t.id ? { ...x, status } : x)));
  }

  return (
    <>
      <ErrorNote message={error} />
      {(tickets ?? []).map((t) => (
        <Panel key={t.id} className="mb-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t.subject}</p>
              <p className="pt-0.5 text-xs text-muted-foreground-2">
                {t.profiles?.email ?? "unknown"} · {new Date(t.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_TONE[t.status]}`}>
                {t.status}
              </span>
              <select
                value={t.status}
                onChange={(e) => setStatus(t, e.target.value as Ticket["status"])}
                aria-label={`Status for ${t.subject}`}
                className="h-[30px] rounded-lg border border-border-strong bg-surface px-2 text-xs"
              >
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
          {t.description && <p className="pt-3 text-sm leading-6 text-muted-foreground">{t.description}</p>}
          {/* Context was captured at submit time; showing it saves a round-trip
              asking the reporter what plan or run they were on. */}
          {Object.keys(t.context ?? {}).length > 0 && (
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-xs">
              {Object.entries(t.context).map(([k, v]) => (
                <div key={k} className="flex gap-1.5">
                  <dt className="text-muted-foreground-2">{k}:</dt>
                  <dd className="font-medium">{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>
      ))}
      {tickets?.length === 0 && (
        <Panel className="px-5 py-10 text-center text-xs text-muted-foreground-2">No tickets yet.</Panel>
      )}
      {!tickets && !error && (
        <Panel className="px-5 py-10 text-center text-xs text-muted-foreground-2">Loading…</Panel>
      )}
    </>
  );
}

const INPUT = "h-[34px] w-full rounded-lg border border-border-strong bg-surface px-3 text-sm";

function Articles() {
  const [rows, setRows] = useState<ArticleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ slug: "", title: "", category: "Guides", blurb: "", minutes: 3, body: "" });

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("help_articles")
      .select("slug, category, title, blurb, minutes, published")
      .order("position");
    if (error) setError(error.message);
    else setRows((data as ArticleRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish() {
    setError(null);
    // One paragraph per line — the reader renders [{ text }] blocks, so the
    // author never has to hand-write JSON.
    const body = draft.body
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
    const { error } = await supabase.from("help_articles").upsert({ ...draft, body });
    if (error) {
      setError(error.message);
      return;
    }
    setDraft({ slug: "", title: "", category: "Guides", blurb: "", minutes: 3, body: "" });
    void load();
  }

  async function remove(slug: string) {
    const { error } = await supabase.from("help_articles").delete().eq("slug", slug);
    if (error) setError(error.message);
    else void load();
  }

  return (
    <>
      <ErrorNote message={error} />
      <Panel className="mb-4 p-5">
        <p className="text-sm font-semibold">New article</p>
        <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
          <input
            className={INPUT}
            placeholder="Title"
            aria-label="Article title"
            value={draft.title}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                title: e.target.value,
                // Slug follows the title until the author edits it themselves.
                slug: d.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
              }))
            }
          />
          <input
            className={INPUT}
            placeholder="Slug"
            aria-label="Article slug"
            value={draft.slug}
            onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
          />
          <select
            className={INPUT}
            aria-label="Category"
            value={draft.category}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
          >
            {["Guides", "Workflow", "Reference", "Developer"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            className={INPUT}
            type="number"
            min={1}
            aria-label="Minutes to read"
            value={draft.minutes}
            onChange={(e) => setDraft((d) => ({ ...d, minutes: Number(e.target.value) || 1 }))}
          />
        </div>
        <input
          className={`${INPUT} mt-3`}
          placeholder="One-line blurb"
          aria-label="Blurb"
          value={draft.blurb}
          onChange={(e) => setDraft((d) => ({ ...d, blurb: e.target.value }))}
        />
        <textarea
          rows={5}
          className="mt-3 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm"
          placeholder="Body — one paragraph per line"
          aria-label="Article body"
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
        />
        <button
          onClick={publish}
          disabled={!draft.slug.trim() || !draft.title.trim()}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground-2"
        >
          <Plus size={14} aria-hidden /> Publish article
        </button>
      </Panel>

      <Panel className="overflow-hidden">
        {(rows ?? []).map((a) => (
          <div key={a.slug} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
            <span className="shrink-0 rounded bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {a.category}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{a.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground-2">{a.minutes} min</span>
            <button
              onClick={() => remove(a.slug)}
              aria-label={`Delete ${a.title}`}
              className="shrink-0 rounded p-1 text-muted-foreground-2 hover:bg-critical-subtle hover:text-critical-text"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        ))}
        {rows?.length === 0 && (
          <p className="px-5 py-10 text-center text-xs text-muted-foreground-2">No articles published.</p>
        )}
      </Panel>
    </>
  );
}

function Faqs() {
  const [rows, setRows] = useState<FaqRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("help_faqs").select("*").order("position");
    if (error) setError(error.message);
    else setRows((data as FaqRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    const { error } = await supabase.from("help_faqs").insert({ question: q, answer: a, position: rows?.length ?? 0 });
    if (error) {
      setError(error.message);
      return;
    }
    setQ("");
    setA("");
    void load();
  }

  return (
    <>
      <ErrorNote message={error} />
      <Panel className="mb-4 p-5">
        <p className="text-sm font-semibold">New question</p>
        <input
          className={`${INPUT} mt-4`}
          placeholder="Question"
          aria-label="FAQ question"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <textarea
          rows={3}
          className="mt-3 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm"
          placeholder="Answer"
          aria-label="FAQ answer"
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
        <button
          onClick={add}
          disabled={!q.trim() || !a.trim()}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground-2"
        >
          <Plus size={14} aria-hidden /> Add FAQ
        </button>
      </Panel>

      <Panel className="overflow-hidden">
        {(rows ?? []).map((f) => (
          <div key={f.id} className="flex items-start gap-3 border-b border-border px-5 py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{f.question}</p>
              <p className="pt-0.5 text-xs text-muted-foreground-2">{f.answer}</p>
            </div>
            <button
              onClick={async () => {
                const { error } = await supabase.from("help_faqs").delete().eq("id", f.id);
                if (error) setError(error.message);
                else void load();
              }}
              aria-label={`Delete ${f.question}`}
              className="shrink-0 rounded p-1 text-muted-foreground-2 hover:bg-critical-subtle hover:text-critical-text"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        ))}
        {rows?.length === 0 && <p className="px-5 py-10 text-center text-xs text-muted-foreground-2">No FAQs yet.</p>}
      </Panel>
    </>
  );
}
