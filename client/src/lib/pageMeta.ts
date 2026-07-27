import type { TFunction } from "i18next";

export interface PageMeta {
  title: string;
  description: string;
}

/**
 * The `<title>` and `<meta name="description">` for a page.
 *
 * Pure and React-free on purpose: the planned Vite prerender pass calls this
 * with a `getFixedT` and writes the same two strings into the HTML it emits,
 * so the runtime hook and the build-time renderer can't drift.
 *
 * "<page> | <brand>", page name first. The brand is itself a catalog key, so
 * `/he` reads "… | חברולה".
 */
export function pageMeta(
  t: TFunction,
  pageTitle: string,
  description: string
): PageMeta {
  return { title: `${pageTitle} | ${t("brand.name")}`, description };
}

/**
 * The prerenderable routes and the catalog keys that describe them, in one
 * table, so the prerender pass can walk it instead of importing every page
 * component. Keyed by the canonical (unprefixed) route; the pass renders each
 * one under every locale prefix.
 */
export const PAGE_META = {
  "/": { ns: "home", title: "meta.title", description: "meta.description" },
  "/activity/create": {
    ns: "teacher",
    title: "setup.meta.title",
    description: "setup.meta.description",
  },
  "/activity/join": {
    ns: "student",
    title: "title.join",
    description: "join.meta.description",
  },
} as const;
