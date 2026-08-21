"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Profile, type Workspace, type WorkspaceRole } from "@/app/lib/supabase";

type SessionState = {
  status: "loading" | "signed-out" | "ready";
  session: Session | null;
  profile: Profile | null;
  /** The workspace the user is acting in. First membership until there's a
   *  switcher backed by real state. */
  workspace: Workspace | null;
  /** The caller's role INSIDE that workspace — distinct from `isAdmin`, which
   *  is platform staff. Billing and workspace settings key off this. */
  workspaceRole: WorkspaceRole | null;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState | null>(null);

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("loading");

  const load = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setWorkspace(null);
      setWorkspaceRole(null);
      setStatus("signed-out");
      return;
    }
    // RLS restricts both of these to the caller, so no user filter is needed —
    // and adding one would imply the policy might not hold.
    const [{ data: prof }, { data: memberships }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
      supabase.from("workspace_members").select("role, workspace_id, workspaces(*)").limit(1),
    ]);
    setProfile((prof as Profile) ?? null);

    let ws = memberships?.[0]?.workspaces as Workspace | undefined;
    let role = (memberships?.[0]?.role as WorkspaceRole | undefined) ?? null;
    // First sign-in: give the account somewhere to work. The
    // `on_workspace_created` trigger makes the creator its owner, so this one
    // insert is the whole setup.
    if (!ws && prof) {
      const { data: created } = await supabase
        .from("workspaces")
        .insert({ name: "My Workspace", created_by: s.user.id })
        .select()
        .single();
      ws = (created as Workspace) ?? undefined;
      // The on_workspace_created trigger makes the creator its owner.
      role = "owner";
    }
    setWorkspace(ws ?? null);
    setWorkspaceRole(role);
    setStatus("ready");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void load(data.session);
    });
    // Fires on sign-in, sign-out, and token refresh — one subscription keeps
    // every tab in step without polling.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void load(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const value = useMemo<SessionState>(
    () => ({
      status,
      session,
      profile,
      workspace,
      workspaceRole,
      isAdmin: profile?.role === "admin",
      refresh: () => load(session),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [status, session, profile, workspace, workspaceRole, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
