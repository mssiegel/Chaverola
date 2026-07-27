# 01 — Every URL ships its own head

State: **Not started**

**The problem.** Ten public URLs share one `<head>`. `usePageMeta`
([`usePageMeta.ts`](../../../client/src/lib/usePageMeta.ts)) sets the title
and description inside a `useEffect`, so only a browser that runs the JS
ever sees them. Slack, WhatsApp, Gmail and LinkedIn fetch raw HTML and
parse; GPTBot, ClaudeBot and PerplexityBot download JS but never execute
it; Bing takes its `<title>` from the initial response even when it later
renders. Every one of them reads
[`client/index.html`](../../../client/index.html) and gets the bare word
"Chaverola" plus one all-purpose sentence — for the homepage, the teacher
setup page, the join gate, and both demo pages alike.

So the ten meta pairs rewritten in `ca5ddba` are, to every consumer that
matters for a pasted link, invisible. `/demo` is the URL that gets said out
loud in a meeting and pasted into an email to a principal, and it unfurls
as generic product copy.

The groundwork is already in the repo, unused.
[`pageMeta.ts`](../../../client/src/lib/pageMeta.ts) holds a pure,
React-free `pageMeta()` and a route-keyed `PAGE_META` table that **nothing
imports** — its own doc comment says it exists "so the runtime hook and the
build-time renderer can't drift".
[`i18n/index.ts`](../../../client/src/i18n/index.ts) creates its own
i18next instance "so a future prerender pass can render `/` and `/he` in
one process without the two runs sharing state".
[`localeBoot.ts:38`](../../../client/src/lib/localeBoot.ts) already carries
a `// prerender-safe` guard. Consume all three; don't rebuild them.

**Decisions in play.**

- "The meta title is written for a search result, not for the page, and the
  demo carries its own" ([`branding.md`](../../decisions/branding.md)) —
  this doc ships the half that entry deferred. **No string changes.** The
  copy is settled; only its delivery changes.
- "The shell `<title>` stays the bare brand" (same entry) — **still true**,
  and prompt 1 is what makes it precisely true rather than a compromise.
  After this prompt the bare shell serves only unmatched URLs, which is
  exactly the case it was written for.
- "Routes are canonical — don't invent new ones"
  ([`AGENTS.md`](../../../AGENTS.md)) — **stands**. The emitted `.html`
  files are build artifacts under `dist/`, not routes. Nothing changes in
  [`App.tsx`](../../../client/src/App.tsx).
- "English keeps the bare paths; `/he` is the Hebrew prefix"
  ([`routes.md`](../../decisions/routes.md)) — the emitter derives every
  URL through the app's own `switchLocalePath`, so a third locale would
  need no edit here.

**Prompt order.** Sequential. Prompt 1 builds the emitter every other doc
in this directory extends; nothing else here works without it. Prompt 2 is
purely additive on top of it. **Prompt 3 is gated on a founder call** — read
its risk record before starting it, and do not run it just because it is
next.

- [x] Prompt 1 — Ten URLs, ten heads
- [ ] Prompt 2 — The words are in the HTML, without a rendered body
- [ ] Prompt 3 — A rendered body (gated — read the risk record first)

---

## Prompt 1 — Ten URLs, ten heads

**Goal:** a link to any of the ten public URLs unfurls with that page's own
title and description, in that page's own language, without a browser
running any JavaScript.

