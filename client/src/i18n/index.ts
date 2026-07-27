import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/locale";

import { common as enCommon } from "./locales/en/common";
import { common as heCommon } from "./locales/he/common";
import type { Catalog } from "./types";

/**
 * The app's i18next instance.
 *
 * Its OWN instance, not the i18next singleton, so a future prerender pass can
 * render `/` and `/he` in one process without the two runs sharing state.
 *
 * The router is the only source of truth for the active language: there is no
 * detector plugin, no cookie, no localStorage read in here. `LocaleEffects`
 * pushes the URL's locale down; nothing pushes back up. A second opinion that
 * can disagree with the URL is the whole failure mode to avoid.
 */
export const i18n = i18next.createInstance();

let started = false;

export function initI18n(locale: Locale) {
  if (started) return i18n;
  started = true;

  void i18n.use(initReactI18next).init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...LOCALES],
    defaultNS: "common",
    // `common` only. Every other namespace registers itself from i18n/ns/*.ts
    // inside the lazy page chunk that renders it, so its strings cost no extra
    // request — see registerBundle below.
    ns: ["common"],
    resources: {
      en: { common: enCommon },
      he: { common: heCommon },
    },
    interpolation: {
      // React escapes for us; double-escaping mangles apostrophes and quotes.
      escapeValue: false,
    },
    // Nothing here is async, so nothing can suspend — and a namespace that
    // registers late must never be able to hang a tree.
    react: { useSuspense: false },
    debug: import.meta.env.DEV,
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: import.meta.env.DEV
      ? (_lngs, ns, key) =>
          console.warn(
            `[i18n] missing ${ns}:${key} — is the namespace registered in this chunk?`
          )
      : undefined,
  });

  /*
    `{{name, bidi}}` — wraps an interpolated value in FSI…PDI (U+2068 / U+2069),
    the string-land equivalent of <bdi>. A teacher-typed Latin name inside a
    Hebrew sentence drags the trailing punctuation to the wrong side without
    it. Both marks are zero-width and inert in an LTR line, so English pays
    nothing for carrying them.

    Registered through the formatter service rather than
    `interpolation.format`: i18next 26 dropped that option from its types in
    favour of this, and named formatters compose (`{{n, bidi}}` can gain a
    second format later without rewriting one big switch).
  */
  i18n.services.formatter?.add("bidi", (value) => `⁨${value}⁩`);

  return i18n;
}

/**
 * Registers one namespace for every locale at once. Called from the side-effect
 * modules in `i18n/ns/`, which the lazy page modules import — so the strings
 * land in the page chunk that renders them.
 *
 * The `Record<Locale, …>` is the completeness gate: adding a language to
 * LOCALES makes every call site here a compile error until its file exists.
 */
export function registerBundle(
  ns: string,
  bundles: Record<Locale, Catalog>
): void {
  for (const locale of LOCALES) {
    i18n.addResourceBundle(locale, ns, bundles[locale], true, true);
  }
}
