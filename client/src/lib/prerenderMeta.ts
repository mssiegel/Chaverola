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
import { initI18n } from "@/i18n";
import {
  DEFAULT_LOCALE,
  LOCALE_DIR,
  LOCALES,
  switchLocalePath,
  type Locale,
} from "@/lib/locale";
import { PAGE_META, pageMeta } from "@/lib/pageMeta";

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
   * Extra tags to insert before `</head>`. Empty today — this is the seam the
   * later SEO docs (Open Graph, canonical, hreflang) plug into, so the writer
   * script never needs to grow string logic of its own.
   */
  head: string[];
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
        head: [],
      });
    }
  }

  return pages;
}
