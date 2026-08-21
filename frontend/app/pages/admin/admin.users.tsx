"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, DetailHead, Empty, Facts, Frame, Row, Split, type AdminPageProps } from "@/app/components/admin/Workbench";
import { api } from "@/app/lib/api";
import { reportError } from "@/app/lib/errors";
import { fullName, initials, type AppRole, type Profile } from "@/app/lib/supabase";
import { useSession } from "@/app/lib/session";

/** Everything about one account, gathered on demand. Loaded per-selection
 *  rather than joined into the list query: the list stays fast, and support
 *  only ever needs this for the one person they're on the phone with. */
type Detail = {
  workspaces: { name: string; role: string }[];
  runs: { id: string; source_name: string; quality_score: number; created_at: string }[];
  tickets: { id: string; subject: string; status: string; created_at: string }[];
};

const ROLE_TONE: Record<string, string> = {
  owner: "bg-accent-subtle text-accent-strong",
  editor: "bg-info-subtle text-info-text",
  viewer: "bg-surface-muted text-muted-foreground",
};

export default function AdminUsers({
  account,
  onOpenNav,
  onOpenTicket,
}: AdminPageProps & { onOpenTicket?: (id: string) => void }) {
  const { profile: me } = useSession();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await api.get<Profile[]>("/profiles"));
    } catch (err: unknown) {
      reportError("admin/users", err);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Pull the selected user's context. Cancelled on change so a slow reply for
  // a previous selection can't overwrite the current one.
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    (async () => {
      try {
        const [ws, runs, tickets] = await Promise.all([
          api.get<{ role: string; workspaces: { name: string } | null }[]>(
            `/workspaces/members?user_id=${selected.id}`,
          ),
          api.get<Detail["runs"]>(`/runs?created_by=${selected.id}&limit=5`),
          api.get<Detail["tickets"]>(`/tickets?user_id=${selected.id}`),
        ]);
        if (cancelled) return;
        setDetail({
          workspaces: ws.map((r) => ({ name: r.workspaces?.name ?? "—", role: r.role })),
          runs: runs.slice(0, 5),
          tickets: tickets.slice(0, 5),
        });
      } catch {
        if (!cancelled) setDetail({ workspaces: [], runs: [], tickets: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q) || fullName(u).toLowerCase().includes(q));
  }, [users, query]);

  async function setRole(user: Profile, role: AppRole) {
    setSaving(true);
        try {
      await api.patch(`/profiles/${user.id}`, { role });
    } catch (err: unknown) {
      setSaving(false);
      reportError("admin/users", err);
      return;
    }
    setSaving(false);
    setUsers((us) => us.map((u) => (u.id === user.id ? { ...u, role } : u)));
    setSelected((s) => (s && s.id === user.id ? { ...s, role } : s));
  }

  const admins = users.filter((u) => u.role === "admin").length;

  return (
    <div className="-mx-4 -mt-2 sm:-mx-6 lg:-mx-8">
      <Bar
        account={account}
        onOpenNav={onOpenNav}
        section="Admin"
        title="Users"
        stats={[
          ["accounts", users.length],
          ["admins", admins],
        ]}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
          placeholder="Search name or email…"
          className="h-8 w-[220px] rounded-md border border-border-strong bg-background px-2.5 text-xs placeholder:text-muted-foreground-2"
        />
      </Bar>


      <Split
        list={
          <Frame>
            {visible.map((u) => (
              <Row key={u.id} selected={selected?.id === u.id} onClick={() => setSelected(u)}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                  {initials(u)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{fullName(u)}</span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground-2">{u.email}</span>
                </span>
                {u.role === "admin" && (
                  <span className="shrink-0 rounded bg-accent-subtle px-1.5 py-0.5 text-[10px] font-semibold text-accent-strong">
                    ADMIN
                  </span>
                )}
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground-2">
                  {new Date(u.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </Row>
            ))}
            {visible.length === 0 && (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground-2">No accounts match.</p>
            )}
          </Frame>
        }
        detail={
          !selected ? (
            <Empty>Select an account to see their workspaces, runs and tickets.</Empty>
          ) : (
            <div className="flex flex-col gap-4">
              <Frame>
                <DetailHead
                  label="Account"
                  title={fullName(selected)}
                  right={
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {initials(selected)}
                    </span>
                  }
                />
                <Facts
                  rows={[
                    ["Email", <span key="e" className="font-mono">{selected.email}</span>],
                    ["Job title", selected.job_title || "—"],
                    ["Timezone", selected.timezone],
                    ["Joined", new Date(selected.created_at).toLocaleDateString()],
                    ["User ID", <span key="i" className="font-mono text-[11px]">{selected.id.slice(0, 18)}…</span>],
                  ]}
                />
                <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <span className="text-xs text-muted-foreground-2">Platform role</span>
                  <select
                    value={selected.role}
                    // Demoting yourself revokes the policy that renders this
                    // screen, and nothing here could undo it.
                    disabled={selected.id === me?.id || saving}
                    title={selected.id === me?.id ? "You can't change your own role" : undefined}
                    onChange={(e) => setRole(selected, e.target.value as AppRole)}
                    className="h-8 rounded-md border border-border-strong bg-background px-2 text-xs disabled:opacity-60"
                  >
                    <option value="subscriber">Subscriber</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </Frame>

              <Frame>
                <DetailHead label="Workspaces" title={`${detail?.workspaces.length ?? 0} membership(s)`} />
                <div className="px-4 py-3">
                  {(detail?.workspaces ?? []).map((w) => (
                    <div key={w.name + w.role} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="truncate text-xs">{w.name}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_TONE[w.role] ?? ""}`}>
                        {w.role}
                      </span>
                    </div>
                  ))}
                  {detail && detail.workspaces.length === 0 && (
                    <p className="py-2 text-xs text-muted-foreground-2">No workspace membership.</p>
                  )}
                  {!detail && <p className="py-2 text-xs text-muted-foreground-2">Loading…</p>}
                </div>
              </Frame>

              <Frame>
                <DetailHead label="Recent runs" title={`${detail?.runs.length ?? 0} shown`} />
                <div className="px-4 py-3">
                  {(detail?.runs ?? []).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-xs">{r.source_name}</span>
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
                  {detail && detail.runs.length === 0 && (
                    <p className="py-2 text-xs text-muted-foreground-2">No runs yet.</p>
                  )}
                </div>
              </Frame>

              <Frame>
                <DetailHead label="Tickets" title={`${detail?.tickets.length ?? 0} shown`} />
                <div className="px-4 py-3">
                  {(detail?.tickets ?? []).map((t) => (
                    // Opens the ticket in Support rather than duplicating the
                    // reader here - one place answers a ticket, not two.
                    <button
                      key={t.id}
                      onClick={() => onOpenTicket?.(t.id)}
                      className="group flex w-full items-center justify-between gap-3 rounded py-1.5 text-left transition-colors hover:bg-surface-muted"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs group-hover:text-accent-strong">{t.subject}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground-2">
                        {t.status}
                      </span>
                      <span aria-hidden className="shrink-0 text-muted-foreground-2 opacity-0 transition-opacity group-hover:opacity-100">
                        →
                      </span>
                    </button>
                  ))}
                  {detail && detail.tickets.length === 0 && (
                    <p className="py-2 text-xs text-muted-foreground-2">No tickets raised.</p>
                  )}
                </div>
              </Frame>
            </div>
          )
        }
      />
    </div>
  );
}
