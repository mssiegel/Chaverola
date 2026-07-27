import { useLayoutEffect } from "react";

import { i18n } from "@/i18n";
import { LOCALE_DIR, useLocale } from "@/lib/locale";

/**
 * Pushes the URL's locale into i18next and onto `<html>`. One-way, always:
 * route → i18next → document. i18next has no detector of its own, so it can
 * never disagree with the URL.
 *
 * `useLayoutEffect` for the same reason `ScrollToTop` uses one — a language
 * switch has to land before paint, or the new page shows a frame in the old
 * language AND the old direction, which is a full-width layout jump.
 *
 * The `!==` guard is what stops a loop: `changeLanguage` fires
 * `languageChanged`, react-i18next re-renders every `t()` subscriber,
 * `useLocale` returns the same value, the dep array is unchanged, nothing
 * fires again.
 *
 * `lang`/`dir` go on `<html>`, not `<body>`, so Radix and emoji-picker portals
 * appended to `document.body` inherit them.
 */
export function LocaleEffects() {
  const locale = useLocale();

  useLayoutEffect(() => {
    if (i18n.resolvedLanguage !== locale) void i18n.changeLanguage(locale);
    const root = document.documentElement;
    root.lang = locale;
    root.dir = LOCALE_DIR[locale];
  }, [locale]);

  return null;
}
