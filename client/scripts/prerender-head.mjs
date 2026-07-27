/*
  Stamps each public URL's own <head> into its own file under dist/, so a link
  unfurler or an AI crawler — none of which run JavaScript — reads that page's
  title and description instead of the shell's all-purpose pair. The homepage
  also gets a <noscript> body block, so the same readers can find out what
  Chaverola is and not only what it's called.

  Runs after `vite build`, as the last step of `pnpm build`. It is a dumb file
  writer: every string comes from `src/lib/prerenderMeta.ts`, which is typed and
  reads the same catalogs and the same `pageMeta()` the running app does.

  FAIL HARD, NEVER FAIL SOFT. A warn-and-keep-the-shell branch would produce a
  green deploy serving generic meta on every URL that nobody notices for a week
  — the same argument `src/lib/api.ts` makes about a silent localhost fallback.
*/
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { runnerImport } from "vite";

const CLIENT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(CLIENT, "dist");

/*
  `mode: "production"` below is NOT what makes `import.meta.env.DEV` false —
  this line is. `runnerImport` builds its environment through
  `resolveConfig(…, "serve")`, and Vite derives `isProduction` from
  `process.env.NODE_ENV` alone; `mode` only reaches `import.meta.env.MODE`.
  Without this, i18next's `debug: import.meta.env.DEV` dumps its entire resolved
  config into every `pnpm build`, and `saveMissing` turns on besides.
*/
process.env.NODE_ENV ??= "production";

/*
  EXACTLY ONE `runnerImport` CALL. Each one builds and closes its own
  environment, so a second would register namespaces into a different i18next
  instance than the one it inited.

  `runnerImport` forces `configFile: false`, which is why the `@` alias is
  repeated from vite.config.ts. `mode: "production"` makes `import.meta.env.DEV`
  false, matching the browser's production config.

  DO NOT RETRY THIS AS A PLUGIN IN vite.config.ts. The config file is bundled by
  rolldown with an `externalize-deps` plugin whose filter externalizes every
  specifier not starting with "." or "#", so `@/lib/locale` fails to resolve and
  `@chaverola/shared` is externalized as raw extensionless TS — config load then
  fails on EVERY Vite command, `vite dev` included. `runnerImport` is marked
  @experimental in Vite's types, but it is
  what Vite itself uses for `configLoader: 'runner'`, the version is pinned by
  pnpm-lock.yaml, and its failure mode is a loud build error rather than a
  silent prod regression. If it ever breaks, the drop-in is
  `createRunnableDevEnvironment`, not a redesign.
*/
const { module: meta } = await runnerImport(
  path.join(CLIENT, "src/lib/prerenderMeta.ts"),
  {
    root: CLIENT,
    mode: "production",
    resolve: { alias: { "@": path.join(CLIENT, "src") } },
    logLevel: "warn",
  }
);

/**
 * Replaces one marker, or throws naming it. Turns "someone reformatted
 * index.html" from a silent SEO regression into a red build. The patterns are
 * global so a second match is counted rather than quietly ignored, and the
 * replacement is a FUNCTION so a `$` inside a description can't trigger
 * `$&` / `` $` `` substitution.
 */
function replaceOnce(html, pattern, next, label) {
  let hits = 0;
  const out = html.replace(pattern, () => {
    hits += 1;
    return next;
  });
  if (hits !== 1) {
    throw new Error(
      `prerender-head: expected exactly 1 ${label} in the built shell, found ${hits}. ` +
        `client/index.html's head anchors are a contract — see the comment there.`
    );
  }
  return out;
}

/* Vite does not minify HTML, so the built shell is byte-identical to
   client/index.html in the head region, comments included, and string
   replacement needs no parser and no new dependency. The description tag spans
   three lines after Prettier, so its pattern has to cross newlines. */
