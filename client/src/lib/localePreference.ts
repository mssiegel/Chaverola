import { readLocalJson, writeLocalJson } from "@/lib/storage";

import { DEFAULT_LOCALE, LOCALES, type Locale } from "./locale";

const KEY = "chaverola.locale";

export function readSavedLocale(): Locale | null {
  return readLocalJson(KEY, (parsed) =>
    typeof parsed === "string" &&
    (LOCALES as readonly string[]).includes(parsed)
      ? (parsed as Locale)
      : null
  );
}

export function saveLocale(locale: Locale): void {
  writeLocalJson(KEY, locale);
}

/*
  Did the visitor ASK for the language currently in the URL, or did we guess
  it for them? Only the two explicit acts count: a locale prefix that was
  already in the URL at boot, and picking one in the switcher. A bare path
  rewritten from `navigator.language` is a guess, and a guess is what an
  activity's own locale is allowed to overrule (see the precedence chain
  below). Module state, so a hard load re-decides from the URL — which is
  exactly right, because that URL is whatever the visitor just opened.
*/
let explicit = false;

export function markLocaleExplicit(): void {
  explicit = true;
}

export function localeIsExplicit(): boolean {
  return explicit;
}

/** The first supported language in the browser's preference list, if any. */
export function localeFromNavigator(): Locale | null {
  if (typeof navigator === "undefined") return null;
  const tags = navigator.languages ?? [navigator.language];
  for (const tag of tags) {
    const primary = tag.toLowerCase().split("-")[0];
    // "iw" is the retired ISO code for Hebrew; some Android builds still send it.
    const normalized = primary === "iw" ? "he" : primary;
    const hit = LOCALES.find((locale) => locale === normalized);
    if (hit) return hit;
  }
  return null;
}

/**
 * The precedence chain from DECISIONS.md → "Locale is detected once and
 * remembered". Two rungs outrank all of this and never reach here — see
 * `applyBootLocale`: a locked activity's pinned language, then an explicit
 * locale in the URL.
 *
 * `activityLocale` is the language the teacher set the activity up in, so a
 * whole class matches the projector rather than splitting by phone settings.
 * Nothing calls this with one: an activity resolves long after boot, so the
 * student flow applies that rung itself, in `JoinActivityPage` — this
 * signature is the chain written down in one place.
 */
export function preferredLocale(activityLocale?: Locale): Locale {
  return (
    activityLocale ??
    readSavedLocale() ??
    localeFromNavigator() ??
    DEFAULT_LOCALE
  );
}
