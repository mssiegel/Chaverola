# SEO — plan docs

Chaverola has good meta copy and no SEO plumbing. Commit `ca5ddba` rewrote
every title and description in both locales, but those strings are set
client-side in a `useEffect` — so no link-preview bot and no AI crawler has
ever seen them. They read
[`client/index.html`](../../../client/index.html) and get one generic
sentence for all ten public URLs.

[`branding.md`](../../decisions/branding.md) listed the gap and deferred it
by name: "no Open Graph or Twitter cards, no canonical URLs, no `hreflang`
between `/` and `/he`, no `robots.txt` or `sitemap.xml`, and no
prerendering. Those stay deferred to the later Vite SEO effort." This is
that effort. Each doc here tackles **one** feature end to end, in the house
prompt-doc style, and every prompt leaves the app working and shipping on
its own.

The groundwork is already in the repo and should be consumed rather than
rebuilt: [`pageMeta.ts`](../../../client/src/lib/pageMeta.ts) holds a pure
`pageMeta()` and a route-keyed `PAGE_META` table that nothing imports;
[`i18n/index.ts`](../../../client/src/i18n/index.ts) creates its own
i18next instance so a prerender can render both locales in one process; and
[`localeBoot.ts`](../../../client/src/lib/localeBoot.ts) already carries a
`// prerender-safe` guard.

## How to run these

- **One prompt per session**, like every plan doc in this repo. Read the
  whole doc before starting its next unticked prompt — the context at the
  top is part of the prompt.
- **When you finish a prompt, tick its checkbox in the doc.** When the last
  box in a doc is ticked, flip the doc's `State:` line and the State cell
  in the table below — both edits in the same commit as the work.
- The three `State:` values are **Not started**, **Complete**, and
  **Blocked (question pending)**. There is no "in progress": a prompt is
  either shipped and ticked or it isn't, because the repo's unit of
  progress is a pushed commit.
- **Never guess a founder call.** A prompt that needs a product decision
  its doc doesn't settle goes to
  [`questions-for-the-founder.md`](questions-for-the-founder.md): append
  the question (doc, prompt, the context an answerer needs, what you need
  decided), change the prompt's checkbox line to
  `[blocked — question pending]`, set the doc's State — its own line and
  the table below — to **Blocked (question pending)**, commit, and move to
  the next doc. Open every session by reading the inbox.
- This effort gives a teacher nothing new inside the app, so it earns **no
  AGENTS.md status row** (recorded decision: "The status table is what a
  teacher gained"). This table is the one home for tracking it.

## The docs

| Doc                                                                                           | What a user gains                                                                               | State       |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------- |
| [01 — Every URL ships its own head](01-every-url-ships-its-own-head.md)                       | A link, a search result and an AI answer each show that page's own words, in the right language | Not started |
| [02 — A pasted link shows the product](02-a-pasted-link-shows-the-product.md)                 | A Chaverola link unfurls as a branded card instead of a bare text row                           | Not started |
| [03 — Google knows which URL is the real one](03-google-knows-which-url-is-the-real-one.md)   | The Hebrew and English pages stop competing with each other, and `/demo` resolves for a bot     | Not started |
| [04 — Crawlers get a map and a fence](04-crawlers-get-a-map-and-a-fence.md)                   | A leaked classroom URL can't be indexed, and every real page is listed once                     | Not started |
| [05 — The search result says what this is](05-the-search-result-says-what-this-is.md)         | A search or answer engine can state that it's free and needs no student accounts                | Not started |
| [06 — Somebody is watching the search console](06-somebody-is-watching-the-search-console.md) | The founder can see whether any of it worked                                                    | Not started |

**Order.** 04's first prompt is independent and can run any time — it is
the only one that doesn't need the emitter. Otherwise: **01 → 02 → 03 →
04/2 → 05 → 06.** 01 builds the head emitter everything else extends; 02's
first prompt settles `SITE_ORIGIN`, which 03, 04 and 05 all import; 06 runs
last, after the sitemap is live. 01's third prompt is gated on a founder
call and may never run.

## What's deliberately not here

Written down so the omissions don't read as oversights.

- **Real 404 status codes.** Every unknown path returns HTTP 200 with the
  shell (Vercel's catch-all), so Google will see soft 404s. Fixing it needs
  a Vercel 404 route or an edge function. Doc 06's runbook makes the count
  visible, which is the honest way to decide whether it's worth doing; doc
  01 touches the same rewrite line, so that's where a fix would start.
- **An FAQ section.** There is no FAQ anywhere on the site. Adding one
  would earn `FAQPage` schema and catch question-shaped searches, but it
  needs net-new homepage copy in both locales — a content feature, not SEO
  plumbing.
- **Analytics beyond Search Console.** The site loads zero third-party
  scripts, self-hosts its fonts, and redraws the Google Classroom logo
  inline so nothing fetches from Google. That's a standing decision, not a
  gap.
- **Twitter-specific card tags beyond `twitter:card`.** Every consumer
  falls back to the `og:*` equivalents, so a parallel set would be three
  more strings to keep in sync for no behavior change.
- **New routes.** [`AGENTS.md`](../../../AGENTS.md) and
  [`README.md`](../../../README.md) lock the route table. `robots.txt` and
  `sitemap.xml` are static files; the emitted `.html` files are build
  artifacts. Nothing here touches
  [`App.tsx`](../../../client/src/App.tsx).

## Conventions every doc assumes

- Verify at the cheapest gate (AGENTS.md): `pnpm typecheck` always;
  `pnpm build` is the real gate for everything in this directory, because
  the emitter fails hard rather than warning.
- **A browser is the wrong tool for most of this work.** Playwright runs
  the JS, so `usePageMeta` sets the title whether or not a file was
  prerendered — a browser pass gives a false pass. `curl` against
  `pnpm preview` is the bot's-eye view and the honest check. Use the
  browser only to confirm the rendered pages still look right.
- Some assertions can only be made on a **Vercel preview deploy**: the
  catch-all rewrite, the edge redirects, and static-file precedence. Those
  are called out per prompt.
- `pnpm format` before every commit; **one commit straight to `main`** per
  prompt, pushed on its own. Remember that the tip commit of a push must
  touch `client/`, `shared/` or a root manifest or Vercel silently skips
  the client build — a docs-only commit pushed on top of a code commit is
  the classic way to ship a server without its client.
- Any user-facing copy you write gets the **humanizer** pass before it
  ships. Most prompts here write none: the strings already exist and are
  reused on purpose.
- A product-behavior change records its decision: entry atop the matching
  `docs/decisions/<area>.md` file plus its one line in
  [`DECISIONS.md`](../../../DECISIONS.md), inside the prompt that makes the
  change.
- Demo parity (Working Rules): every prompt states its demo-engine work, or
  records why there is none. Several of these prompts are _about_ the demo
  URLs — `/demo` is the link that goes into a pitch email, and making it
  unfurl properly is the highest-value single outcome in this directory.
