"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Panel } from "@/app/components/ui/Primitives";
import { fullName, initials, supabase, type AppRole, type Profile } from "@/app/lib/supabase";
import { useSession } from "@/app/lib/session";

export default function AdminUsers() {
  const { profile: me } = useSession();
  const [users, setUsers] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setUsers((data as Profile[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q) || fullName(u).toLowerCase().includes(q));
  }, [users, query]);

  async function setRole(user: Profile, role: AppRole) {
    setSaving(user.id);
    setError(null);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", user.id);
    setSaving(null);
    if (error) {
      setError(error.message);
      return;
    }
    setUsers((us) => us.map((u) => (u.id === user.id ? { ...u, role } : u)));
  }

  return (
    <div className="mx-auto w-full max-w-[1024px] px-4 py-6 sm:px-8">
      <h1 className="text-[22px] font-semibold leading-[33px]">Users</h1>
      <p className="pt-1 text-sm text-muted-foreground">Every account on the platform and its access level.</p>

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-critical-subtle px-4 py-3 text-xs font-medium text-critical-text">
          {error}
        </p>
      )}

      <div className="relative pt-6">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 mt-3 -translate-y-1/2 text-muted-foreground-2"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
          placeholder="Search by name or email…"
          className="h-[38px] w-full max-w-[320px] rounded-lg border border-border-strong bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground-2"
        />
      </div>

      <Panel className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border-strong text-xs font-medium text-muted-foreground-2">
              <th scope="col" className="px-5 py-3 font-medium">User</th>
              <th scope="col" className="py-3 pr-4 font-medium">Job title</th>
              <th scope="col" className="py-3 pr-4 font-medium">Joined</th>
              <th scope="col" className="px-5 py-3 font-medium">Platform role</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {initials(u)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{fullName(u)}</span>
                      <span className="block truncate text-xs text-muted-foreground-2">{u.email}</span>
                    </span>
                  </span>
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">{u.job_title || "—"}</td>
                <td className="py-3 pr-4 text-xs text-muted-foreground-2">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  <select
                    value={u.role}
                    // Demoting yourself would revoke the very policy letting you
                    // see this table, and nothing here could undo it.
                    disabled={u.id === me?.id || saving === u.id}
                    title={u.id === me?.id ? "You can't change your own role" : undefined}
                    onChange={(e) => setRole(u, e.target.value as AppRole)}
                    className="h-[32px] rounded-lg border border-border-strong bg-surface px-2 text-xs disabled:opacity-60"
                  >
                    <option value="subscriber">Subscriber</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="px-5 py-10 text-center text-xs text-muted-foreground-2">No users match this search.</p>
        )}
      </Panel>
    </div>
  );
}
