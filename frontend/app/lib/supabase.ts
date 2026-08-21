"use client";

import { createBrowserClient } from "@supabase/ssr";

/** One browser client for the whole app. `createBrowserClient` already memoises
 *  per-tab, so this is a convenience, not a second instance. */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type AppRole = "subscriber" | "admin";
export type WorkspaceRole = "owner" | "editor" | "viewer";

export type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  timezone: string;
  date_format: string;
  role: AppRole;
  created_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  go_live_date: string | null;
  minimum_score: number;
  critical_tolerance: number;
};

export type RunRow = {
  id: string;
  workspace_id: string;
  source_name: string;
  source_path: string | null;
  status: "running" | "complete" | "failed";
  total_rows: number;
  rows_passing: number;
  rows_failing: number;
  quality_score: number;
  created_at: string;
};

export type FindingRow = {
  id: string;
  run_id: string;
  row_num: number;
  field: string;
  rule_id: string | null;
  current_value: string | null;
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  suggested_fix: string | null;
  fixed_value: string | null;
};

export function fullName(p: Pick<Profile, "first_name" | "last_name" | "email">) {
  const name = `${p.first_name} ${p.last_name}`.trim();
  return name || p.email;
}

export function initials(p: Pick<Profile, "first_name" | "last_name" | "email">) {
  const a = p.first_name?.[0] ?? "";
  const b = p.last_name?.[0] ?? "";
  // Falling back to the email keeps the avatar from rendering empty for an
  // account that signed up without a name.
  return (a + b).toUpperCase() || p.email.slice(0, 2).toUpperCase();
}

/** Bearer token for the engine API. The backend verifies it against Supabase's
 *  JWKS, so the browser never has to be trusted about who it is. */
export async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
