# 05 — The search result says what this is

State: **Not started**

**The problem.** Nothing on the site tells a machine what Chaverola _is_.
A search engine or an answer engine reading the homepage has to infer
"free browser-based classroom activity, no student accounts, works
anywhere" from prose. The facts that would remove a teacher's hesitation —
that it costs nothing, that it needs no install, that it runs in a browser
— are the ones structured data exists to state outright, and they are
already written in both locales.

Grep the repo for `schema.org` or `application/ld+json` and there are zero
hits.

**Decisions in play.**

- "No testimonials" ([`homepage.md`](../../decisions/homepage.md)) — so
  **no `aggregateRating` and no `review`**, ever. Those two properties are
  the most-abused part of this vocabulary; inventing them would be
  fabricating data about real people and is a straightforward way to earn a
  manual penalty. Name the ban in the code comment, not just here.
- "The copy never mentions AI" ([`homepage.md`](../../decisions/homepage.md))
  — structured data is copy that a machine reads aloud. The `description`
  values come from the existing catalogs, which already respect this.
- "The brand is חברולה in Hebrew"
  ([`branding.md`](../../decisions/branding.md)) — `name` is the
  `brand.name` catalog key, so `/he` describes חברולה.
- "The free plan is the whole thing"
  ([`homepage.md`](../../decisions/homepage.md)) — the `Offer` with a zero
  price is the single most valuable statement in this doc, and it is
  already true.

**Prompt order.** One prompt. It needs doc
[01](01-every-url-ships-its-own-head.md)'s emitter, `SITE_ORIGIN` from doc
[02](02-a-pasted-link-shows-the-product.md)'s first prompt, and the square
logo PNG that same prompt produces.

- [ ] Prompt — The homepage says what it is, in JSON

---

## Prompt — The homepage says what it is, in JSON

**Goal:** a search engine or an answer engine can state, from the page
itself, that Chaverola is a free browser-based classroom activity — without
parsing marketing prose.

1. **Homepage only.** `/` and `/he` get the block; the other eight URLs get
   nothing. Structured data on a join gate or a live demo earns no result
   and is four more things to keep true. Resist the completeness instinct
   here.

2. **Three types, one `@graph`.** Emit a single
   `<script type="application/ld+json">` containing a `@graph` array rather
   than three separate script tags — same information, one place to look,
   and cross-references between the nodes work by `@id`:

   - **`Organization`** — `name` (from `brand.name`), `url` (`SITE_ORIGIN`),
     `logo` (the absolute URL of the square PNG from doc 02). Google's
     logo handling wants a raster; the SVG favicon does not qualify, which
     is why doc 02 produces a PNG.
   - **`WebSite`** — `name`, `url`, and `inLanguage` set per locale. No
     `SearchAction`: the site has no search, and claiming one that doesn't
     exist is exactly the kind of thing that gets structured data ignored
     site-wide.
   - **`SoftwareApplication`** — `name`, `description` (the homepage's own
     `meta.description`, already written and humanized),
     `applicationCategory: "EducationalApplication"`,
     `operatingSystem: "Any"`, and an `offers` node of type `Offer` with
     `price: "0"` and a currency. This is the node most likely to earn a
     visual treatment, and the free price is why.

   Every string comes from the catalogs through the same `getFixedT` the
   head uses. No literals, so `/he` is described in Hebrew and nothing can
   drift from the page.

3. **`HowTo` is a judgment call — read this before adding it.** The four
   steps in `home:how.step1..4.{title,body}`
   ([`en/home.ts`](../../../client/src/i18n/locales/en/home.ts)) map
   cleanly onto `HowTo`, exist in both locales, and need no new copy. But
   **Google retired HowTo rich results in 2023**, so it earns no visual
   treatment in search today. Its remaining value is machine-readable
   structure for the answer engines doc 01's prompt 2 was written for.

   That makes it cheap and honest rather than valuable — include it if you
   want the answer engines to get the sequence right, skip it if you'd
   rather carry less. Either way, **write the choice and the reason into
   the decision entry**, because a future reader finding no `HowTo` on a
   page with a visible four-step list will otherwise assume it was missed.

4. **The escaping trap.** This is a **different context** from every other
   tag in this directory. Do **not** run the JSON through `escapeHtml` —
   HTML entities inside a `ld+json` script body produce invalid JSON and
   the whole block is silently discarded. The correct treatment is
   `JSON.stringify` and then replacing `</` with `<\/` so a string can't
   close the script tag early. Put a comment at the emitter's insertion
   point saying so, next to the existing note about the head-tag escaper,
   so the next prompt doesn't reuse the wrong one.

5. **Docs:** decision entry in
   [`homepage.md`](../../decisions/homepage.md) — what is claimed, the
   no-ratings ban and why, and the `HowTo` call — plus its
   [`DECISIONS.md`](../../../DECISIONS.md) index line.

6. **Demo parity:** none — the block is homepage-only and the demo pages
   deliberately carry no structured data. Note it.

**Edge cases:** the `Offer` says the product is free, and
[`PlansSection`](../../../client/src/components/home/PlansSection.tsx) also
advertises a paid "Complete Implementation" tier priced per school. Do not
model the paid tier — it has no public price, and an `Offer` without a
price is worse than no offer. The free plan is what the page leads with and
what the schema should say. `inLanguage` differs per emitted file, so it
must come from `page.lang`, not a constant. If the Hebrew `brand.name`
renders inside JSON, confirm it survives `JSON.stringify` as literal UTF-8
rather than `ח…` escapes — both are valid JSON, but the literal form
is what makes the emitted file readable when someone debugs it.

**Tests:** none — emitted JSON, gated by the build's missing-key guard.

**Done when:** `pnpm typecheck` green; `pnpm build`;
`curl.exe -s http://localhost:4173/ | rg 'ld\+json'` returns the block, and
piping the block's contents through a JSON parser succeeds. Paste both `/`
and `/he` into Google's Rich Results Test and Schema.org's validator and
get zero errors — the Hebrew one is the more likely to surprise. Confirm
the block contains no `aggregateRating` and no `review`. Decision entry in
this commit. `pnpm format`, one commit to `main`, push, tick this box, flip
doc + README state to Complete.
