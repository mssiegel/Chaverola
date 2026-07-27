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
 * remembered". An explicit locale in the URL outranks all of this and never
 * reaches here — see `applyBootLocale`.
 *
 * `activityLocale` is the language the teacher set the activity up in, so a
 * whole class matches the projector rather than splitting by phone settings.
 * It arrives with the server work in a later slice and is undefined until then.
 */
export function preferredLocale(activityLocale?: Locale): Locale {
  return (
    activityLocale ??
    readSavedLocale() ??
    localeFromNavigator() ??
    DEFAULT_LOCALE
  );
}
