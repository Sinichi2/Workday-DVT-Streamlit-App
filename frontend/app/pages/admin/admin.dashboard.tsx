"use client";

import { useEffect, useState } from "react";
import { Bar, Frame ,
  type AdminPageProps,
} from "@/app/components/admin/Workbench";
import { supabase } from "@/app/lib/supabase";

type Counts = { users: number; workspaces: number; runs: number; openTickets: number; contacts: number };
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
      // head:true returns the count without shipping any rows.
      const count = (t: string) => supabase.from(t).select("*", { count: "exact", head: true });
      const [users, workspaces, runs, open, contacts, recentRuns, recentTickets] = await Promise.all([
        count("profiles"),
        count("workspaces"),
        count("runs"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("contact_requests").select("*", { count: "exact", head: true }).eq("handled", false),
        supabase.from("runs").select("id, source_name, quality_score, status, created_at")
          .order("created_at", { ascending: false }).limit(10),
        supabase.from("support_tickets").select("id, subject, status, created_at")
          .order("created_at", { ascending: false }).limit(6),
      ]);
      if (cancelled) return;
      const failed = [users, workspaces, runs, open, recentRuns].find((r) => r.error);
      if (failed?.error) {
        setError(failed.error.message);
        return;
      }
      setCounts({
        users: users.count ?? 0,
        workspaces: workspaces.count ?? 0,
        runs: runs.count ?? 0,
        openTickets: open.count ?? 0,
        contacts: contacts.count ?? 0,
      });
      setRecent((recentRuns.data as Recent[]) ?? []);
      setTickets((recentTickets.data as Ticket[]) ?? []);
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
                ["open tickets", counts.openTickets],
                ["new enquiries", counts.contacts],
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