1. **The typed half:** a new `client/src/lib/prerenderMeta.ts`, beside
   [`pageMeta.ts`](../../../client/src/lib/pageMeta.ts). It lives under
   `src/` on purpose — `tsconfig.app.json`
   includes `src`, so `tsc -b` typechecks it with the `@/` alias and the
   i18next key augmentation for free. Nothing in the app imports it, so it
   never enters a bundle. Export:
   - `interface PrerenderPage { file, url, lang, dir, title, description, head: string[] }`
   - `escapeHtml(value)` — `&` first, then `<`, `>`, `"`.
   - `async prerenderPages(): Promise<PrerenderPage[]>` — walks `LOCALES` ×
     `PAGE_META`.

   Three traps, all of which must be handled and commented:
   - **Init before the namespace imports.** `registerBundle` reaches through
     `i18n.store`, which exists only after `init()`. A static
     `import "@/i18n/ns/home"` evaluates before the module body and throws.
     Call `initI18n(DEFAULT_LOCALE)`, then
     `await Promise.all([import("@/i18n/ns/home"), …teacher, …student])` —
     the same order `main.tsx` plus the lazy chunks produce at runtime.
     `chat` is not needed; no `PAGE_META` entry uses it.
   - **One init, both locales.** `initI18n` has a module-level `started`
     guard and loads `resources: { en, he }`, and `registerBundle` adds
     every locale per namespace. A single instance answers
     `getFixedT("he", …)` correctly. Do not try to init twice.
   - **Two `t`s, not one.** `pageMeta()` calls `t("brand.name")`, which
     lives in `common`. Pass `getFixedT(locale, entry.ns)` to resolve the
     page's pair, and a separate `getFixedT(locale)` as `pageMeta`'s first
     argument. One fixed-namespace `t` makes every title read
     "… | brand.name", since there is no `fallbackNS`.

   Add a `must(value, key, locale)` guard that **throws** when a resolved
   value is empty or equal to its key. `PAGE_META`'s key strings are
   deliberately plain strings, not key-checked, and i18next returns the key
   on a miss — this guard is the only thing between a renamed catalog key
   and a live site full of `setup.meta.title`.

   Derive each URL with `switchLocalePath(route, locale)` from
   [`locale.ts`](../../../client/src/lib/locale.ts) rather than string
   concatenation, and `dir` from `LOCALE_DIR[locale]`, never a literal.
   Then `file = url === "/" ? "index.html" : url.slice(1) + ".html"`.

   Head the module with a comment stating that its import graph is
   evaluated **in Node at build time**: nothing reachable from it may touch
   `document`, `window`, or
   [`lib/api.ts`](../../../client/src/lib/api.ts), which throws at module
   init in a production build without `VITE_API_URL`.

2. **The writer:** new `client/scripts/prerender-head.mjs`, a dumb file
   writer with no string logic of its own. It loads the typed half through
   **`runnerImport` from `vite`** — already a devDependency, so zero new
   packages:

   ```js
   const { module: meta } = await runnerImport(
     path.join(CLIENT, "src/lib/prerenderMeta.ts"),
     {
       root: CLIENT,
       mode: "production",
       resolve: { alias: { "@": path.join(CLIENT, "src") } },
       logLevel: "warn",
     }
   );
   ```

   **Exactly one `runnerImport` call.** Each call builds and closes its own
   environment, so a second one would register namespaces into a different
   i18next instance than the one it inited. `runnerImport` forces
   `configFile: false`, which is why the alias is repeated from
   `vite.config.ts`; `mode: "production"` makes `import.meta.env.DEV` false,
   matching the browser's production config.

   **Do not attempt this as a Vite plugin in `vite.config.ts`** — write the
   reason down so nobody retries it. The config file is bundled by rolldown
   with an `externalize-deps` plugin whose filter is `/^[^.#].*/`, so
   `@/lib/locale` fails to resolve and `@chaverola/shared` is externalized
   as raw extensionless TS. Config load then fails on _every_ Vite command,
   including `vite dev`. `runnerImport` is marked `@experimental` in Vite's
   types; it is what Vite itself uses for `configLoader: 'runner'`, the
   version is pinned by `pnpm-lock.yaml`, and its failure mode is a loud
   build error rather than a silent prod regression. If it ever breaks, the
   drop-in is `createRunnableDevEnvironment`, not a redesign.

   Editing technique: **string replacement, no parser, no new dependency.**
   Vite does not minify HTML — the built `dist/index.html` is byte-identical
   to the shell in the head region, comments included. Three anchors:
   `<html lang="en" dir="ltr">`, `<title>Chaverola</title>`, and the
   description tag, which **spans three lines** (a single-line regex fails;
   use `/<meta\s+name="description"[\s\S]*?\/>/`). Then insert `page.head`
   before `</head>` — that insertion point is the extension seam docs 02,
   03, 04 and 05 all plug into.

   Two details that are each a real bug if missed: use a replacer
   **function**, not a replacement string, so a `$` inside a description
   can't trigger `$&`/`` $` `` substitution; and wrap every replacement in a
   `replaceOnce(html, pattern, next, label)` that **throws** unless it
   matched exactly once, naming the marker. That turns "someone reformatted
   `index.html`" from a silent SEO regression into a red build.

   Write UTF-8 with no BOM. Hebrew `׳` (U+05F3) and `״` (U+05F4) are
   ordinary letters, not ASCII quotes — never convert them. Apostrophes
   need no escaping inside a double-quoted attribute.

