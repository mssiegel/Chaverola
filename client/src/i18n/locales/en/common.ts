import type { Catalog } from "../../types";

/**
 * The app shell: brand, navbar, language switcher, 404, the error floor.
 *
 * The only namespace registered at init, so it's the only one eager code (and
 * `PageErrorBoundary`, which sits outside the router) may read. Keep it small.
 */
export const common = {
  "brand.name": "Chaverola",
  "brand.home": "Chaverola home",

  "nav.joinLong": "Join an Activity",
  "nav.joinShort": "Join Activity",

  "language.change": "Change language",

  "student.signedInAs": "Signed in as ",

  "dialog.close": "Close",
  "dialog.dismiss": "Dismiss",

  "notFound.pageTitle": "Page Not Found",
  "notFound.eyebrow": "404",
  "notFound.title": "Nothing here 🫥",
  "notFound.body": "That page wandered off. Got a code from your teacher?",
  "notFound.backHome": "Back home",

  "error.title": "That didn't load 🫠",
  "error.body":
    "Something got stuck on the way here. Another go usually does it.",
  "error.retry": "Try again",
} as const satisfies Catalog;

export type CommonCatalog = typeof common;
