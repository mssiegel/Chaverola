import {
  DEFAULT_LOCALE,
  localeFromPathname,
  LOCALE_DIR,
  switchLocalePath,
  type Locale,
} from "./locale";
import {
  markLocaleExplicit,
  preferredLocale,
  saveLocale,
} from "./localePreference";

/**
 * Decides the page load's locale and, if the URL doesn't already say, rewrites
 * it. Runs exactly once from `main.tsx`, BEFORE `createRoot`.
 *
 * Not a component and not a route element, deliberately. A component would
 * have to fire on every navigation and be told not to (module state written
 * during render, which the React Compiler's Rules-of-React lint rightly
 * refuses), and a `<Navigate>` would paint one English frame first. Doing it
 * here solves both: BrowserRouter reads an already-rewritten URL, so frame 1
 * is Hebrew and RTL, and there is no render-phase side effect anywhere.
 *
 * `replaceState`, not pushState: "/" never enters history, so Back from /he
 * goes wherever the visitor actually came from.
 *
 * Only unprefixed URLs are ever rewritten. "/he" IS the choice — remembered
 * and left alone. That's what stops a visitor who deliberately picked English
 * from being bounced back by their own browser settings on the next load.
 *
 * A rewrite here is a GUESS, not a choice, so it doesn't call
 * `markLocaleExplicit` — that's what lets a Hebrew activity's join link land a
 * student on Hebrew even though their phone said otherwise, and equally an
 * English activity's link land them on English.
 */
export function applyBootLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE; // prerender-safe
  const { pathname, search, hash } = window.location;

  const urlLocale = localeFromPathname(pathname);
  if (urlLocale !== DEFAULT_LOCALE) {
    // A prefix that was already in the URL is the visitor's own choice, and
    // outranks even the activity's language once a join code resolves.
    markLocaleExplicit();
    saveLocale(urlLocale);
    return urlLocale;
  }

  const wanted = preferredLocale();
  if (wanted === DEFAULT_LOCALE) return DEFAULT_LOCALE;

  saveLocale(wanted);
  window.history.replaceState(
    null,
    "",
    `${switchLocalePath(pathname, wanted)}${search}${hash}`
  );
  return wanted;
}

/**
 * Stamps the document before React mounts, so a hard load of /he paints RTL on
 * frame 1 instead of flipping a frame later. `LocaleEffects` keeps it in sync
 * from then on.
 */
export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = LOCALE_DIR[locale];
}
