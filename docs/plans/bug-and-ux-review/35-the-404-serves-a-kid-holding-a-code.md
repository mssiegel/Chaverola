# 35 — The 404 serves a kid holding a code

State: **Not started**

**The problem.** The most likely person to hit a Chaverola 404 is a
student holding a join code who mistyped a path their teacher said out
loud ("go to chaverola dot com slash join"). The page doesn't serve them:
[`NotFoundPage.tsx`](../../../client/src/pages/NotFoundPage.tsx) offers only
"Back home" — the student then has to find the Join button all over again
— and it never calls `usePageTitle`, so the tab reads bare "Chaverola"
instead of the "&lt;Page&gt; | Chaverola" pattern every other page follows.
The navbar shows no Join CTA here either (it's homepage-gated), which is
recorded and stays.

**Decisions in play.**

- "The navbar Join CTA appears only on the homepage"
  ([`navbar.md`](../../decisions/navbar.md)) — **stands untouched**. The
  join doorway goes in the page _body_, which the entry doesn't govern.
- "Page titles read '&lt;Page&gt; | Chaverola', page name first"
  ([`branding.md`](../../decisions/branding.md)) — the missing title
  follows this pattern.
- "Routes are canonical — don't invent new ones" — no new routes; the
  doorway links to `/activity/join`.

- [ ] Prompt — A title and a doorway

---

## Prompt — A title and a doorway

**Goal:** a lost student is one tap from the code screen; the tab names
the page; the page keeps its charm.

1. In [`NotFoundPage.tsx`](../../../client/src/pages/NotFoundPage.tsx), add
   `usePageTitle` ([`usePageTitle.ts`](../../../client/src/lib/usePageTitle.ts))
   with a short name ("Page not found" or in-voice equivalent — follow
   the existing `PAGE_TITLES` tone).
2. Add a second action beside "Back home": a **join doorway** —
   solid-grape primary per the button hierarchy ("Solid grape is
   reserved for Join", [`homepage.md`](../../decisions/homepage.md) — Join
   IS the solid one; demote "Back home" to outline), `LocaleLink` to
   `/activity/join` so `/he` is preserved. Label in the product's voice
   ("Join an Activity" matches the navbar/homepage language). Any new
   copy beyond that label → humanizer (likely nothing — reuse the
   existing label).
3. Glance at [`PlaceholderPage`](../../../client/src/components/layout/PlaceholderPage.tsx)
   — it takes children; two buttons stack fine at phone width (verify).
4. **Demo parity:** not a flow — nothing to demo. Note it.

**Edge cases:** the 404 also catches garbage under `/he` — `LocaleLink`
handles the prefix. Teacher-shaped dead paths (a mangled host link) hit
the dedicated host not-found screen, not this page — unchanged.

**Tests:** none — a title hook and a link.

**Done when:** `pnpm typecheck` green; browser glance at `/nope` and
`/he/nope` (title in the tab, both buttons, phone width). `pnpm format`,
one commit to `main`, push, tick this box, flip doc + README state to
Complete.
