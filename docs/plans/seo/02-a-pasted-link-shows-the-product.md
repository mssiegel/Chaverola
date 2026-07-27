# 02 — A pasted link shows the product

State: **Complete**

**The problem.** Chaverola has no social image and no Open Graph tags at
all. A link pasted into Slack, WhatsApp, iMessage, LinkedIn or a Gmail
compose window unfurls as a bare text row: the word "Chaverola" and one
generic sentence, with no picture. `/demo` is the link that goes into an
email to a principal, and it looks like a URL somebody typed wrong.

The repo's only images are
[`favicon.svg`](../../../client/public/favicon.svg) (734 bytes) and a
3961×2642 founder photo. There is no 1200×630 asset, no PNG logo, no raster
brand mark of any kind.

`LogoMark` ([`Logo.tsx`](../../../client/src/components/brand/Logo.tsx)) is
hand-written inline SVG — a gradient tile, a speech-bubble path, two dot
eyes, a smile stroke — with no external references and no CSS-variable
reads. It rasterizes cleanly at any size, which is what makes a brand card
cheap here.

**Decisions in play.**

- "The canonical host is the apex, chaverola.com"
  ([`branding.md`](../../decisions/branding.md), 2026-07-27) — settled
  before this doc starts, along with the in-app spoken address the teacher
  reads to the class. `SITE_ORIGIN` is that decision made into code.
- "The brand is חברולה in Hebrew, and the logo mark never mirrors"
  ([`branding.md`](../../decisions/branding.md)) — `og:site_name` is a
  catalog key, not a literal, so `/he` reads חברולה. The card image is the
  same file for both locales, and the mark inside it is **not** flipped.
- The gradient literals are pinned in three places —
  [`Logo.tsx`](../../../client/src/components/brand/Logo.tsx),
  [`favicon.svg`](../../../client/public/favicon.svg), and
  `--brand-gradient-from/-to` in
  [`index.css`](../../../client/src/index.css). The card is a fourth
  mirror; the comment in `Logo.tsx` about updating them together must be
  extended to name it.
- "The meta title is written for a search result"
  ([`branding.md`](../../decisions/branding.md)) — `og:title` and
  `og:description` **reuse the existing catalog strings**. Do not write a
  third set of copy for social; there is no evidence a different sentence
  performs better and a third set is a third thing to keep in sync.
- The site loads zero third-party scripts and self-hosts its fonts. The
  card is a checked-in file, not a generated-on-request image service.

**Prompt order.** Sequential. Prompt 1 ships value on its own and does not
need doc [01](01-every-url-ships-its-own-head.md) — a single card and a
fallback tag set beat nothing, on every URL. Prompt 2 needs 01's emitter.

**Prompt 1 also lands the site's canonical origin as a constant**, because
`og:image` and `og:url` must be absolute URLs — a relative `og:image` is
ignored by most unfurlers, which makes this the first thing on the site
that needs to know its own address. Docs
[03](03-google-knows-which-url-is-the-real-one.md),
[04](04-crawlers-get-a-map-and-a-fence.md) and
[05](05-the-search-result-says-what-this-is.md) import that constant rather
than each declaring their own, so run this doc before them.

- [x] Prompt 1 — One card, one origin, one fallback (card seen rendering in
      WhatsApp, 2026-07-27)
- [x] Prompt 2 — Every URL gets its own card (both demo links seen unfurling as
      the demo in WhatsApp, 2026-07-27)

---

## Prompt 1 — One card, one origin, one fallback

**Goal:** a Chaverola link pasted anywhere shows a branded card with a
picture instead of a bare text row.

1. **The origin constant.** The canonical host is settled: **the apex,
   `chaverola.com`** (founder call, 2026-07-27, recorded in
   [`branding.md`](../../decisions/branding.md) along with the in-app
   spoken-address change that landed with it). Nothing to decide here — two
   things to do.

   Make `www.chaverola.com` redirect to the apex in the Vercel dashboard,
   and confirm it with `curl.exe -I https://www.chaverola.com`. Two
   hostnames serving the same content is duplicate content and splits every
   signal this directory is about to create. The redirect is dashboard-only
   and ungreppable from the repo, so note in the decision entry that it
   exists and where.

   Then add `SITE_ORIGIN = "https://chaverola.com"` to
   [`prerenderMeta.ts`](../../../client/src/lib/prerenderMeta.ts) as a single
   exported constant, with a comment naming it the one home for the
   canonical origin and pointing at the decision. Docs 03, 04 and 05 all
   import it.

