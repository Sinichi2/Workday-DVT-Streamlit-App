"use client";

/* The only way this app reaches a server.
 *
 * The browser no longer holds any Supabase configuration — no project URL, no
 * anon key. It authenticates against our own API, keeps the resulting token,
 * and sends it back. The backend forwards that token to PostgREST, so row-level
 * security still decides what any given request may see.
 *
 * The access token is still in the browser, and that is unavoidable: something
 * has to prove who you are on the next request. What is gone is the project
 * configuration and the ability to query tables the UI never intended. */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

const ACCESS = "valigo.access";
const REFRESH = "valigo.refresh";

export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string; email: string };
};

/* Kept in memory so most requests never touch storage; mirrored to
 * localStorage so a reload doesn't sign you out. */
let accessToken: string | null = null;

function store(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  accessToken = store()?.getItem(ACCESS) ?? null;
  return accessToken;
}

function setSession(s: Session | null) {
  accessToken = s?.access_token ?? null;
  const st = store();
  if (!st) return;
  if (s) {
    st.setItem(ACCESS, s.access_token);
    st.setItem(REFRESH, s.refresh_token);
  } else {
    st.removeItem(ACCESS);
    st.removeItem(REFRESH);
  }
  // Other tabs (and the session provider) react to this.
  window.dispatchEvent(new CustomEvent("valigo:auth", { detail: s }));
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal; auth?: boolean };

async function raw(path: string, o: Options = {}): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (o.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  if (o.body !== undefined) headers["Content-Type"] = "application/json";

  return fetch(`${BASE}${path}`, {
    method: o.method ?? (o.body !== undefined || o.form ? "POST" : "GET"),
    headers,
    body: o.form ?? (o.body !== undefined ? JSON.stringify(o.body) : undefined),
    signal: o.signal,
  });
}

async function request<T>(path: string, o: Options = {}): Promise<T> {
  let res = await raw(path, o);

  // One transparent retry after refreshing. Access tokens are short-lived, and
  // without this every session would break an hour in.
  if (res.status === 401 && o.auth !== false && store()?.getItem(REFRESH)) {
    const refreshed = await refresh();
    if (refreshed) res = await raw(path, o);
  }

  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => (typeof b?.detail === "string" ? b.detail : null))
      .catch(() => null);
    if (res.status === 401) setSession(null);
    throw new ApiError(detail ?? `${path} failed (${res.status})`, res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

async function refresh(): Promise<boolean> {
  const refresh_token = store()?.getItem(REFRESH);
  if (!refresh_token) return false;
  try {
    const res = await raw("/auth/refresh", { body: { refresh_token }, auth: false });
    if (!res.ok) {
      setSession(null);
      return false;
    }
    setSession((await res.json()) as Session);
    return true;
  } catch {
    setSession(null);
    return false;
  }
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>(path, { method: "POST", body, signal }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData, signal?: AbortSignal) => request<T>(path, { method: "POST", form, signal }),

  /** Public — the marketing contact form has no session. */
  postPublic: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body, auth: false }),
};

export const auth = {
  session: () => (getAccessToken() ? true : false),

  async signIn(email: string, password: string) {
    const s = await request<Session>("/auth/signin", { method: "POST", body: { email, password }, auth: false });
    setSession(s);
    return s;
  },

  async signUp(email: string, password: string, first_name: string, last_name: string) {
    const r = await request<{ session: Session | null; confirm_email: boolean }>("/auth/signup", {
      method: "POST",
      body: { email, password, first_name, last_name },
      auth: false,
    });
    if (r.session) setSession(r.session);
    return r;
  },

  async signOut() {
    // Best effort: the local session is cleared either way, so a network
    // failure can never leave someone looking signed in.
    try {
      await request("/auth/signout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setSession(null);
  },

  requestReset: (email: string, redirect_to?: string) =>
    request<{ ok: true }>("/auth/reset", { method: "POST", body: { email, redirect_to }, auth: false }),

  setPassword: (password: string) => request<{ ok: true }>("/auth/password", { method: "PUT", body: { password } }),

  /** The recovery link lands with tokens in the URL fragment. Adopting them
   *  here is what lets the reset screen call /auth/password as that user. */
  adoptFromUrlFragment(): boolean {
    if (typeof window === "undefined" || !window.location.hash) return false;
    const p = new URLSearchParams(window.location.hash.slice(1));
    const access_token = p.get("access_token");
    const refresh_token = p.get("refresh_token");
    if (!access_token || !refresh_token) return false;
    setSession({ access_token, refresh_token, user: { id: "", email: "" } });
    history.replaceState(null, "", window.location.pathname + window.location.search);
    return true;
  },

  onChange(fn: (signedIn: boolean) => void) {
    const handler = (e: Event) => fn(Boolean((e as CustomEvent).detail));
    const storage = (e: StorageEvent) => e.key === ACCESS && fn(Boolean(e.newValue));
    window.addEventListener("valigo:auth", handler);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("valigo:auth", handler);
      window.removeEventListener("storage", storage);
    };
  },
};

/** Multipart body from a mix of files and fields. */
export function fileForm(fields: Record<string, File | string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return form;
}
