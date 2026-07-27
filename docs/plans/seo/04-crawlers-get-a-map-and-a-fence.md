# 04 — Crawlers get a map and a fence

State: **Not started**

**The problem.** There is no `robots.txt` and no `sitemap.xml` anywhere in
the repo, so a crawler arriving at chaverola.com has no list of what exists
and no statement of what it should leave alone.

The fence matters more than it looks. `/activity/host/:hostKey` is a
capability URL — whoever holds it runs a live classroom — and
`/activity/join/:joinCode` is a live 4-digit code. Neither is linked from
anywhere, so neither is discoverable today. But every unmatched path
returns HTTP 200 with the shell rather than a 404 (Vercel's catch-all), so
if one of those URLs ever escapes into a public forum, a shared screen or a
tweeted screenshot, nothing stops it being crawled and indexed. The same
catch-all means a crawler that starts guessing paths gets an endless supply
of 200s.

The map matters because the ten public URLs include two demo pages that
nothing links to except a pitch email, and a Hebrew tree Google has no
other reason to consider a separate, indexable thing.

**Decisions in play.**

- "Routes are canonical — don't invent new ones"
  ([`AGENTS.md`](../../../AGENTS.md)) — `robots.txt` and `sitemap.xml` are
  **static files**, not routes. Nothing changes in
  [`App.tsx`](../../../client/src/App.tsx). Say so in the doc entry so the
  next reader doesn't have to work it out.
- Vercel serves real static files from the output directory **before**
  applying the catch-all rewrite in
  [`vercel.json`](../../../client/vercel.json), so a file in
  `client/public/` is reachable at its own path and will not be swallowed.
- "Equal priority for Hebrew" (founder call, this effort) — `/he` URLs go
  in the sitemap with reciprocal `xhtml:link` annotations, which is the
  second, independent hreflang signal alongside doc
  [03](03-google-knows-which-url-is-the-real-one.md)'s head links.

**Prompt order.** Prompt 1 is **independent of every other doc in this
directory** and can run first, before doc
[01](01-every-url-ships-its-own-head.md). Prompt 2 needs 01's emitter and
`SITE_ORIGIN` from doc [02](02-a-pasted-link-shows-the-product.md)'s first
prompt, and deliberately runs after prompt 1 so `robots.txt` never
advertises a sitemap that doesn't exist yet.

- [ ] Prompt 1 — The fence
- [ ] Prompt 2 — The map

---

## Prompt 1 — The fence

**Goal:** a live classroom URL that leaks into public can't be crawled, and
crawlers stop being handed 200s for paths that aren't pages.

1. **`client/public/robots.txt`.** Disallow the two capability path
   prefixes in both locales, and re-allow the demo pair inside them:

   ```
   Disallow: /activity/host/
   Allow:    /activity/host/1234
   Disallow: /activity/join/
   Allow:    /activity/join/1234
   ```

   ...and the `/he/` twins of all four. The trailing slash is load-bearing:
   `Disallow: /activity/join/` does **not** block `/activity/join`, which
   is the join gate and is meant to be indexed. The `Allow` lines win
   because Google resolves conflicts by longest matching path, so spelling
   the demo code out is what keeps the demo crawlable — the same reason
   [`pageMeta.ts`](../../../client/src/lib/pageMeta.ts) spells it out
   instead of importing `DEMO_JOIN_CODE`. Add a comment in the file saying
   the two must stay in step.

   Also disallow `/app.html` (and `/he-app.html` once doc 03's second
   prompt lands). Those are build artifacts that happen to be publicly
   reachable; they are not pages.

   **No `Sitemap:` line yet** — prompt 2 adds it. Pointing at a 404 is
   worse than saying nothing.

2. **Decide the AI-crawler policy explicitly, and record it.** GPTBot,
   ClaudeBot and PerplexityBot are the crawlers doc 01's prompt 2 exists
   to serve, so the consistent answer is to allow them, and the default of
   no rule already does. But it is a real product choice — some sites block
   them — so write it down as a decision rather than leaving it as an
   absence. If the founder wants them blocked, that also invalidates
   01/prompt 2, which is exactly why the two decisions belong in the same
   sentence.

3. **The soft-404 note.** Every unknown path still returns HTTP 200. This
   prompt narrows the damage but does not fix it; fixing it needs a Vercel
   404 route or an edge function, and it is deliberately not in this
   directory (see the README). Write one line in the decision entry saying
   so, so the omission reads as a choice.

4. **Docs:** decision entry in [`routes.md`](../../decisions/routes.md) —
   what is fenced, why the demo pair is carved out, and the AI-crawler call
   — plus its [`DECISIONS.md`](../../../DECISIONS.md) index line.

5. **Demo parity:** the demo URLs are the carve-out, which is the whole
   subtlety of this file. Verify both are still allowed rather than
   assuming the `Allow` lines work.

**Edge cases:** `robots.txt` is public, so it names the capability path
shapes. That leaks nothing — the same route table is already in
[`README.md`](../../../README.md) — and the keys themselves remain
unguessable. `Disallow` prevents crawling but not indexing: a disallowed
URL that someone links to can still appear as a bare URL in results. For
these URLs that is the right tool anyway, since the alternative (`noindex`)
requires the crawler to fetch the page first, which is what we're
preventing. Test the rules against a real matcher rather than reading them;
`Allow`/`Disallow` precedence is the classic place to be confidently wrong.

**Tests:** none — a static file.

**Done when:** `pnpm build`; `client/dist/robots.txt` exists with the file's
contents intact. `pnpm preview`, then `curl.exe -s
http://localhost:4173/robots.txt` returns the file rather than the SPA
shell — that is the assertion that proves the static-before-rewrites
behavior. Paste the rules into Google Search Console's robots.txt tester
(or any spec-compliant matcher) and confirm `/activity/host/1234` is
allowed while `/activity/host/abc123xyz` is not. Decision entry in this
commit. `pnpm format`, one commit to `main`, push, tick this box.

---

## Prompt 2 — The map

**Goal:** every public URL, in both languages, is listed once with its
counterpart, so nothing depends on a crawler finding the demo pages by
accident.

1. **Generate it, don't write it.** `dist/sitemap.xml` comes out of the
   same `PAGE_META` walk in
   [`prerenderMeta.ts`](../../../client/src/lib/prerenderMeta.ts) that emits the
   heads, so a route added to the table appears in both places or neither.
   A hand-written file in `public/` would be a second home for the route
   list, and doc drift is the thing this repo's process rules are most
   pointed about.

2. **Ten `<url>` entries, each with `xhtml:link` alternates** for every
   locale plus `x-default`, mirroring doc 03's head links exactly. Google
   accepts hreflang in the sitemap as an independent signal, and having
   both is the cheap redundancy — but only if they agree, so generate both
   sets from the same function rather than writing the XML by hand.

3. **Omit `lastmod`, `changefreq` and `priority`.** Google ignores the
   last two outright. `lastmod` is only useful when it is accurate, and a
   build timestamp would say every page changed on every deploy, which
   trains the crawler to distrust the field. If a real signal is wanted
   later it should come from git, not from the clock — note that rather
   than doing it.

4. **Add the `Sitemap:` line to `robots.txt`**, absolute, using the origin
   settled in doc 02. This is the only place the origin appears as a
   literal outside `SITE_ORIGIN`; comment both ends so they stay in step.

5. **Demo parity:** the two demo URLs are in the sitemap and are the
   entries most likely to matter — nothing else links them. Verify they
   appear with both locales' alternates.

**Edge cases:** the XML needs the `xhtml` namespace declared on
`<urlset>`, and every `<loc>` must be absolute and match the canonical from
doc 03 **character for character** — a trailing-slash mismatch between the
sitemap and the canonical is a silent, common defect. Escape `&` in URLs
even though none currently contain one; the ten URLs are ASCII apart from
nothing, but the escaping habit is what survives a future query parameter.
Real host and join sessions are, correctly, absent — they are not pages
and doc 04's fence already covers them.

**Tests:** none — generated XML, gated by the build.

**Done when:** `pnpm typecheck` green; `pnpm build` emits
`dist/sitemap.xml` with 10 `<url>` entries. `curl.exe -s
http://localhost:4173/sitemap.xml` returns valid XML (run it through any
XML validator, and through a sitemap validator if one is at hand); every
`<loc>` matches its page's `rel=canonical` exactly; `/robots.txt` carries
the absolute `Sitemap:` line. `pnpm format`, one commit to `main`, push,
tick this box, flip doc + README state to Complete.