2. **Two images, one session.** Both are checked-in PNGs in
   `client/public/`:
   - `og-card.png`, 1200×630 — the grape gradient background, `LogoMark`,
     and the wordmark. Keep text to the brand name and at most one short
     line; text in an OG image is unreadable at Slack's thumbnail size, so
     the card's job is recognition, not reading.
   - `logo-512.png`, square — needed by doc
     [05](05-the-search-result-says-what-this-is.md)'s `Organization`
     node, because Google's logo handling wants a raster and the SVG
     favicon doesn't qualify. It costs one extra screenshot in the same
     session, which is the only reason it lives here rather than there.

   Produce them with the browser you already have rather than adding a
   rasterizer: author a one-off HTML page in `tools/verify/scratch/`
   carrying the same inline SVG paths and the Fredoka face the app
   self-hosts, then screenshot it at each viewport through `launch()` in
   [`tools/verify/lib.mjs`](../../../tools/verify/lib.mjs). The scratch
   file is gitignored and dies with the session; the PNGs are the
   artifacts. Keep the card under ~300 KB — it is fetched by every
   unfurler, and the 472 KB founder photo already in `public/` is the
   cautionary example, not the model.

3. **The fallback tag set** in
   [`client/index.html`](../../../client/index.html), beside the existing
   description. This is what every non-prerendered URL unfurls as, so write
   it in the same third person the description already uses:
   `og:type` (`website`), `og:site_name`, `og:title`, `og:description`,
   `og:url` (the origin), `og:image` (absolute), `og:image:width`,
   `og:image:height`, `og:image:alt`, and `twitter:card`
   (`summary_large_image`).

   **`twitter:card` is the only `twitter:*` tag worth writing.** X and every
   other consumer of those tags falls back to the `og:*` equivalents for
   title, description and image, so a parallel `twitter:title` /
   `twitter:description` / `twitter:image` set is three more strings to
   keep in sync for no behavior change. Say so in a comment so the omission
   doesn't read as an oversight.

   The `og:title` here stays the bare brand for the same reason the
   `<title>` does — it serves unmatched URLs including student sessions.

4. **The pinned-mirror comment:** extend the note in
   [`Logo.tsx`](../../../client/src/components/brand/Logo.tsx) that lists
   where the gradient literals must agree, so `og-card.png` is named as a
   fourth place that needs re-rendering if the brand color moves.

5. **Demo parity:** nothing in the demo engine changes. The demo URLs
   inherit this card until prompt 2, which is already an improvement over
   no card at all.

**Edge cases:** unfurlers cache aggressively and by URL — Slack and
LinkedIn keep a preview for days, so a link you tested before this ships
may keep showing the old bare row. Test with a URL you have not pasted
before, or use each platform's cache-clearing tool. `og:image` must be
absolute and reachable without auth; a preview-deployment URL will unfurl
its own origin, not production, which is fine for checking the shape but
not for judging the final URL.

**Tests:** none — a static asset and static tags.

**Done when:** `curl.exe -I https://www.chaverola.com` returns a redirect to
the apex. `pnpm build`; `curl.exe -s http://localhost:4173/ | rg 'og:'`
shows the full set with an absolute image URL. Paste the production URL
into a real Slack DM to yourself and into a Gmail compose window and see
the card render, at least once, with your own eyes — this is one of the few
places where the only real test is the actual client. Decision entry for
the hostname in this commit. `pnpm format`, one commit to `main`, push,
tick this box.

---

## Prompt 2 — Every URL gets its own card

**Goal:** the demo link in a pitch email unfurls saying what the demo is,
not what Chaverola generally is.

1. **Per-route tags through the seam.** Extend `prerenderPages()` in
   [`prerenderMeta.ts`](../../../client/src/lib/prerenderMeta.ts) to push into
   each page's `head[]`: `og:type`, `og:site_name` (from `brand.name`, so
   `/he` reads חברולה), `og:title` and `og:description` (**the same
   resolved strings the `<title>` and description already use** — one
   source, no third copy set), `og:url` (`SITE_ORIGIN + page.url`),
   `og:image` and its width/height/alt, `og:locale`
   (`en_US` / `he_IL`), `og:locale:alternate` (the other one), and
   `twitter:card`.

   Everything goes through `escapeHtml`, which prompt 01/1 already exports.

2. **`og:image:alt` is user-facing copy** and the only new string in this
   prompt. It needs a Hebrew twin, which means a `common` catalog key with
   its `HebrewOf<>` counterpart, and it goes through the **humanizer**
   before it ships. Keep it to what the card actually shows.

3. **Demo parity:** this is the prompt that fixes the demo unfurl, and the
   two demo pairs are already written
   (`host.demo.meta.*`, `join.demo.meta.*`). Nothing in the demo engine
   changes; verify both demo URLs by fetching them.

**Edge cases:** `og:locale` takes an underscore territory form (`he_IL`),
not the bare language tag the rest of the app uses — derive it from a small
map rather than reusing `locale` directly. The real host session and the
404 keep the fallback card from prompt 1 through `app.html`, which is
correct: nothing should advertise a live classroom.

**Tests:** none — the same build-time guards from doc 01 cover a missing
key.

**Done when:** `pnpm typecheck` green; `pnpm build`;
`curl.exe -s http://localhost:4173/activity/host/1234 | rg 'og:'` shows the
demo's own title, description and absolute URL, and `/he/activity/host/1234`
shows the Hebrew pair with `og:locale` `he_IL`. Paste the production
`/demo` link into Slack and confirm the card now describes the demo.
`pnpm format`, one commit to `main`, push, tick this box, flip doc +
README state to Complete.