const HTML_TAG = /<html lang="en" dir="ltr">/g;
const TITLE_TAG = /<title>Chaverola<\/title>/g;
const DESCRIPTION_TAG = /<meta\s+name="description"[\s\S]*?\/>/g;
const HEAD_CLOSE = /^ {2}<\/head>/gm;
/* The body seam. Only pages that carry a `noscript` string touch it, so a
   page without one is emitted byte-identically to before. */
const ROOT_DIV = /^ {4}<div id="root"><\/div>/gm;

function stamp(shell, page) {
  let html = shell;
  html = replaceOnce(
    html,
    HTML_TAG,
    `<html lang="${page.lang}" dir="${page.dir}">`,
    "<html lang/dir> tag"
  );
  html = replaceOnce(
    html,
    TITLE_TAG,
    `<title>${meta.escapeHtml(page.title)}</title>`,
    "<title> tag"
  );
  html = replaceOnce(
    html,
    DESCRIPTION_TAG,
    `<meta\n      name="description"\n      content="${meta.escapeHtml(page.description)}"\n    />`,
    "description meta tag"
  );
  // The extension seam: docs 02-05 add their tags through `page.head`, which is
  // empty today, so this is currently an identity replacement that still proves
  // the anchor is there.
  html = replaceOnce(
    html,
    HEAD_CLOSE,
    [...page.head.map((tag) => `    ${tag}`), "  </head>"].join("\n"),
    "</head> close tag"
  );
  // The homepage's words for a reader that never runs JS. Already indented by
  // prerenderMeta — this script owns no string logic, only anchors.
  if (page.noscript !== null) {
    html = replaceOnce(
      html,
      ROOT_DIV,
      `    <div id="root"></div>\n${page.noscript}`,
      "#root div"
    );
  }
  return html;
}

/*
  dist/app.html is the pristine shell, and it is what vercel.json's catch-all
  rewrite points at. dist/index.html has to carry the HOMEPAGE's meta (it is the
  only file Vercel can serve for `/`), so stamping it alone would hand every
  unmatched URL — a real host session, a real join code, the 404 — English
  homepage meta. Splitting the two is what keeps the shell's third-person
  description and bare-brand title serving the case they were written for.

  Reading app.html back when it exists is also what makes this script
  idempotent: a second run re-stamps from the same untouched template.
*/
const APP = path.join(DIST, "app.html");
const INDEX = path.join(DIST, "index.html");

async function readTemplate() {
  try {
    return await readFile(APP, "utf8");
  } catch {
    return readFile(INDEX, "utf8");
  }
}

/*
  EVERY PAGE IS WRITTEN TWICE, and both shapes are load-bearing.

  Vercel's filesystem phase does NOT strip `.html` (`cleanUrls` defaults off),
  measured on production 2026-07-27: `/he.html` served the stamped file while
  `/he` fell straight through the catch-all to app.html. So Vercel needs
  `he/index.html`. `vite preview` needs the opposite — its sirv runs with
  `extensions: []` and its htmlFallbackMiddleware only tries `…/index.html`
  when the URL ends in `/`, so without `he.html` there'd be no way to check
  your own work locally before a deploy.

  `/` is the one page that needs no twin: `dist/index.html` already is both.
*/
function targetsFor(page) {
  if (page.file === "index.html") return [page.file];
  return [page.file, page.file.replace(/\.html$/, "/index.html")];
}

const shell = await readTemplate();
await writeFile(APP, shell, "utf8");

const pages = await meta.prerenderPages();
let written = 0;
for (const page of pages) {
  const html = stamp(shell, page);
  for (const target of targetsFor(page)) {
    const out = path.join(DIST, target);
    await mkdir(path.dirname(out), { recursive: true });
    // UTF-8, no BOM. Hebrew ׳ (U+05F3) and ״ (U+05F4) are ordinary letters, not
    // ASCII quotes — nothing here converts them, and nothing should.
    await writeFile(out, html, "utf8");
    written += 1;
  }
}

console.log(
  `prerender-head: ${pages.length} pages in ${written} files + app.html — ${pages.map((page) => page.url).join(", ")}`
);
