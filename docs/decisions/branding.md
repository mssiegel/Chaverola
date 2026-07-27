# Branding & page titles

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### The brand is חברולה in Hebrew, and the logo mark never mirrors

_2026-07-27_

**Decision:** Under `/he` the brand reads **חברולה** everywhere the app writes
it: the navbar wordmark, the student world's pill, the `<title>` suffix, and
body copy. What stays Latin is the domain (`www.chaverola.com`, which a teacher
reads out loud to the class) and the email From-name.

The logo mark itself is never flipped. Its speech-bubble tail points
bottom-left in both languages.

**Why:** "Chaverola" is a Hebrew word already (Chaver + Olah), so spelling it
in Latin on a Hebrew page reads as a foreign product rather than a local one.
The exceptions are the two places the Latin string is the identifier rather
than the name.

The mark stays put because `public/favicon.svg` is a pinned mirror of
`Logo.tsx` and can't follow a CSS transform. A mirrored wordmark beside an
unmirrored favicon looks broken in a way a tail on the "wrong" side does not.
The same reasoning covers media transport icons (play, fast-forward), which
keep pointing right in RTL by both Material's and Apple's guidance.

---

### Hebrew uses Rubik, and it's a quality call rather than a missing-glyph fix

_2026-07-27_

**Decision:** `[dir="rtl"]` swaps `--font-app` to Rubik (Hebrew subsets only,
four weights) with Fredoka behind it, and zeroes the headings' `-0.01em`
tracking.

**Why:** Fredoka already ships a Hebrew subset, so there was never any tofu to
fix. Rubik is here because Fredoka's Hebrew is a bolt-on to a Latin display
face with counters that close up at 15px on a phone, while Rubik is drawn for
Hebrew UI text. Worth writing down so nobody later removes the dependency as
unnecessary after checking that Fredoka "already works".

The tracking goes with it: negative letter-spacing is a Latin adjustment, and
Hebrew has no caps for it to help. Four `tracking-tight` utilities override the
token directly and carry an `rtl:tracking-normal` twin.

---

### Hebrew is written in masculine second person

_2026-07-27_

**Decision:** Hebrew copy addresses the reader in the masculine, always. Never
slash forms (`אתה/את`, `הצטרף/י`).

**Why:** Founder call (2026-07-27). Slashes are standard on Israeli forms and
school paperwork, which is exactly the register this product is trying not to
have. It is a game-like product for teenagers, and buttons in particular can't
carry the clutter. The cost is real and accepted: half of any class is
addressed in the wrong gender. Where a phrasing can sidestep gender without
sounding stilted (an infinitive on a button, a noun label instead of a verb),
it does.

---

### The name's story is Chaver + Olah ("rising up"), not Chaver + Crayola

_2026-07-18_

**Decision:** The founder's note explains "Chaverola" as a blend of Chaver
(Hebrew for friend) and Olah, glossed as "rising up": friends raise each other
up. This replaces the earlier Chaver + Crayola (friendship plus crayons) story.
The gloss is deliberately the neutral "rising up" rather than the founder's
original phrasing "he rises up" — olah (עוֹלָה) is grammatically the feminine
form ("oleh" is masculine), and Hebrew-literate readers would catch the
mismatch. The spelling stays Olah because it matches the "-ola" ending of the
name.

**Why:** Founder call. The rising-up meaning is the product's actual thesis
(friends raising each other up), where Crayola was only a mood. Any copy that
retells the name's origin should use this story.

_Implemented in [FounderNote.tsx](../../client/src/components/home/FounderNote.tsx)._

### Page titles read "&lt;Page&gt; | Chaverola", page name first

_2026-07-15_

**Decision:** `document.title` for every routed page is the page's own name
followed by the brand — e.g. "Join an Activity | Chaverola" — via the shared
`usePageTitle` hook. Routes without a title fall back to bare "Chaverola".

**Why:** Product-owner call for SEO: the page-specific words get prominence in
search results while the brand still matches a "Chaverola" search. Brand-first
("Chaverola | Join an Activity") and an audience prefix ("Student - Join an
Activity") were both rejected — the first buries the page's keywords, the
second adds clutter without search value. Full SSR/meta-tag SEO is deferred to
a later Vite SEO effort; until then titles are set client-side only.

_Implemented in [usePageTitle](../../client/src/lib/usePageTitle.ts)._
