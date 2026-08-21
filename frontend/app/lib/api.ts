/** The engine API. Every endpoint is POST multipart in, JSON out — the backend
 *  is stateless, so there is nothing to cache, no session, and no client. */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function post<T>(path: string, form: FormData, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: form, signal });
  if (!res.ok) {
    // FastAPI puts the useful message in `detail`; fall back to the status.
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `${path} failed (${res.status})`);
  }
  return res.json();
}

export function fileForm(fields: Record<string, File | string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return form;
}
