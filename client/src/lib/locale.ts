import { useLocation, useNavigate } from "react-router-dom";

import { DEFAULT_LOCALE, LOCALES } from "@chaverola/shared";
import type { Locale } from "@chaverola/shared";

/**
 * Chaverola mirrors every route under a locale prefix. English is the
 * unprefixed one (`/`), Hebrew lives at `/he` and renders right-to-left. The
 * URL is the single source of truth for the active language: `LocaleEffects`
 * pushes it into i18next and onto `<html lang/dir>`, and nothing pushes back.
 *
 * `LOCALES` / `Locale` / `DEFAULT_LOCALE` are re-exported from
 * `@chaverola/shared` — an activity stores the language it was created in, so
 * the list is wire contract now, and this is the same shim pattern
 * `types/activity.ts` uses. Every `@/lib/locale` import site stays valid.
 *
 * Adding a third language is one entry in shared's `LOCALES` plus two here —
 * `LOCALE_DIR`, `LOCALE_NAME` — and its catalog files. Nothing else changes.
 */
export { DEFAULT_LOCALE, LOCALES };
export type { Locale };

export const LOCALE_DIR: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  he: "rtl",
};

/** Compact trigger label for the navbar switcher. */
export const LOCALE_INITIALS: Record<Locale, string> = {
  en: "EN",
  he: "עב",
};

/** Each language's name in itself — a Hebrew reader looks for עברית. */
export const LOCALE_NAME: Record<Locale, string> = {
  en: "English",
  he: "עברית",
};

/**
 * A runtime guard for a value that only TYPES as a Locale. The one caller is
 * the student flow's locale inheritance: `Activity.locale` is required on the
 * wire, but during a deploy window an older server answers without it, and
 * navigating to `/undefined/...` would be a much worse bug than not
 * inheriting.
 */
export function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly string[]).includes(value as string);
}

const PREFIXED = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

export function localePrefix(pathname: string): string {
  const hit = PREFIXED.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  return hit ? `/${hit}` : "";
}

/** The locale a pathname is under. Unprefixed means the default. */
export function localeFromPathname(pathname: string): Locale {
  const prefix = localePrefix(pathname);
  return prefix ? (prefix.slice(1) as Locale) : DEFAULT_LOCALE;
}

export function useLocale(): Locale {
  return localeFromPathname(useLocation().pathname);
}

/**
 * Rewrites a pathname to the given locale, keeping the rest of the path
 * intact — e.g. ("/activity/join", "he") → "/he/activity/join" and
 * ("/he/activity/join", "en") → "/activity/join". Used by the navbar's
 * language switcher to swap locales in place.
 */
export function switchLocalePath(pathname: string, locale: Locale): string {
  const prefix = localePrefix(pathname);
  const bare = prefix ? pathname.slice(prefix.length) : pathname;
  const normalized = bare === "" ? "/" : bare;
  if (locale === DEFAULT_LOCALE) return normalized;
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

/**
 * Returns a function that prefixes an app-absolute path (e.g. `/activity/join`)
 * with the active locale prefix.
 */
export function useLocalePath(): (path: string) => string {
  const { pathname } = useLocation();
  const prefix = localePrefix(pathname);
  return (path: string) => {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    // Home is the prefix itself ("/he", not "/he/").
    if (normalized === "/") return prefix || "/";
    return `${prefix}${normalized}`;
  };
}

/**
 * `useNavigate` that applies the active locale prefix, so programmatic
 * navigation can't forget it. Use this instead of pairing `useNavigate`
 * with `useLocalePath` by hand.
 */
export function useLocaleNavigate(): (path: string) => void {
  const navigate = useNavigate();
  const localePath = useLocalePath();
  return (path: string) => navigate(localePath(path));
}
