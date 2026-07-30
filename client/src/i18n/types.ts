/**
 * A namespace's strings: flat, key → string. Nesting is deliberately not used
 * — dotted keys ("hero.title") read the same at the call site and keep both
 * the module augmentation and the en/he diff trivial.
 */
export type Catalog = Record<string, string>;

/** The plural bases an English catalog declares: "waiting" from "waiting_other". */
type PluralBase<K extends string> = K extends `${infer B}_other` ? B : never;

/**
 * The Hebrew shape of an English catalog: every English key, plus a `_two` for
 * every plural base.
 *
 * Hebrew's CLDR plural categories are one / two / other — `many` was dropped
 * in CLDR 40 and `Intl.PluralRules("he")` never selects it, so a `_many` key
 * would be dead weight. i18next delegates to Intl.PluralRules, so this is the
 * complete set.
 *
 * This type is the completeness gate: the Hebrew files ANNOTATE with it rather
 * than inferring, so a missing key is "Property 'x' is missing" and a typo is
 * an excess-property error. No extraction tooling, no runtime check.
 */
export type HebrewOf<T extends Catalog> = {
  [K in (keyof T & string) | `${PluralBase<keyof T & string>}_two`]: string;
};
