import { useLocation, useNavigate } from "react-router-dom";

/**
 * Chaverola mirrors every route under a locale prefix. English is the
 * unprefixed one (`/`), Hebrew lives at `/he` and renders right-to-left. The
 * URL is the single source of truth for the active language: `LocaleEffects`
 * pushes it into i18next and onto `<html lang/dir>`, and nothing pushes back.
 *
 * Adding a third language is three entries — `LOCALES`, `LOCALE_DIR`,
 * `LOCALE_NAME` — plus its catalog files. Nothing else in this file changes.
 */
export const LOCALES = ["en", "he"] as const;
export type Locale = (typeof LOCALES)[number];

/** The unprefixed locale. Also the fallback whenever nothing else decides. */
export const DEFAULT_LOCALE: Locale = "en";

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
