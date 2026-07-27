import type { BeforeSend, BeforeSendEvent } from "@vercel/analytics/react";

import { DEMO_JOIN_CODE } from "@chaverola/shared";

import { localePrefix } from "@/lib/locale";

/*
  Vercel Web Analytics — pageview counts, and the one rule they have to obey.

  `/activity/host/:hostKey` carries the teacher's capability in the URL (see
  DECISIONS.md → "Host access is a URL capability"), and Vercel Analytics
  reports `location.href` verbatim. Vercel already sees that URL — it serves
  the request — but an analytics dashboard is a different surface from a CDN
  log: it lists paths in a UI, keeps them for the retention window, and turns
  any shared screenshot of the dashboard into a live credential leak. So the
  parameter is rewritten to its route pattern before the event leaves.

  This runs on every pageview, so it is the one piece here worth a test.
*/

/** Route patterns whose parameter must never be reported as its value. */
const REDACTIONS: readonly (readonly [RegExp, string])[] = [
  [/^\/activity\/host\/([^/]+)\/?$/, "/activity/host/:hostKey"],
  [/^\/activity\/join\/([^/]+)\/?$/, "/activity/join/:joinCode"],
];

/**
 * The URL an analytics event may carry.
 *
 * Keeps the locale prefix — `/he` versus `/` is worth counting separately and
 * hides nothing. Drops the query and hash wholesale rather than allowlisting
 * params: `?fast` is the only one the app itself uses, and anything else in
 * there arrived from outside.
 *
 * The demo's `1234` survives redaction on purpose. It is printed in the README
 * and pasted into pitch emails, so it is public by construction — and demo
 * traffic is exactly the number a pitch is trying to move.
 */
export function redactAnalyticsUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // A malformed url is not worth reporting a guess about.
    return raw;
  }

  const prefix = localePrefix(url.pathname);
  const bare = url.pathname.slice(prefix.length) || "/";

  let redacted = bare;
  for (const [pattern, replacement] of REDACTIONS) {
    const match = pattern.exec(bare);
    if (!match) continue;
    redacted = match[1] === DEMO_JOIN_CODE ? bare : replacement;
    break;
  }

  // Home is the prefix itself ("/he", not "/he/") — the same shape
  // useLocalePath builds, so both sides agree on what one page is called.
  const path = redacted === "/" ? prefix || "/" : `${prefix}${redacted}`;
  return `${url.origin}${path}`;
}

/**
 * Declared once at module scope rather than inline in App, so `<Analytics>`
 * receives the same function identity on every render.
 */
export const redactBeforeSend: BeforeSend = (
  event: BeforeSendEvent
): BeforeSendEvent => ({ ...event, url: redactAnalyticsUrl(event.url) });
