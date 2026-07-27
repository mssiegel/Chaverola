# 03 — Google knows which URL is the real one

State: **Complete**

**The problem.** Every page on this site is reachable at more than one
address, and nothing tells a search engine which address is the real one.

- `/` and `/he` are the same page in two languages, with no `hreflang`
  between them. Google has to guess whether `/he` is a translation worth
  indexing separately or thin duplicate content — and the Hebrew tree is a
  first-class product, not a translation ("The Hebrew demo is re-cast,
  never translated", [`demo-flows.md`](../../decisions/demo-flows.md)).
- Both `chaverola.com` and `www.chaverola.com` answer, so every URL exists
  twice before you count locales. The apex won that call, and doc
  [02](02-a-pasted-link-shows-the-product.md) is where the `www` redirect
  and the `SITE_ORIGIN` constant land; this doc is where every page says
  so out loud.
- `/demo`, `/demo/teacher` and `/demo/student` are **client-side**
  `<Navigate replace>` elements
  ([`App.tsx`](../../../client/src/App.tsx)). A crawler or an unfurler
  fetching `/demo` gets HTTP 200 and the fallback shell — never the demo
  page. So the URL said out loud in meetings is, to everything that doesn't
  run JavaScript, a page about nothing.

**Decisions in play.**

- "English keeps the bare paths; a third language would add its own prefix
  rather than pushing English onto `/en`"
  ([`routes.md`](../../decisions/routes.md)) — so `x-default` points at the
  English URL, and the alternate set is derived from `LOCALES`, not
  hardcoded to two.
- "The demo redirects are thin redirects, never pages"
  ([`routes.md`](../../decisions/routes.md)) — **stands.** Prompt 1 moves
  where the redirect happens (Vercel instead of React Router), not what it
  is. The `DemoRedirect` routes stay in `App.tsx`, because `vite dev` never
  reads `vercel.json` and the dev experience must not diverge.
- "Locale is detected once at boot and remembered"
  ([`routes.md`](../../decisions/routes.md)) — a bare `/` is
  `replaceState`-rewritten to `/he` for a Hebrew-preferring browser, with
  no HTTP redirect. That is _good_ for this doc: the bytes served at `/`
  are always English, so each emitted file's canonical and alternates are
  static and correct.

**Prompt order.** Sequential, and both need doc
[01](01-every-url-ships-its-own-head.md)'s emitter plus `SITE_ORIGIN` from
doc [02](02-a-pasted-link-shows-the-product.md)'s first prompt.

- [x] Prompt 1 — Every page names itself and its twin (the 308s land with the
      next deploy — `vite preview` doesn't read `vercel.json`)
- [x] Prompt 2 — A Hebrew visitor's dead end is in Hebrew (the `/he/` rewrite
      lands with the next deploy, for the same reason)

---

## Prompt 1 — Every page names itself and its twin

**Goal:** each of the ten public URLs declares its own canonical address
and its counterpart in the other language, and `/demo` resolves to the demo
page for something that doesn't run JavaScript.

1. **Canonical.** Push a self-referencing
   `<link rel="canonical" href="${SITE_ORIGIN}${page.url}">` into every
   page's `head[]` in
   [`prerenderMeta.ts`](../../../client/src/lib/prerenderMeta.ts). Self-
   referencing is the right shape here — there is no duplicate-parameter
   problem to consolidate, and the tag's job is to name the winning
   hostname and pin the URL against future tracking parameters.

2. **hreflang, reciprocal and complete.** Every page emits one
   `<link rel="alternate" hreflang="…">` per locale **including itself**,
   plus `x-default` pointing at the English URL. Reciprocity is the part
   that silently fails: if `/he` lists `/` but `/` doesn't list `/he`,
   Google discards the pair. Generate the whole set from `LOCALES` in one
   place so the two can't drift.

   Use the bare language tags `en` and `he`, not `en-US`/`he-IL`. This is
   language targeting, not regional targeting; a region subtag would
   restrict the Hebrew page to Israeli searchers and there is nothing
   Israel-specific about it beyond the language. (`og:locale` in doc 02
   _does_ use the territory form — that is Facebook's format requirement,
   not a targeting decision. Note the asymmetry so nobody "fixes" one to
   match the other.)

3. **Real redirects for the demo URLs.** Add a `redirects` array to
   [`vercel.json`](../../../client/vercel.json), ahead of the existing
   rewrite (Vercel runs redirects → filesystem → rewrites, so the two do
   not conflict):

   ```
   /demo           → /activity/host/1234
   /demo/teacher   → /activity/host/1234
   /demo/student   → /activity/join/1234
   /he/demo        → /he/activity/host/1234
   /he/demo/teacher → /he/activity/host/1234
   /he/demo/student → /he/activity/join/1234
   ```

   Six rules, one per locale per source, because a static redirect cannot
   read a visitor's language preference. The English targets still land
   correctly for a Hebrew-preferring visitor: `applyBootLocale` rewrites
   `/activity/host/1234` to the `/he` twin at boot exactly as it does
   today.

   Use permanent (308). These URLs are permanent by design — `routes.md`
   records them as thin redirects to fixed targets. Know the trade: a 308
   is cached by browsers indefinitely, so if the demo's target ever moves,
   anyone who visited `/demo` keeps the old destination until they clear
   it. That is acceptable for a URL whose whole purpose is stability.

   **Leave the `DemoRedirect` routes in `App.tsx` alone.** They are what
   makes `/demo` work under `vite dev`, which never reads `vercel.json`.
   Add a comment there saying production redirects at the edge and this is
   the dev twin, so the next person doesn't delete one as dead code.

4. **Docs:** decision entry in [`routes.md`](../../decisions/routes.md) —
   the demo redirect moved to the edge and the client route is now the dev
   twin — plus its [`DECISIONS.md`](../../../DECISIONS.md) index line.

5. **Demo parity:** this prompt is largely _about_ the demo URLs. Nothing
   in the demo engine changes; verify `/demo` and `/he/demo` still land
   correctly in a browser after the edge redirect exists.

**Edge cases:** the `1234` demo URLs are in `PAGE_META` and get canonical
and hreflang like any other page — correct, they are meant to be indexed.
Real host sessions and real join codes are served by `app.html`, which
carries **no** canonical of its own; doc
[04](04-crawlers-get-a-map-and-a-fence.md) is what keeps those out of the
index, and the two mechanisms should not be confused. The 404 likewise gets
no canonical — pointing every dead path at the homepage would consolidate
garbage into it. After the edge redirect lands, an unfurler pasting `/demo`
follows the 308 and reads the demo page's own card from doc 02, which is
the point.

**Tests:** none — emitted tags, gated by the build.

**Done when:** `pnpm typecheck` green; `pnpm build`;
`curl.exe -s http://localhost:4173/he | rg 'canonical|alternate'` shows a
self-canonical on `/he`, three alternates, and `x-default` on `/`; the same
check on `/` shows the mirror set. On the Vercel preview deploy:
`curl.exe -sI https://<preview>/demo` returns 308 with a `location` of
`/activity/host/1234`, and `/he/demo` returns its Hebrew twin. Browser
glance that `/demo` and `/he/demo` still land where they should. Decision
entry in this commit. `pnpm format`, one commit to `main`, push, tick this
box.

---

## Prompt 2 — A Hebrew visitor's dead end is in Hebrew

**Goal:** a Hebrew visitor who lands on a URL that isn't prerendered — a
live session, a mistyped path — gets Hebrew in the tab and in any preview,
instead of the English shell.

**Why this is its own prompt.** Doc 01 deliberately left it: the fix needs a
**new Hebrew shell-description string**, and the English one it twins was
written with specific constraints — third person, so it reads correctly on
a student URL as well as a teacher's. That is founder-voice copy work, not
build work.

1. **The second fallback.** Emit `dist/he-app.html` alongside `app.html`:
   the pristine shell with `lang="he" dir="rtl"`, the Hebrew brand as its
   `<title>`, and the new Hebrew description. Add a rewrite ahead of the
   catch-all:

   ```
   { "source": "/he/(.*)", "destination": "/he-app.html" }
   ```

   Order matters — the `/he/` rule must precede the `/(.*)` catch-all, and
   both still sit behind the filesystem check, so the prerendered `/he`
   files keep winning.

2. **The string.** A new `common` catalog key plus its `HebrewOf<>` twin
   (the English side can be the existing shell sentence, moved into the
   catalog, or a new key used only by the emitter — pick whichever leaves
   one home for the sentence, and say which in the comment). Write the
   Hebrew as a **localization, not a translation**, following each page's
   shipped Hebrew neighbours the way the meta pairs already do. It must
   read correctly on a student URL, same as the English. Through the
   **humanizer** before it ships.

3. **The comment in `index.html`** gets one more line: there are now two
   fallbacks, and which one serves depends on the `/he` prefix.

4. **Demo parity:** none — this surface is by definition the pages the demo
   doesn't reach. Note it.

**Edge cases:** a Hebrew-preferring visitor on a bare English session URL
still gets `app.html`, because the URL has no `/he` prefix and the server
cannot know their preference — boot then corrects the page to Hebrew, same
as today. That is the honest limit of a static fallback and should be
written down rather than chased. `/he` itself is prerendered and never
reaches this rule.

**Tests:** none — one more emitted file and one rewrite rule.

**Done when:** `pnpm typecheck` green; `pnpm build` emits `he-app.html`
with `lang="he" dir="rtl"` and the Hebrew title. On the Vercel preview:
`curl.exe -s https://<preview>/he/activity/host/notarealkey` returns the
Hebrew shell, and the English twin still returns the English one. Humanizer
pass recorded. `pnpm format`, one commit to `main`, push, tick this box,
flip doc + README state to Complete.
