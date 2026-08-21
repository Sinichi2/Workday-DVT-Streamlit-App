"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, auth, getAccessToken } from "@/app/lib/api";
import type { Profile, Workspace, WorkspaceRole } from "@/app/lib/supabase";

type Me = { profile: Profile | null; workspace: Workspace | null; workspace_role: WorkspaceRole | null };

type SessionState = {
  status: "loading" | "signed-out" | "ready";
  profile: Profile | null;
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
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("loading");

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setMe(null);
      setStatus("signed-out");
      return;
    }
    try {
      // One call: profile, workspace and role. The backend also creates a
      // first workspace if the account has none.
      setMe(await api.get<Me>("/auth/me"));
      setStatus("ready");
    } catch {
      setMe(null);
      setStatus("signed-out");
    }
  }, []);

  useEffect(() => {
    // A confirmation link arrives as `#access_token=…` on whatever page it
    // redirects to. Without this the token is dropped and the freshly
    // confirmed account lands on the sign-in screen.
    auth.adoptFromUrlFragment({ skipRecovery: true });
    void load();
    // Fires on sign-in, sign-out and token refresh — including from another tab.
    return auth.onChange(() => void load());
  }, [load]);

  const value = useMemo<SessionState>(
    () => ({
      status,
      profile: me?.profile ?? null,
      workspace: me?.workspace ?? null,
      workspaceRole: me?.workspace_role ?? null,
      isAdmin: me?.profile?.role === "admin",
      refresh: load,
      signOut: async () => {
        await auth.signOut();
      },
    }),
    [status, me, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
