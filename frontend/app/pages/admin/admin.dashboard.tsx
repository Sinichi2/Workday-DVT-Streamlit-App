"use client";

import { useEffect, useState } from "react";
import { Bar, Frame ,
  type AdminPageProps,
} from "@/app/components/admin/Workbench";
import { api } from "@/app/lib/api";

type Counts = { users: number; workspaces: number; runs: number; open_tickets: number; new_enquiries: number };
type Recent = { id: string; source_name: string; quality_score: number; status: string; created_at: string };
type Ticket = { id: string; subject: string; status: string; created_at: string };

/** Platform overview. Every figure is a live count read through the is_admin()
 *  branch of each table's RLS policy - no service key in the browser. */
export default function AdminDashboard({ account, onOpenNav }: AdminPageProps) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The backend does the counting; RLS decides whose rows are counted.
        const [overview, runs, tickets] = await Promise.all([
          api.get<Counts>("/admin/overview"),
          api.get<Recent[]>("/runs?limit=10"),
          api.get<Ticket[]>("/tickets"),
        ]);
        if (cancelled) return;
        setCounts(overview);
        setRecent(runs);
        setTickets(tickets.slice(0, 6));
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the overview");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="-mx-4 -mt-2 sm:-mx-6 lg:-mx-8">
      <Bar
        account={account}
        onOpenNav={onOpenNav}
        section="Admin"
        title="Overview"
        stats={
          counts
            ? [
                ["users", counts.users],
                ["workspaces", counts.workspaces],
                ["runs", counts.runs],
                ["open tickets", counts.open_tickets],
                ["new enquiries", counts.new_enquiries],
              ]
            : []
        }
      />

      {error && (
        <p role="alert" className="mx-auto max-w-[1240px] px-4 pt-4 text-xs font-medium text-critical-text sm:px-6">
          {error}
        </p>
      )}

      {/* Two activity feeds side by side - what an operator actually watches,
          rather than a row of metric tiles above a single table. */}
      <div className="mx-auto grid max-w-[1240px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-2">
        <Frame>
          <div className="flex items-center justify-between border-b border-border-strong px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground-2">
              Recent runs
            </span>
            <span className="text-[11px] text-muted-foreground-2">{recent.length}</span>
          </div>
          {recent.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0">
              <span className="min-w-0 flex-1 truncate text-[13px]">{r.source_name}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground-2">
                {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
              <span
                className={`shrink-0 font-mono text-[11px] ${
                  Number(r.quality_score) >= 95 ? "text-success-text" : "text-high-text"
                }`}
              >
                {Number(r.quality_score).toFixed(1)}%
              </span>
            </div>
          ))}
          {recent.length === 0 && (
            <p className="px-3 py-10 text-center text-xs text-muted-foreground-2">No runs recorded yet.</p>
          )}
        </Frame>

        <Frame>
          <div className="flex items-center justify-between border-b border-border-strong px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground-2">
              Latest tickets
            </span>
            <span className="text-[11px] text-muted-foreground-2">{tickets.length}</span>
          </div>
          {tickets.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0">
              <span
                aria-hidden
                className={`size-1.5 shrink-0 rounded-full ${
                  t.status === "open" ? "bg-critical" : t.status === "pending" ? "bg-medium" : "bg-success"
                }`}
              />
              <span className="min-w-0 flex-1 truncate text-[13px]">{t.subject}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground-2">
                {new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
          {tickets.length === 0 && (
            <p className="px-3 py-10 text-center text-xs text-muted-foreground-2">No tickets raised.</p>
          )}
        </Frame>
      </div>
    </div>
  );
}
