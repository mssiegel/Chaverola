# Branding & page titles

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### The prerendered shell splits in two, and `app.html` is the one that keeps the generic pair

_2026-07-27_

**Decision:** `pnpm build` now ends by stamping each of the ten public URLs'
own `<title>`, description and `<html lang/dir>` into its own file under
`dist/`, plus one more file — `dist/app.html`, an untouched copy of the shell —
that `client/vercel.json`'s catch-all rewrite points at rather than at
`index.html`.

The split is the whole point. `dist/index.html` has to carry the homepage's
meta, because it is the only file Vercel can serve for `/` — so if it were also
the rewrite target, every unmatched URL (a real host session, a real 4-digit
join code, the 404, every `/he/…` session) would unfurl as the English
homepage. Vercel's filesystem check runs before rewrites, so `/` and the ten
prerendered paths win on disk and everything else falls through to `app.html`,
which still says the bare brand and the third-person all-purpose sentence — the
exact case [The meta title is written for a search
result…](#the-meta-title-is-written-for-a-search-result-not-for-the-page-and-the-demo-carries-its-own)
wrote them for. That entry's "these strings are set client-side, so a
link-preview bot never sees them" no longer holds for the ten; it still holds
for everything served through `app.html`.

The emitter loads its typed half through Vite's `runnerImport`, not a plugin in
`vite.config.ts`. A plugin was tried and is a dead end worth not retrying: the
config file is bundled by rolldown with an externalize-deps pass that leaves
`@/lib/locale` unresolvable and hands back `@chaverola/shared` as raw
extensionless TS, which breaks config loading on _every_ Vite command including
`vite dev`. `runnerImport` is marked experimental, but it is what Vite itself
uses to load a config with `configLoader: 'runner'`, the version is pinned by
the lockfile, and it fails loudly rather than silently.

**Why:** Product-owner call. No string changed — only who gets to read them.
Slack, WhatsApp, Gmail and LinkedIn parse raw HTML; GPTBot, ClaudeBot and
PerplexityBot download JS and never execute it; Bing takes its `<title>` from
the first response. All of them were reading one generic sentence for ten URLs,
which made `/demo` — the link that goes into a pitch email to a principal —
unfurl as generic product copy.

The step fails hard on purpose, with no warn-and-keep-the-shell branch: a green
deploy serving generic meta everywhere is a regression nobody notices for a
week, the same argument [`api.ts`](../../client/src/lib/api.ts) already makes
about a silent localhost fallback. The three markers it matches in
`client/index.html` (`<html lang="en" dir="ltr">`, `<title>Chaverola</title>`,
the description tag) are a contract, and the script throws unless each matches
exactly once.

Every page is written **twice** — `dist/he.html` and `dist/he/index.html` — and
both shapes are load-bearing. Vercel's filesystem phase does not strip `.html`
(`cleanUrls` defaults off), measured on production 2026-07-27: `/he.html`
served the stamped file while `/he` fell through to `app.html`. So Vercel needs
the directory-index shape. `vite preview` needs the flat one — its sirv runs
with `extensions: []` and only tries `…/index.html` for URLs ending in `/` — and
without it there is no way to check the work locally before a deploy. `/` needs
no twin; `dist/index.html` already is both.

`cleanUrls: true` would have collapsed this to one shape, and was not taken: it
also rewrites `/app.html` to `/app`, which is the destination of the catch-all
that every real session URL and every 404 goes through. Trading a duplicated
static file for a redirect hop on the join path is the wrong way round.

`vite preview` hardcodes its own SPA fallback to `/index.html`, so it
structurally cannot test the `app.html` rewrite; that one assertion belongs on
a Vercel deploy.

_Implemented in [prerenderMeta.ts](../../client/src/lib/prerenderMeta.ts),
[prerender-head.mjs](../../client/scripts/prerender-head.mjs),
[vercel.json](../../client/vercel.json), and the head comment in
[index.html](../../client/index.html)._

### The canonical host is the apex, and it's what a teacher says out loud

_2026-07-27_

**Decision:** `chaverola.com` — the apex, no `www` — is the site's one
address. The joining instructions a teacher reads to the class say
`chaverola.com`, so the spoken address and the canonical URL are the same
string.

**Why:** Founder call. Two hostnames answering the same content is duplicate
content: it splits every ranking signal and hands a search engine a choice
nobody meant to offer. The apex also shortens the sentence a teacher performs
in front of a room of teenagers, which is the only place this string is ever
said out loud rather than clicked.

The spoken and canonical forms were allowed to differ before — speech said
`www.chaverola.com` while the site answered on both — and collapsing them is
what stops the next person having to work out which one is authoritative.

Only the spoken half has shipped. The `www` → apex redirect (Vercel dashboard
config, ungreppable from the repo) and the `<link rel="canonical">` tags that
make this true for machines are
[docs/plans/seo/](../plans/seo/README.md) work and have not landed yet.

_Implemented in
[JoiningInstructions](../../client/src/components/Teacher/HostActivity/JoiningInstructions.tsx)
(`SPOKEN_DOMAIN`)._

### The meta title is written for a search result, not for the page, and the demo carries its own

_2026-07-27_

**Decision:** A page's `<title>` and `<meta name="description">` are written for
someone reading a search result or a link preview, and they may say something
different from what the page itself says. The homepage no longer titles itself
"A Classroom Activity That Students Love"; it leads with the words a teacher
types, and every description closes on the facts that remove hesitation (free,
no student accounts, nothing to install).

The join gate is the case that forced this. Its `title.join` is also the gate
card's own `<h1>`, so it now has a **separate** `join.meta.title` key: the
heading a student reads still says "Join an Activity", while the tab and the
search result say "Join the Activity with Your 4-Digit Code". Never merge those
two keys back together — nothing in the type system catches it, `JoinGateCard`
would just quietly start rendering a search-engine sentence as its heading.

`/activity/host/1234` and `/activity/join/1234` get their own share-ready pairs
(`host.demo.meta.*`, `join.demo.meta.*`), picked at the page's existing
`usePageMeta` call by a `hostKey === DEMO_JOIN_CODE` test rather than by a
second hook call in the demo view. A real host session keeps the plain private
title and still passes it as its own description.

The Hebrew is a localization. Its demo description names the Hebrew demo's
scene, not the English one's — there is no Roman class on `/he` (see
[The Hebrew demo is re-cast, never
translated](demo-flows.md#the-hebrew-demo-is-re-cast-never-translated)) — and
grammatical person follows each page's shipped neighbours rather than the
English source, so setup and the join gate keep their impersonal plural while
the homepage and both demo pages address the teacher as `אתה`.

**Why:** Product-owner call, extending [Page titles read "&lt;Page&gt; |
Chaverola", page name
first](#page-titles-read-ltpagegt--chaverola-page-name-first). That entry set
the format; nobody had since asked whether the words inside it were words
anyone searches for, and they weren't. The demo half is a straight defect fix:
`/demo` is the URL that gets said out loud in a meeting and pasted into an
email to a principal, and it was rendering "Your Live Activity" as both its
title and its description.

Deliberately **not** in this change, so the omissions don't read as oversights:
no Open Graph or Twitter cards, no canonical URLs, no `hreflang` between `/` and
`/he`, no `robots.txt` or `sitemap.xml`, and no prerendering. Those stay
deferred to the later Vite SEO effort. The consequence to know: these strings
are set client-side, so a link-preview bot never sees them — it reads
`client/index.html`, which is why that file's description was rewritten in the
same change to be the best all-purpose sentence about the product. Its `<title>`
stays the bare brand on purpose: nothing stamps a title before React mounts, so
a sentence there would flash English at a Hebrew visitor mid-fetch.

_Implemented in [pageMeta](../../client/src/lib/pageMeta.ts),
[HostActivityPage](../../client/src/pages/teacher/HostActivityPage.tsx),
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx), and the
`meta.*` keys across `client/src/i18n/locales/`._

### Hebrew talks about the teacher without guessing their gender

_2026-07-27_

**Decision:** The student's screens name no actor where a phrasing without one
is at least as natural. "Your teacher removed you from the activity" is
`הוצאת מהפעילות`, "Your teacher ended the chat" is `הצ׳אט נסגר`, "Your teacher
paused the chat" is `הצ׳אט מושהה`. Masculine third person stays where the
sentence is genuinely _about_ what a teacher does — the demo steering buttons
(`המורה עוצר את השיעור`) and the lobby's "{host} is picking who chats with
who", which interpolates the teacher's own name.

**Why:** [Hebrew is written in masculine second
person](#hebrew-is-written-in-masculine-second-person) already accepts
addressing half a class in the wrong gender, and says to sidestep where a
phrasing can. The student flow is where that bites hardest: it mentions the
teacher on a dozen screens, most Israeli teachers are women, and unlike
`אתה` — which a teenager reads as the generic — `המורה סגר` is a specific
claim about a specific person the student is looking at across the room. The
passive costs nothing here: every one of these sentences already says what
happened, and _who_ was never the interesting half.

The exception is deliberate rather than lazy. The demo panel's buttons exist
to say "this is the thing a teacher does", so an actor-free label
(`עצירת השיעור`) would read as a system setting instead of a person's move.

---

### The brand is חברולה in Hebrew, and the logo mark never mirrors

_2026-07-27_

**Decision:** Under `/he` the brand reads **חברולה** everywhere the app writes
it: the navbar wordmark, the student world's pill, the `<title>` suffix, and
body copy. What stays Latin is the domain (`chaverola.com`, which a teacher
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
`usePageMeta` hook. Routes without a title fall back to bare "Chaverola".

**Why:** Product-owner call for SEO: the page-specific words get prominence in
search results while the brand still matches a "Chaverola" search. Brand-first
("Chaverola | Join an Activity") and an audience prefix ("Student - Join an
Activity") were both rejected — the first buries the page's keywords, the
second adds clutter without search value. Full SSR/meta-tag SEO is deferred to
a later Vite SEO effort; until then titles are set client-side only.

**Update (2026-07-27):** the format is unchanged, but what goes inside it is
now settled separately — see [The meta title is written for a search result,
not for the page, and the demo carries its
own](#the-meta-title-is-written-for-a-search-result-not-for-the-page-and-the-demo-carries-its-own).
The hook was also renamed `usePageTitle` → `usePageMeta` when it took on the
description; the name is corrected above.

_Implemented in [usePageMeta](../../client/src/lib/usePageMeta.ts)._
