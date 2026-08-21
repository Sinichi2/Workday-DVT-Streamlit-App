"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Plug,
  Rocket,
  Search,
  ShieldAlert,
  Shuffle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Panel } from "@/app/components/ui/Primitives";
import TemplateCustomerSupport from "@/app/pages/subscriber/template/template.customer_support";
import TemplateDocumentation from "@/app/pages/subscriber/template/template.documentation";
import { api } from "@/app/lib/api";
import {
  ARTICLES as SEED_ARTICLES,
  FAQS as SEED_FAQS,
  HELP_TOPICS,
  type Article,
  type Faq,
  type HelpTopic,
} from "@/app/data/subscriber/subscriber.helpCenter_data";

const TOPIC_ICON: Record<HelpTopic["icon"], LucideIcon> = {
  rocket: Rocket,
  transform: Shuffle,
  validate: ShieldAlert,
  score: BarChart3,
  team: Users,
  api: Plug,
};

export default function SubscriberHelpCenter() {
  const [query, setQuery] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  // Admin-published content. The seed module is the fallback, not the source:
  // an unreachable database should degrade to slightly stale help, never to an
  // empty Help Center.
  const [ARTICLES, setArticles] = useState<Article[]>(SEED_ARTICLES);
  const [FAQS, setFaqs] = useState<Faq[]>(SEED_FAQS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, f] = await Promise.all([
          api.get<Article[]>("/help/articles"),
          api.get<Faq[]>("/help/faqs"),
        ]);
        if (cancelled) return;
        if (a.length) setArticles(a);
        if (f.length) setFaqs(f);
      } catch {
        // Seeded content stays on screen — an outage should degrade to
        // slightly stale help, never to an empty Help Center.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const articles = useMemo(
    () =>
      !q
        ? ARTICLES
        : ARTICLES.filter(
            (a) => a.title.toLowerCase().includes(q) || a.blurb.toLowerCase().includes(q) || a.category.toLowerCase().includes(q),
          ),
    [q, ARTICLES],
  );
  const faqs = useMemo(
    () => (!q ? FAQS : FAQS.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))),
    [q, FAQS],
  );

  const openIndex = ARTICLES.findIndex((a) => a.slug === openSlug);
  if (openIndex >= 0) {
    return (
      <TemplateDocumentation
        article={ARTICLES[openIndex]}
        previous={ARTICLES[openIndex - 1]}
        next={ARTICLES[openIndex + 1]}
        onOpen={setOpenSlug}
        onBack={() => setOpenSlug(null)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[768px] px-4 py-6 sm:px-8">
      <h1 className="text-[22px] font-semibold leading-[33px]">Help Center</h1>
      <p className="pt-1 text-sm text-muted-foreground">Documentation, answers, and support for Valigo.</p>

      <div className="relative pt-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 mt-2.5 -translate-y-1/2 text-muted-foreground-2"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search articles and FAQs"
          placeholder="Search articles and FAQs…"
          className="h-[46px] w-full rounded-xl border border-border-strong bg-surface pl-11 pr-4 text-sm placeholder:text-muted-foreground-2"
        />
      </div>

      {/* Topic tiles are shortcuts into the same articles listed below, so they
          disappear during a search rather than competing with the results. */}
      {!q && (
        <div className="grid grid-cols-1 gap-3 pt-8 sm:grid-cols-2 lg:grid-cols-3">
          {HELP_TOPICS.filter((t) => ARTICLES.some((a) => a.slug === t.slug)).map((topic) => {
            const Icon = TOPIC_ICON[topic.icon];
            return (
              <button
                key={topic.slug}
                onClick={() => setOpenSlug(topic.slug)}
                className="rounded-xl border border-border-strong bg-surface p-4 text-left transition-colors hover:border-accent/40 hover:bg-surface-muted"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent-subtle">
                  <Icon size={16} className="text-accent-strong" aria-hidden />
                </span>
                <p className="pt-3 text-sm font-semibold">{topic.title}</p>
                <p className="pt-1 text-xs text-muted-foreground-2">{topic.blurb}</p>
              </button>
            );
          })}
        </div>
      )}

      <Panel className="mt-8 overflow-hidden">
        <h2 className="border-b border-border-strong px-5 py-4 text-sm font-semibold">Documentation</h2>
        {articles.map((a) => (
          <button
            key={a.slug}
            onClick={() => setOpenSlug(a.slug)}
            className="flex w-full items-center gap-3 border-b border-border px-5 py-3 text-left last:border-0 hover:bg-surface-muted"
          >
            <span className="shrink-0 rounded bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {a.category}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{a.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground-2">{a.minutes} min read</span>
            <ChevronRight size={12} className="shrink-0 text-muted-foreground-2" aria-hidden />
          </button>
        ))}
        {articles.length === 0 && (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground-2">No articles match “{query}”.</p>
        )}
      </Panel>

      <Panel className="mt-6 overflow-hidden">
        <h2 className="border-b border-border-strong px-5 py-4 text-sm font-semibold">Frequently Asked Questions</h2>
        {faqs.map((f) => (
          // <details> is the accordion: open/close state, keyboard operation and
          // the correct semantics, with no React state and no aria wiring.
          <details key={f.question} className="group border-b border-border last:border-0">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm hover:bg-surface-muted">
              <span className="min-w-0 flex-1">{f.question}</span>
              <ChevronDown
                size={16}
                className="shrink-0 text-muted-foreground-2 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="px-5 pb-4 text-sm leading-6 text-muted-foreground">{f.answer}</p>
          </details>
        ))}
        {faqs.length === 0 && (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground-2">No questions match “{query}”.</p>
        )}
      </Panel>

      <Panel className="mt-6 flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
        <div>
          <p className="text-sm font-semibold">Still need help?</p>
          <p className="pt-0.5 text-xs text-muted-foreground-2">Our support team responds within 4 business hours.</p>
        </div>
        <button
          onClick={() => setSupportOpen(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
        >
          Contact support
        </button>
      </Panel>

      <TemplateCustomerSupport open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  );
}
