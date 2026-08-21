"use client";

import { Menu } from "lucide-react";

/* Admin chrome.
   A console, not a marketing page: compact toolbar instead of a display
   heading, dense rows, monospace for anything machine-generated, and a
   list/detail split so a support question can be answered without leaving the
   list. The stacked heading-plus-cards layout is the generic admin template
   and it makes every row a scroll away from its own context. */

/** Toolbar. Section name, live counts, actions right.
 *
 *  One line on a wide screen. Narrow, it becomes exactly two: identity and
 *  account on top, counts underneath. The ordering below is what forces that —
 *  a plain `flex-wrap` row let the counts wrap first and stranded the account
 *  on a third line of its own. */
export function Bar({
  section,
  title,
  stats = [],
  children,
  account,
  onOpenNav,
}: {
  section: string;
  title: string;
  stats?: [string, string | number][];
  children?: React.ReactNode;
  /** Theme toggle + avatar. The admin console renders no separate topbar, so
   *  the account lives on this line rather than in a strip of its own. */
  account?: React.ReactNode;
  /** Opens the nav drawer below `lg`. With no topbar on admin routes this is
   *  the only way back to the sidebar on a phone. */
  onOpenNav?: () => void;
}) {
  return (
    <div className="border-b border-border-strong bg-surface/60">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        {onOpenNav && (
          <button
            onClick={onOpenNav}
            aria-label="Open navigation"
            className="-ml-1 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted lg:hidden"
          >
            <Menu size={17} aria-hidden />
          </button>
        )}
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground-2">{section}</span>
        <h1 className="text-[15px] font-semibold">{title}</h1>

        {/* `order-last w-full` drops the counts onto their own full-width row
            below `md`, which keeps the account up on the first line with the
            title. From `md` the order resets and it all sits inline. */}
        {stats.length > 0 && (
          <dl className="order-last flex w-full flex-wrap items-baseline gap-x-5 gap-y-1 md:order-none md:w-auto">
            {stats.map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <dd className="font-mono text-[13px] tabular-nums">{value}</dd>
                <dt className="text-[11px] text-muted-foreground-2">{label}</dt>
              </div>
            ))}
          </dl>
        )}

        <div className="ml-auto flex items-center gap-2">
          {children}
          {account && <span className="ml-1 border-l border-border pl-3">{account}</span>}
        </div>
      </div>
    </div>
  );
}

/** List on the left, detail on the right. Below `lg` the detail stacks under
 *  the list rather than becoming a modal — an admin on a tablet still wants
 *  both, and a dialog here would trap the scroll position. */
export function Split({ list, detail }: { list: React.ReactNode; detail: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1240px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="min-w-0">{list}</div>
      <div className="lg:sticky lg:top-5">{detail}</div>
    </div>
  );
}

/** One row in a list. `selected` gets a left rule rather than a fill, so the
 *  row's own status colours stay readable. */
export function Row({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full items-center gap-3 border-l-2 border-b border-b-border px-3 py-2.5 text-left transition-colors last:border-b-0 ${
        selected ? "border-l-accent bg-accent-subtle/40" : "border-l-transparent hover:bg-surface-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-lg border border-border-strong bg-surface ${className}`}>{children}</div>;
}

/** Detail pane header — mono label + title, matching the toolbar's register. */
export function DetailHead({ label, title, right }: { label: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border-strong px-4 py-3">
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground-2">{label}</p>
        <p className="truncate pt-1 text-sm font-semibold">{title}</p>
      </div>
      {right}
    </div>
  );
}

/** Fact table. Machine values in mono; the label column is fixed so several
 *  stacked blocks line up down the pane. */
export function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="px-4 py-3">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[92px_1fr] gap-3 py-1.5 text-xs">
          <dt className="text-muted-foreground-2">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Frame className="flex min-h-[220px] items-center justify-center p-8">
      <p className="text-center text-xs text-muted-foreground-2">{children}</p>
    </Frame>
  );
}

/** Props every admin page takes so the shell can hand it the account controls
 *  and the mobile nav trigger. */
export type AdminPageProps = { account?: React.ReactNode; onOpenNav?: () => void };