3. **The build chain:** `client/package.json` →
   `"build": "tsc -b && vite build && node scripts/prerender-head.mjs"`.
   No new scripts, no new dependencies. **Fail hard, never fail soft** — a
   warn-and-keep-the-shell branch produces a green deploy serving generic
   meta on every URL that nobody notices for a week, the same argument
   [`api.ts:26-31`](../../../client/src/lib/api.ts) already makes about a
   silent localhost fallback. `pnpm build` is the gate; let it be one.

4. **The fallback split — the trap in this prompt.** `dist/index.html` must
   be stamped with the homepage's meta, because it is the only file Vercel
   can serve for `/`. But
   [`client/vercel.json`](../../../client/vercel.json)'s catch-all points at
   `/index.html`, so stamping it alone hands **every unmatched URL** —
   a real host session, a real 4-digit join code, the 404, every `/he/…`
   session — English homepage meta. That breaks the recorded reason the
   shell description is written in third person ("it has to read correctly
   on a student URL too") and the reason its title stays the bare brand.

   So: write a pristine, unstamped copy of the built shell as
   `dist/app.html` **first**, then stamp from it, and repoint the rewrite:

   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/app.html" }] }
   ```

   Vercel's filesystem check runs before rewrites, so `/` hits the stamped
   `dist/index.html` and the ten prerendered files win on the filesystem;
   everything else falls through to the untouched shell, exactly as today.
   `app.html` doubling as the template is also what makes the script
   idempotent — read `dist/app.html` if it exists, else `dist/index.html`.

   **File layout is `dist/<path>.html`, not `dist/<path>/index.html`.**
   `vite preview`'s sirv runs with `extensions: []` and its
   `htmlFallbackMiddleware` tries `pathname + ".html"`, only trying
   `…/index.html` when the URL ends in `/` — the nested shape would leave
   no way to check your own work locally. **Verify on a Vercel preview
   deploy before trusting it in production:** planning could not settle
   whether Vercel's filesystem phase resolves `/he` → `dist/he.html`. One
   `curl` decides it. If it does not resolve, emit both shapes; do not
   guess.

5. **The shell comment:** rewrite
   [`client/index.html:24-33`](../../../client/index.html). It currently
   claims this pair is "the ONLY one a link-preview bot ever sees", which
   stops being true for ten URLs. New text: this pair is the fallback
   served through `app.html` for everything that isn't prerendered — real
   sessions, 404s — which is exactly why the title stays the bare brand;
   and note that `scripts/prerender-head.mjs` matches the three anchors
   literally, so editing them is editing a contract.

6. **Docs:** one line in [`architecture.md`](../../architecture.md) beside
   the existing `pageMeta.ts` paragraph, which already says "a future
   prerender pass". Decision entry in
   [`branding.md`](../../decisions/branding.md) + its
   [`DECISIONS.md`](../../../DECISIONS.md) index line, covering the two
   non-obvious calls: the `app.html` fallback split, and `runnerImport` over
   a config-file plugin.

7. **Demo parity:** the two demo URLs are in `PAGE_META` and get stamped
   like any other — that IS the demo work, and it is the highest-value part
   of this prompt. Nothing in the demo engine changes.

**Edge cases:** `vite build` empties `outDir` every run, so there is no
stale-file cleanup to write. `dist/activity/join.html` and the directory
`dist/activity/join/` coexist without conflict. `/app` and `/app.html`
become publicly reachable and boot the SPA into the 404 page — harmless.
`vite preview` hardcodes its SPA fallback to `/index.html`, so it
**structurally cannot** validate the `app.html` rewrite; locally an
unmatched URL will show homepage meta, and that check belongs on a preview
deploy. A bare `vite build` (without the script) leaves no `app.html` and
would 404 unmatched paths on Vercel — one more reason the step fails hard.
Deferred deliberately: `/he/*` unmatched paths still fall back to the
English shell; fixing that needs a new Hebrew shell-description catalog
key, so it belongs to doc [03](03-google-knows-which-url-is-the-real-one.md).

**Tests:** none. `client/vitest.config.ts` is `environment: "node"`, so a
test of `prerenderPages()` would be possible — but the build already throws
on every condition a test would assert, and the repo's stated preference is
fewer tests.

**Done when:** `pnpm typecheck` and `pnpm lint` green; `pnpm build` emits
11 HTML files. Then the assertions that actually prove it, none of which
use a browser — a Playwright pass would give a **false pass**, because it
runs the JS and `usePageMeta` sets the title whether or not the file was
prerendered:

- `dist/he/activity/join/1234.html` has `<html lang="he" dir="rtl">` and
  `<title>דמו לתלמיד: לקבל דמות סודית | חברולה</title>`
- `dist/app.html` still has `<html lang="en" dir="ltr">` and
  `<title>Chaverola</title>`
- no emitted file anywhere contains the literal `| brand.name`
- `pnpm preview`, then `curl.exe -s http://localhost:4173/activity/create`
  and `/he` and `/he/activity/join/1234` — per-URL strings, no JS executed
  at any point. This is the whole proof. (PowerShell: `curl.exe`, not
  `curl`, which aliases `Invoke-WebRequest`.)
- On the Vercel preview deploy:
  `curl -s https://<preview>/activity/host/notarealkey` returns
  `<title>Chaverola</title>` — the one assertion `vite preview` cannot make,
  and the one that proves the `app.html` rewrite is live.

Decision entry in this commit. `pnpm format`, one commit to `main`, push,
tick this box.

**As landed, two corrections to the above — both matter to prompts 2-5,
which extend the same two files:**

- **The namespace imports must run at module scope, behind top-level
  `await`, not inside `prerenderPages()`.** `runnerImport` closes its module
  runner the moment the imported module finishes evaluating, so a dynamic
  `import()` awaited any later dies with "Vite module runner has been
  closed." `initI18n` still runs first, on the line above them — the
  init-before-imports trap is real, the placement is just higher up.
- **`mode: "production"` does not make `import.meta.env.DEV` false.**
  `runnerImport` resolves its config with `command: "serve"`, and Vite 8
  derives `isProduction` from `process.env.NODE_ENV` alone; `mode` only
  reaches `import.meta.env.MODE`. Left alone, i18next's
  `debug: import.meta.env.DEV` dumps its whole resolved config into every
  build. The script sets `process.env.NODE_ENV ??= "production"` before the
  import.

- **Vercel's filesystem phase does NOT resolve `/he` → `dist/he.html`**, so
  this doc's contingency applied and every page is emitted in **both**
  shapes. Measured on production 2026-07-27 with the flat shape live:
  `/he.html` returned the stamped Hebrew title, `/he` fell through the
  catch-all to `app.html`. `cleanUrls: true` would fix it in one line and
  was rejected — it also rewrites `/app.html` to `/app`, which is the
  destination every real session URL and every 404 passes through, so it
  buys one fewer static file for a redirect hop on the join path.

The `app.html` rewrite itself is confirmed live: `/activity/host/notarealkey`
returns `<title>Chaverola</title>`, not the homepage's.

---

## Prompt 2 — The words are in the HTML, without a rendered body

**Goal:** an AI crawler or a bot that never runs JavaScript can read what
Chaverola actually is, in the visitor's language, without the app rendering
server-side.

**Read this first.** This prompt deliberately does **not** render React.
The homepage's words go into a `<noscript>` block, and the reasons are
structural rather than stylistic:

- A JS-enabled browser **never paints `<noscript>`**, so the locale flash
  that disqualifies a real rendered body (see prompt 3) is impossible here
  — not mitigated, impossible.
- There is no hydration surface. `createRoot`'s container wipe doesn't
  reach it, because it sits outside `#root`.
- It cannot break the build. No React execution, no module-graph
  evaluation, no new SSR-safety rule for future component authors.
- The population it serves — GPTBot, ClaudeBot, PerplexityBot and every
  link unfurler — is precisely the population that never runs JS, so they
  lose nothing by getting `<noscript>` instead of live markup.

It is not cloaking: the text is a faithful subset of what the page renders,
read from the same catalogs, and Googlebot's second-wave render sees the
real page regardless.

1. **The content, read from the catalogs:** extend `prerenderPages()` so
   `/` and `/he` (**and only those two**) carry a `noscript` string. Build
   it from existing `home` keys through the same `getFixedT` the head uses:
   `hero.title` as an `<h1>`, the pitch paragraph, `hero.step1..3` as an
   `<ol>`, the four `how.step1..4.title` headings, and plain `<a href>`
   links to the locale-correct `/activity/join` and `/activity/create`.
   No new copy — so no humanizer pass is needed, and nothing can drift from
   what the page renders.

2. **The seam:** add a second insertion point in
   `scripts/prerender-head.mjs` at `<div id="root"></div>`, using the same
   `replaceOnce` guard as the head anchors. Keep `page.head` and
   `page.noscript` separate; a page with no `noscript` is emitted exactly
   as prompt 1 emits it.

3. **Escaping:** reuse `escapeHtml`. `<noscript>` content is ordinary
   markup, so the same rule applies — the only new consideration is that
   the strings are element text rather than attributes, which the shared
   helper already handles.

4. **Demo parity:** the two demo URLs deliberately get **no** `noscript`
   block. They are pitch-email links whose value is the unfurl card, which
   is pure `<head>`; body text there would be maintenance for no reader.
   Note it rather than leaving it to look like an oversight.

**Edge cases:** the `<h1>` in `noscript` and the `<h1>` React renders are
the same string but appear twice in the DOM for a non-JS reader only —
never simultaneously for anyone, since `noscript` is inert whenever the
script runs. Hebrew content needs no `dir` attribute of its own; the
emitted `<html dir="rtl">` from prompt 1 governs it. Keep the block small:
it ships in the HTML of the two most-fetched URLs, and it is text, not a
page.

**Tests:** none — a string builder over catalog keys, gated by the build.

**Done when:** `pnpm typecheck` green; `pnpm build`;
`curl.exe -s http://localhost:4173/` contains the English `<h1>` text and
`curl.exe -s http://localhost:4173/he` contains the Hebrew one; neither
demo URL contains a `<noscript>` block; the rendered pages at both URLs are
visually unchanged in a browser at desktop and phone width. `pnpm format`,
one commit to `main`, push, tick this box.

---

## Prompt 3 — A rendered body (gated — read the risk record first)

**Do not run this prompt because it is next.** It needs an explicit founder
call. The evidence below was gathered specifically to make that call an
informed one, and it argues against.

**What it would take, and what it costs.**

- **`renderToString` cannot render these pages at all.** All five page
  components are `lazyPage(...)`
  ([`App.tsx:30-50`](../../../client/src/App.tsx)) inside a `<Suspense>`,
  and the legacy synchronous renderer emits the fallback when a component
  suspends — so `/` would ship a spinning `Loader2`, not the homepage.
  A real body needs `prerender` from `react-dom/static`, plus a **third
  route table** (route → component module) that nothing typechecks against
  `App.tsx`. The repo already carries two: the real tree in `App.tsx` and
  the meta table in `pageMeta.ts`.
- **React 19 silently discards it.** With `createRoot` on a `<div>`
  container, the initial commit sets `container.textContent = ""`. The SEO
  bytes survive — a crawler never reaches the commit — but a human pays a
  full double paint, and **no warning is emitted**. A future engineer
  maintaining the prerender would have nothing telling them the browser
  throws it away.
- **The locale flash is a real regression, not a nitpick.** A
  Hebrew-preferring visitor landing on `/` would read a fully painted
  English homepage — headline, CTAs, plans, founder note — for roughly
  150-350 ms on desktop and 1-1.5 s on a mid-tier Android on school wifi,
  then watch it reflow right-to-left, then blank, then spinner, then
  Hebrew. Four visual states instead of two. If the JS never lands, they
  are stranded on a dead English page rather than a blank one.
  [`branding.md`](../../decisions/branding.md) refuses to put a _single
  English sentence_ in `<title>` for exactly this reason; this is the same
  harm an order of magnitude larger. `hydrateRoot` is **worse, not
  better**: `applyBootLocale` has already rewritten the URL to `/he` by
  then, so the Hebrew tree hydrates against English DOM and mismatches
  wholesale.
- **Two hard crashes exist today.** `window.matchMedia` in the render phase
  at
  [`JoinGateCard.tsx:89`](../../../client/src/pages/student/join/JoinGateCard.tsx)
  — and `MessageComposer.tsx:26-27` explicitly cites that line as its
  model, so this is a sanctioned two-file idiom, not an accident. And
  [`api.ts`](../../../client/src/lib/api.ts) throws at module init in a
  production build without `VITE_API_URL`, making `pnpm build` newly
  env-dependent and contradicting `client/.env.example`.
- **The ongoing tax.** `pnpm build` stops being static analysis and starts
  executing the app. Every future component author inherits a rule
  (`no window/document/localStorage at module scope or during render, in
anything reachable from a prerendered route`) that is transitive,
  invisible, and enforceable by **no cheap gate**: `pnpm typecheck` passes
  `window.matchMedia` happily, and `client/vitest.config.ts` is
  `environment: "node"` with no jsdom and `include: ["src/**/*.test.ts"]`,
  so no test in this repo renders a component. The cheapest gate becomes
  the build itself, which inverts the ladder AGENTS.md sets out. A crash
  lands in Rolldown SSR output already rewritten by the React Compiler, so
  the stack frames don't correspond to source. And any new dependency that
  touches `window` at import time becomes a build failure.
- **What it buys is smaller than it looks.**
  [`useChatDemo.ts`](../../../client/src/components/chat/useChatDemo.ts)
  seeds the conversation inside a `useEffect`, and effects never run during
  SSR — so the prerendered homepage would carry the marketing copy and an
  **empty hero chatbox**. The scripted demo that DECISIONS calls the proof
  would not be in the HTML. Meanwhile Googlebot renders JS, and every
  consumer that doesn't (unfurlers, AI crawlers, Bing's title) is already
  served by prompts 1 and 2.

