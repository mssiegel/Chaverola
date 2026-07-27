/*
  The build-time half of the page meta: one `PrerenderPage` per public URL, for
  `client/scripts/prerender-head.mjs` to stamp into a copy of the built shell.

  THIS MODULE'S WHOLE IMPORT GRAPH IS EVALUATED IN NODE, at build time, with no
  DOM of any kind. Nothing reachable from here may touch `document`, `window`,
  or `localStorage` at module scope, and nothing may reach `lib/api.ts`, which
  throws at module init in a production build without `VITE_API_URL`.

  It lives under `src/` on purpose, not in `scripts/`: `tsconfig.app.json`
  includes `src`, so `tsc -b` typechecks it with the `@/` alias and the i18next
  key augmentation for free. Nothing in the app imports it, so it never enters
  a bundle.
*/
import type { TFunction } from "i18next";

import { initI18n } from "@/i18n";
import {
  DEFAULT_LOCALE,
  LOCALE_DIR,
  LOCALES,
  switchLocalePath,
  type Locale,
} from "@/lib/locale";
import { PAGE_META, pageMeta } from "@/lib/pageMeta";

/**
 * The site's one address, and the only place in TypeScript that spells it.
 * Docs 03 (canonical), 04 (sitemap) and 05 (structured data) import this rather
 * than each declaring their own; `og:url` and `og:image` need it because a
 * relative URL in either is ignored by most unfurlers.
 *
 * The apex, no `www`, and no trailing slash so callers can append a path
 * straight from `switchLocalePath`. `www.chaverola.com` 308s here from Vercel
 * dashboard config, which is ungreppable from the repo — see
 * docs/decisions/branding.md. The one mirror is `client/index.html`, which is a
 * static shell and cannot import.
 */
export const SITE_ORIGIN = "https://chaverola.com";

/**
 * One picture for every URL and both locales, so there is one file to keep in
 * sync with the brand and one thing for an unfurler to cache. 1200×630 is the
 * size Slack, WhatsApp and X all crop their preview from; the width and height
 * are tags rather than a lookup because an unfurler that reads them can lay the
 * card out before the image arrives. See docs/decisions/branding.md.
 */
const OG_IMAGE = `${SITE_ORIGIN}/og-card.png`;
const OG_IMAGE_WIDTH = "1200";
const OG_IMAGE_HEIGHT = "630";

/**
 * `og:locale` takes a language_TERRITORY tag, not the bare `he` that the URL
 * prefix and `<html lang>` use, so it needs its own map rather than the locale
 * itself. A third language adds one line here; `LOCALES` already drives which
 * ones become `og:locale:alternate`.
 */
const OG_LOCALE: Record<Locale, string> = { en: "en_US", he: "he_IL" };

/**
 * The page's own unfurl card. Nothing here is new copy: the title and
 * description are the same two strings `pageMeta` resolved for the `<title>`
 * and the description tag, so a link preview cannot say something the tab and
 * the search result don't.
 *
 * `client/index.html` carries a hand-written twin of this set for the URLs that
 * have no `PAGE_META` entry. `scripts/prerender-head.mjs` deletes that twin from
 * every file it stamps — one `og:title` per head, never two.
 */
function socialCard(
  common: TFunction,
  locale: Locale,
  url: string,
  title: string,
  description: string
): string[] {
  const tag = (property: string, content: string) =>
    `<meta property="${property}" content="${escapeHtml(content)}" />`;

  return [
    tag("og:type", "website"),
    tag("og:site_name", common("brand.name")),
    tag("og:title", title),
    tag("og:description", description),
    // Absolute, both of them. A relative URL in either is ignored by most
    // unfurlers, which is the whole reason SITE_ORIGIN exists.
    tag("og:url", `${SITE_ORIGIN}${url}`),
    tag("og:image", OG_IMAGE),
    tag("og:image:width", OG_IMAGE_WIDTH),
    tag("og:image:height", OG_IMAGE_HEIGHT),
    tag("og:image:alt", common("share.cardAlt")),
    tag("og:locale", OG_LOCALE[locale]),
    ...LOCALES.filter((other) => other !== locale).map((other) =>
      tag("og:locale:alternate", OG_LOCALE[other])
    ),
    // `name`, not `property`, and the only twitter:* tag on the page. The
    // reasoning for the omission is in index.html beside the twin.
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];
}

