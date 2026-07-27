import type { Locale } from "./locale";

/**
 * FSI…PDI around one value — the string-land `<bdi>`, the same pair the i18n
 * `bidi` formatter adds. Applied per NAME rather than around the joined list:
 * a Latin name at the front would otherwise decide the direction of the whole
 * list, conjunction and all, and lay the Hebrew names out backwards.
 */
function isolate(value: string): string {
  return `⁨${value}⁩`;
}

/**
 * "A and B" / "A, B, and C" — in the reading language.
 *
 * Pinned to the app's `Locale`, never `navigator.language`: `en-GB` drops the
 * Oxford comma, which would make the rendered sentence depend on the machine
 * the browser happens to be running on. The English output reproduces the
 * `listNames` this replaced in `shared` (deleted with the rest of the rail
 * notice's prose), plus the invisible isolates.
 */
export function listNames(names: string[], locale: Locale): string {
  return new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  }).format(names.map(isolate));
}