**If the founder says run it anyway,** this is the minimum-risk shape:

1. **`/he` only, at first.** A locale prefix already in the URL is the
   visitor's own choice — `applyBootLocale` calls `markLocaleExplicit()`
   and never rewrites it — so a Hebrew body at `/he` cannot flash the wrong
   language at anyone. `/` cannot make that guarantee, because `/` is
   precisely the URL that gets rewritten away. Add `/` only after `/he` has
   been live and clean, and understand you are accepting the flash.
2. **Never** the join, host, or create routes. They sit behind session
   state and live sockets, nobody searches for them, and `JoinGateCard.tsx`
   makes the join routes a hard crash.
3. `prerender` from `react-dom/static`, fed `<HomePage/>` inside a minimal
   provider shell (`MemoryRouter` at the target path, `DirectionProvider`,
   the i18n instance) — **never `<App/>`**, which drags in `lazyPage`,
   `ScrollToTop`, `LocaleEffects` and `useHeroCtaPassed`, none of which
   contribute HTML.
4. **Keep `createRoot`** in `main.tsx`. The wipe is the feature: it
   guarantees the post-mount browser experience is byte-identical to
   today's.
5. A size-floor assertion plus an `<h1>`-content check that fails the build,
   so a silently-empty prerender can never ship. A dummy `VITE_API_URL` for
   the prerender pass only, so contributors' local builds stay
   env-independent.

**Abandon signals — stop and revert, do not push through:**

- Any `typeof window` guard has to be added inside
  `client/src/components/` or `client/src/pages/`. This is the clearest
  one: the guard in `localeBoot.ts` was written for this and is fine, but
  the moment one is needed in a component you have started paying the tax
  that is the reason not to do this.
- Making it work requires touching the code splitting in `App.tsx:30-50`.
  That trades the join screen's payload — thirty phones on one school AP —
  for crawler bytes. Bad trade, unconditionally.
- A hydration error appears in the console on `/he`.
- The prerender crashes inside React Compiler output and the frame can't be
  mapped back to source within about thirty minutes.
- `pnpm build` wall time more than doubles.
- The emitted `/he` body contains any English string.

**Tests:** none specified — if this prompt runs, the build-time assertions
above are the gate.

**Done when:** the founder has made the call and it is recorded as a
decision entry either way. If the answer is no, tick this box, write the
"not doing this, and why" entry in
[`branding.md`](../../decisions/branding.md), and flip the doc to Complete
— a deliberate no is a finished prompt, not an open one.