export interface PrerenderPage {
  /** Path under `dist/`, e.g. `he/activity/join/1234.html`. */
  file: string;
  /** The URL that file answers, e.g. `/he/activity/join/1234`. */
  url: string;
  lang: Locale;
  dir: "ltr" | "rtl";
  title: string;
  description: string;
  /**
   * Extra tags to insert before `</head>`, one per line, already whole. The
   * Open Graph card is what fills it today; canonical, hreflang and the
   * structured-data node (docs 03 and 05) append to the same list, which is what
   * keeps the writer script free of string logic of its own.
   */
  head: string[];
  /**
   * A `<noscript>` block to insert after `<div id="root"></div>`, already
   * indented for the body. `null` on every page that gets none — see
   * `homeNoscript` for which pages those are and why.
   */
  noscript: string | null;
}

/**
 * `&` first, or the ampersands the later rules emit get escaped again. Covers
 * attribute values and element text alike, which is why `"` is in the list.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Element text from a catalog string that may carry `<Trans>` placeholders —
 * `hero.title` is "… <1>In character.</1>", where `<1>` is the highlighter mark
 * `HomePage` passes down. Strip those BEFORE escaping, or the `<h1>` a crawler
 * reads says "&lt;1&gt;In character.&lt;/1&gt;". Escaping second is what keeps
 * a real `<` in future copy safe.
 */
function plainText(value: string): string {
  return escapeHtml(value.replace(/<\/?\d+>/g, ""));
}

/**
 * `PAGE_META`'s key strings are deliberately plain strings, not key-checked
 * (see `pageMeta.ts`), and i18next hands back the key itself on a miss. So a
 * renamed catalog key would otherwise ship a live site full of
 * `setup.meta.title`. This throw is the only thing between those two.
 */
function must(value: string, key: string, locale: Locale): string {
  if (!value || value === key) {
    throw new Error(
      `prerenderMeta: "${key}" is missing from the ${locale} catalogs ` +
        `(resolved to "${value}"). PAGE_META's keys are not typechecked — ` +
        `fix the key or the catalog.`
    );
  }
  return value;
}

/** `t` for a namespace picked at runtime; `must()` replaces the key checking. */
type LooseT = (key: string) => string;

/*
  Init BEFORE the namespace imports, and only once. `registerBundle` reaches
  through `i18n.store`, which exists only after `init()`, so a STATIC
  `import "@/i18n/ns/home"` would hoist above this line and throw — hence
  dynamic imports. And they have to run here, at module scope behind top-level
  await, rather than inside `prerenderPages()`: `runnerImport` closes its module
  runner the moment this module finishes evaluating, so a dynamic import
  awaited any later dies with "Vite module runner has been closed."

  One init covers both locales — `initI18n` loads `resources: { en, he }` and
  `registerBundle` adds every locale per namespace, so `getFixedT("he", …)`
  answers correctly off this single instance. Do not try to init twice. `chat`
  is not imported; no PAGE_META entry uses it. The order matches what
  `main.tsx` plus the lazy chunks produce at runtime.
*/
const i18n = initI18n(DEFAULT_LOCALE);
await Promise.all([
  import("@/i18n/ns/home"),
  import("@/i18n/ns/teacher"),
  import("@/i18n/ns/student"),
]);

