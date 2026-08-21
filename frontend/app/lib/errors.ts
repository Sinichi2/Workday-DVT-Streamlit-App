"use client";

import { ApiError } from "@/app/lib/api";

/* Errors go to the console, never to the screen.
 *
 * A deliberate product decision: no failure text is rendered anywhere in the
 * UI. This module is the single place that decides what a failure looks like,
 * so there is exactly one thing to change if that decision is revisited.
 *
 * Two rules the rest of the app still has to keep:
 *   - Silence is not success. A failed action must leave the UI in its prior
 *     state — never advance to a confirmation screen. "Message sent" over a
 *     failed insert is worse than any error message.
 *   - Clear the busy flag. A spinner that never stops is a hang, not an error. */

/** Report a failure. Returns nothing: there is no message for a caller to
 *  render, which makes it impossible to accidentally surface one. */
export function reportError(scope: string, err: unknown): void {
  const status = err instanceof ApiError ? err.status : undefined;
  const message = err instanceof Error ? err.message : String(err);

  // console.error keeps the stack and the devtools grouping. Grouped so a
  // failure reads as one entry rather than three loose lines.
  console.error(
    `[valigo] ${scope}${status ? ` (HTTP ${status})` : ""}: ${message}`,
    err instanceof Error ? err : undefined,
  );
}

/** Wrap an async action: runs it, reports any failure, and tells you whether
 *  it worked — so a caller can gate a success screen without ever holding an
 *  error string. */
export async function attempt<T>(scope: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    reportError(scope, err);
    return undefined;
  }
}
