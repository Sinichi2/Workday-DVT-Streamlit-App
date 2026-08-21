"use client";

import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Panel } from "@/app/components/ui/Primitives";
import type { Article } from "@/app/data/subscriber/subscriber.helpCenter_data";

type Props = {
  article: Article;
  onBack: () => void;
  /** Sibling articles for the footer pager — omitted at either end. */
  previous?: Article;
  next?: Article;
  onOpen: (slug: string) => void;
};

/** Article reader. A template: it renders whatever `Article` it is handed, so
 *  the admin CMS only has to produce the data, never a new screen. */
export default function TemplateDocumentation({ article, onBack, previous, next, onOpen }: Props) {
  return (
    <div className="mx-auto w-full max-w-[768px] px-4 py-6 sm:px-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-strong hover:underline"
      >
        <ArrowLeft size={14} aria-hidden /> Help Center
      </button>

      <div className="flex items-center gap-3 pt-5">
        <span className="rounded bg-accent-subtle px-2 py-0.5 text-[11px] font-medium text-accent-strong">
          {article.category}
        </span>
        <span className="text-xs text-muted-foreground-2">{article.minutes} min read</span>
      </div>

      <h1 className="pt-3 text-[22px] font-semibold leading-[33px]">{article.title}</h1>

      <Panel className="mt-6 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4">
          {article.body.map((block, i) => (
            <p key={i} className="text-sm leading-6 text-muted-foreground">
              {/* The lead-in is bold inline, not a heading — it reads as part of
                  the sentence, and a real <h*> here would litter the outline. */}
              {block.strong && <span className="font-semibold text-foreground">{block.strong} </span>}
              {block.text}
            </p>
          ))}
        </div>
      </Panel>

      {(previous || next) && (
        <nav aria-label="More articles" className="flex flex-wrap items-center justify-between gap-3 pt-6">
          {previous ? (
            <button
              onClick={() => onOpen(previous.slug)}
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-border-strong px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
            >
              <ChevronLeft size={14} className="shrink-0" aria-hidden />
              <span className="truncate">{previous.title}</span>
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button
              onClick={() => onOpen(next.slug)}
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-border-strong px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
            >
              <span className="truncate">{next.title}</span>
              <ChevronRight size={14} className="shrink-0" aria-hidden />
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