/**
 * The homepage's own words in the body, for a reader that never runs
 * JavaScript: GPTBot, ClaudeBot, PerplexityBot, every link unfurler. Read from
 * the same `home` catalog through the same `t` the head uses, so it cannot
 * drift from what the page renders — and no new copy, so nothing here needs a
 * humanizer pass.
 *
 * A `<noscript>` block rather than a rendered React tree, and the reasons are
 * structural rather than stylistic (see docs/plans/seo/01, prompt 2): a browser
 * with JS never paints it, so the locale flash that disqualifies a real
 * rendered body is impossible rather than mitigated; it sits outside `#root`,
 * so `createRoot`'s container wipe can't reach it and there is no hydration
 * surface; and it executes no React at build time, so it can't break the build
 * or impose an SSR-safety rule on future component authors. Not cloaking: it is
 * a faithful subset of the rendered page from the same keys, and Googlebot's
 * second-wave render sees the real page regardless.
 *
 * ONLY `/` and `/he` get one. The two demo URLs deliberately get none — they
 * are pitch-email links whose whole value is the unfurl card, which is pure
 * `<head>`; body text there would be maintenance for no reader. The create and
 * join gates likewise: nobody reads a form.
 *
 * Keep it small. It ships inside the HTML of the two most-fetched URLs, and it
 * is text, not a page. Hebrew needs no `dir` of its own — the emitted
 * `<html dir="rtl">` governs it.
 */
function homeNoscript(t: LooseT, common: TFunction, locale: Locale): string {
  const text = (key: string) => plainText(must(t(key), key, locale));
  const href = (route: string) => escapeHtml(switchLocalePath(route, locale));

  return [
    `    <noscript>`,
    `      <h1>${text("hero.title")}</h1>`,
    `      <p>${text("hero.pitch")}</p>`,
    `      <p>${text("hero.stepsLabel")}</p>`,
    `      <ol>`,
    `        <li>${text("hero.step1")}</li>`,
    `        <li>${text("hero.step2")}</li>`,
    `        <li>${text("hero.step3")}</li>`,
    `      </ol>`,
    `      <h2>${text("how.eyebrow")}</h2>`,
    `      <ol>`,
    `        <li>${text("how.step1.title")}</li>`,
    `        <li>${text("how.step2.title")}</li>`,
    `        <li>${text("how.step3.title")}</li>`,
    `        <li>${text("how.step4.title")}</li>`,
    `      </ol>`,
    // The page's own two CTAs, and the only crawlable path from here into the
    // rest of the app — every other link on the homepage is a router click.
    // `nav.joinLong` lives in `common`, which is why this takes two `t`s; being
    // key-checked, it needs no `must` guard, same as `pageMeta`'s `brand.name`.
    `      <p><a href="${href("/activity/join")}">${plainText(common("nav.joinLong"))}</a></p>`,
    `      <p><a href="${href("/activity/create")}">${text("cta.host")}</a></p>`,
    `    </noscript>`,
  ].join("\n");
}

export async function prerenderPages(): Promise<PrerenderPage[]> {
  const pages: PrerenderPage[] = [];

  for (const locale of LOCALES) {
    // Two `t`s, not one. The fixed-namespace one resolves the page's own pair;
    // `pageMeta` needs a separate default-namespace one for `brand.name`, which
    // lives in `common`. There is no `fallbackNS`, so passing the page's `t` to
    // both would title every page "… | brand.name".
    const common = i18n.getFixedT(locale);

    for (const [route, entry] of Object.entries(PAGE_META)) {
      const t = i18n.getFixedT(locale, entry.ns) as unknown as LooseT;
      const meta = pageMeta(
        common,
        must(t(entry.title), entry.title, locale),
        must(t(entry.description), entry.description, locale)
      );

      // Through the app's own helper, never string concatenation: a third
      // locale would need no edit here. Same for `dir` — never a literal.
      const url = switchLocalePath(route, locale);

      pages.push({
        file: url === "/" ? "index.html" : `${url.slice(1)}.html`,
        url,
        lang: locale,
        dir: LOCALE_DIR[locale],
        title: meta.title,
        description: meta.description,
        head: socialCard(common, locale, url, meta.title, meta.description),
        noscript: route === "/" ? homeNoscript(t, common, locale) : null,
      });
    }
  }

  return pages;
}
