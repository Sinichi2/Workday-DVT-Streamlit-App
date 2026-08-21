/** Canonical public origin. Lives in a plain module, not in app/robots.ts:
 *  Next treats metadata route files specially and a second named export there
 *  makes them emit nothing at all — silently, with a 200 and an empty body. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://valigo.com").replace(/\/$/, "");
