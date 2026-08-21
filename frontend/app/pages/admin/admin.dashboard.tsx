"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/app/components/ui/Primitives";
import { supabase } from "@/app/lib/supabase";

type Counts = { users: number; workspaces: number; runs: number; openTickets: number };
type Recent = { id: string; source_name: string; quality_score: number; status: string; created_at: string };

/** Platform overview. Every number here is a live count — admins read across all
 *  tenants via the `is_admin()` branch in each table's RLS policy, so there is
 *  no service key in the browser. */
export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // head:true fetches the count without shipping any rows back.
      const count = (t: string) => supabase.from(t).select("*", { count: "exact", head: true });
      const [users, workspaces, runs, tickets, recentRuns] = await Promise.all([
        count("profiles"),
        count("workspaces"),
        count("runs"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase
          .from("runs")
          .select("id, source_name, quality_score, status, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      if (cancelled) return;
      const failed = [users, workspaces, runs, tickets, recentRuns].find((r) => r.error);
      if (failed?.error) {
        setError(failed.error.message);
        return;
      }
      setCounts({
        users: users.count ?? 0,
        workspaces: workspaces.count ?? 0,
        runs: runs.count ?? 0,
        openTickets: tickets.count ?? 0,
      });
      setRecent((recentRuns.data as Recent[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tiles: [string, string][] = counts
    ? [
        [String(counts.users), "Users"],
        [String(counts.workspaces), "Workspaces"],
        [String(counts.runs), "Validation runs"],
        [String(counts.openTickets), "Open tickets"],
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-[1024px] px-4 py-6 sm:px-8">
      <h1 className="text-[22px] font-semibold leading-[33px]">Admin</h1>
      <p className="pt-1 text-sm text-muted-foreground">Platform activity across every workspace.</p>

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-critical-subtle px-4 py-3 text-xs font-medium text-critical-text">
          {error}
        </p>
      )}

      <div className="animate-rise grid grid-cols-2 gap-3 pt-6 lg:grid-cols-4">
        {tiles.map(([value, label]) => (
          <Panel key={label} className="p-4">
            <p className="text-2xl font-semibold leading-8">{value}</p>
            <p className="pt-1 text-xs text-muted-foreground-2">{label}</p>
          </Panel>
        ))}
        {!counts && !error && [0, 1, 2, 3].map((i) => <Panel key={i} className="h-[76px] animate-pulse p-4" />)}
      </div>

      <Panel className="mt-6 overflow-hidden">
        <h2 className="border-b border-border-strong px-5 py-4 text-sm font-semibold">Recent runs</h2>
        {recent.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
            <span className="min-w-0 flex-1 truncate text-sm">{r.source_name}</span>
            <span className="shrink-0 text-xs text-muted-foreground-2">
              {new Date(r.created_at).toLocaleDateString()}
            </span>
            <span
              className={`shrink-0 text-xs font-semibold ${
                r.status === "complete" ? "text-success-text" : "text-muted-foreground-2"
              }`}
            >
              {Number(r.quality_score).toFixed(1)}%
            </span>
          </div>
        ))}
        {recent.length === 0 && (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground-2">No runs recorded yet.</p>
        )}
      </Panel>
    </div>
  );
}
