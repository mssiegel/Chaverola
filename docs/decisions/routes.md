# Routes & app structure

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### The sitemap is generated from `PAGE_META`, and carries no `lastmod`

_2026-07-28_

**Decision:** `dist/sitemap.xml` is written at build time by
`client/scripts/prerender-head.mjs` from the same array of pages it stamped the
heads from — not hand-written into `client/public/`. Ten `<url>` entries, each
with `xhtml:link` alternates for both locales plus `x-default`. No `lastmod`, no
`changefreq`, no `priority`. `robots.txt` points at it with an absolute
`Sitemap:` line.

**Why generated:** a hand-written file would be a second home for the route
list, and a sitemap that has quietly fallen behind the site is worse than none —
it tells a crawler to keep fetching pages that moved. Coming out of the
`PAGE_META` walk means a route added to that table appears in the sitemap and in
the heads, or in neither.

The map earns its keep on the two demo URLs above all. Nothing on the site links
`/activity/host/1234` or `/activity/join/1234` — they go out in a pitch email —
so either the sitemap names them or a crawler finds them by accident. The Hebrew
tree is the other half: `hreflang` in a sitemap is a signal Google reads
independently of the head links added by [The demo URLs redirect at the edge,
and the React route is now its dev
twin](#the-demo-urls-redirect-at-the-edge-and-the-react-route-is-now-its-dev-twin),
and having both is cheap redundancy — but only while they agree. So both come
out of one function, `pageUrls` in `client/src/lib/prerenderMeta.ts`. A `<loc>`
that differs from its page's canonical by a trailing slash is a silent, classic
defect, and it cannot arise when neither string is written twice.

**Why no `lastmod`:** Google ignores `changefreq` and `priority` outright, so
those are noise. `lastmod` is different — it is read, and it is only useful while
it is true. A build timestamp would claim all ten pages changed on every deploy,
which teaches the crawler to distrust the field and costs the one case it was
meant to serve. If a real signal is ever wanted it has to come from git, not from
the clock. Recorded here rather than left blank because a missing field looks
identical to a forgotten one.

The `Sitemap:` line is the only place the origin appears as a literal outside
`SITE_ORIGIN` — the spec requires an absolute URL, and a `.txt` file cannot
import. Both ends carry a comment naming the other. A build-time check that they
match was considered and skipped: `client/index.html` mirrors the same constant
under the same rule with only a comment, and a third mechanism guarding a
two-line pair costs more than the drift it prevents.

### `robots.txt` fences the two capability path shapes, and carves the demo back out

_2026-07-27_

**Decision:** `client/public/robots.txt` disallows `/activity/host/` and
`/activity/join/` in both locales, and re-allows `/activity/host/1234` and
`/activity/join/1234` in both. `/app.html` is disallowed too. AI crawlers —
GPTBot, ClaudeBot, PerplexityBot — are **allowed**, by inheriting the one
`User-agent: *` group rather than getting one of their own.

**Why:** A live classroom is a URL capability. Whoever holds
`/activity/host/<hostKey>` runs the class, and `/activity/join/<joinCode>` is a
live 4-digit code. Neither is linked from anywhere, so neither is discoverable
today — but every unmatched path answers HTTP 200 with the shell, so one that
escaped into a forum, a shared screen or a tweeted screenshot would be crawled
like any other page.

`Disallow` rather than `noindex`, and that is the right tool here rather than
the weaker one: `noindex` is a tag, so it only works once the crawler has
fetched the page, which is the thing being prevented. The trade is that a
disallowed URL someone links to can still surface as a bare URL in results —
acceptable, because the page's contents never leave the site.

**The demo is the carve-out, and it is the whole subtlety of the file.**
`/activity/host/1234` is the link that goes into a pitch email; nothing else
links it. The `Allow` lines win because a matcher resolves a conflict by longest
matching path, which is why the code is spelled out rather than derived — the
same reason `client/src/lib/pageMeta.ts` spells it out instead of importing
`DEMO_JOIN_CODE`. Those two must stay in step. The rules were checked against a
real matcher, not read: `Allow`/`Disallow` precedence is the classic place to be
confidently wrong, and `Disallow: /activity/join/` deliberately does **not**
block `/activity/join`, the join gate, which is a real indexed page.

The AI-crawler call is written down because it is a real product choice some
sites answer the other way, and because the absence of a rule looks identical to
never having decided. They are the readers the homepage's `<noscript>` block was
written for ([The homepage ships its words in a `<noscript>`
block](branding.md#the-homepage-ships-its-words-in-a-noscript-block-and-the-demo-urls-get-none)),
so blocking them would invalidate that work. **Allowing them must stay an
inheritance, never a group of their own:** a matcher obeys the most specific
matching group only, so an explicit `User-agent: GPTBot` block would make GPTBot
ignore every `Disallow` above it and crawl live classrooms.

Two things this deliberately does not fix. **Every unknown path still returns
HTTP 200**, so Google will see soft 404s; narrowing what gets crawled is not the
same as answering correctly, and a real fix needs a Vercel 404 route or an edge
function ([docs/plans/seo/README.md](../plans/seo/README.md) → "What's
deliberately not here"). And the prerender pass writes every page twice, so
`.html` twins like `/activity/join.html` are reachable duplicates — left
unfenced on purpose, since nothing links them and each carries a self-canonical
pointing at its clean URL, which is the mechanism that already consolidates them.

Naming the capability path shapes in a public file leaks nothing: `README.md`
publishes the same route table, and a hostKey is 24 base64url characters of
`randomBytes` — 144 bits.

_`robots.txt` is a **static file, not a route** — Vercel serves real files from
the output directory before applying the catch-all rewrite in `vercel.json`, so
"routes are canonical" is not in tension with it and nothing in `App.tsx`
changes._

---

### The demo URLs redirect at the edge, and the React route is now its dev twin

_2026-07-27_

**Decision:** `/demo`, `/demo/teacher` and `/demo/student`, plus their three
`/he` twins, are 308 redirects served by Vercel from
[`vercel.json`](../../client/vercel.json). The `<Navigate>` routes in
[`App.tsx`](../../client/src/App.tsx) stay exactly as they are and are now the
**dev twin**: `vite dev` never reads `vercel.json`, so deleting them would break
the demo links for anyone working locally. Six rules, one per locale per source,
because a static redirect can't read a visitor's language preference.

This does not replace
[`/demo`, `/demo/teacher`, and `/demo/student` are thin
redirects, never pages](#demo-demoteacher-and-demostudent-are-thin-redirects-never-pages),
which still stands. What changed is _where_ the redirect happens, not what it
is — a demo URL that grew its own UI would still be the diverging second path
that entry deleted.

**Why:** A client-side redirect is invisible to anything that doesn't run
JavaScript. A crawler or a link unfurler fetching `/demo` got HTTP 200 and the
generic fallback shell, and never reached the demo page — so the one URL that
goes into a pitch email was also the one that could say least about itself.
Following a real 308, an unfurler now lands on `/activity/host/1234` and reads
that page's own card.

The English targets still land correctly for a Hebrew-preferring visitor:
`applyBootLocale` rewrites `/activity/host/1234` to its `/he` twin at boot,
exactly as it does today.

**The trade, stated so nobody rediscovers it as a bug:** 308 is permanent, and
browsers cache it indefinitely. If the demo's target ever moves, anyone who has
visited `/demo` keeps the old destination until they clear it. That is the right
trade for URLs whose entire purpose is being stable enough to say out loud, and
it is why these are 308 rather than 307.

`vercel.json` spells `1234` out six times rather than reading `DEMO_JOIN_CODE`,
because JSON can neither import nor carry a comment explaining itself.
[`pageMeta.ts`](../../client/src/lib/pageMeta.ts) already makes the same
admission about the same literal; the note lives on `DemoRedirect` in `App.tsx`.

_Implemented in [vercel.json](../../client/vercel.json) and
[App.tsx](../../client/src/App.tsx)._

---

### A namespace can register on more than one page, and `chat` registers on four

_2026-07-27_

**Decision:** The shared chat chrome — header, transcript, feed banners,
composer, emoji picker — keeps its ~40 strings in the `chat` namespace, and
`import "@/i18n/ns/chat"` sits at the top of **four** lazy page modules: the
homepage, both teacher pages, and the student join flow.

**Why:** It looks like a case for [A component that renders on two pages keeps
its strings in
`common`](#a-component-that-renders-on-two-pages-keeps-its-strings-in-common),
and the exception is what that rule's own cost line points at: `common` loads
at init, so those forty keys × two locales would be paid for by every page,
including the join gate on thirty phones sharing one school AP. The chat
pieces are mounted on four surfaces the rule didn't anticipate — the marketing
hero IS a real chatbox, and the teacher's setup form and live settings panel
open the same emoji picker the student composer does — so `common` would have
absorbed most of a page namespace.

The `common` rule still holds for the small stuff: `Teacher/ChatCard`'s labels,
`DemoBanner`, `DemoControls`, and the end-a-chat dialog are a dozen keys
between them, and a dozen keys is cheaper than a fifth registration site.

The failure mode this trades for is a fifth page that renders a chat piece and
forgets the import. That is loud rather than silent: the DEV `missingKeyHandler`
in [`i18n/index.ts`](../../client/src/i18n/index.ts) logs
`[i18n] missing chat:<key>` on the first render, and every Hebrew driver in
`tools/verify/scratch/` watches the console for exactly that line.

---

### A component that renders on two pages keeps its strings in `common`

_2026-07-27_

**Decision:** Namespaces follow where a component is MOUNTED, not which folder
it lives in. `Teacher/ChatCard/`, `demo/DemoBanner` and `demo/DemoControls`
all sit under a feature folder but render on more than one page, so their
strings live in `common` — `card.*`, `endChat.*`, `lostConnection` and
`demo.*` — rather than in `teacher` or `student`.

**Why:** A namespace registers from a side-effect module that the lazy page
imports, so its strings ride that page's chunk. The chat card is the worked
example: the marketing homepage renders the real card in its teacher preview,
so putting the card's copy in `teacher` would either make the homepage import
the whole teacher catalog (both locales, a hundred-odd keys, on the page that
most needs to be fast) or duplicate the strings in two catalogs that then
drift. The demo banner and the steering panel have the same shape across the
teacher host page and the student world.

The rule has a cost: `common` loads at init, so every key added to it is paid
for by every page. That is why the bar is "genuinely mounted on two pages",
not "might be reused one day".

---

### Name lists are joined by `Intl.ListFormat`, pinned to the app's locale

_2026-07-27_

**Decision:** `lib/names.ts` builds "A and B" / "A, B, and C" through
`Intl.ListFormat`, and the locale it passes is always the app's `Locale`
(`en` or `he`), never `navigator.language`. Each name is wrapped in FSI…PDI
before joining.

**Why:** The joiner is a word, so an English `and` was the last piece of
untranslated prose on a Hebrew pairing rail. `navigator.language` is the
tempting default and is wrong: `en-GB` drops the Oxford comma, which would
make the sentence a teacher reads depend on which machine the browser is
running on. The per-name isolates matter because a class list mixes scripts —
without them, one Latin name at the front decides the direction of the whole
list, conjunction included, and the Hebrew names lay out backwards.

---

### `/he` is Hebrew and right-to-left; English stays unprefixed

_2026-07-27_

**Decision:** `/he` renders Hebrew copy, right-to-left, in Rubik. English keeps
the bare paths (`/`, `/activity/join`), and a third language would add its own
prefix rather than pushing English onto `/en`. `lib/locale.ts` reads a locale
list, so adding one is three entries there plus its catalog files.

**Why:** Founder call (2026-07-27), when the switcher was made to actually do
something. Keeping English unprefixed means chaverola.com is still the English
homepage with no redirect, every link already in the wild keeps working, and
nothing that a search engine has indexed moves. The asymmetry costs one
`DEFAULT_LOCALE` constant.

---

### Locale is detected once at boot and remembered, and the URL always wins

_2026-07-27_

**Decision:** Precedence, highest first: an explicit locale prefix in the URL,
then the activity's own locale once a join code resolves, then the visitor's
saved choice, then `navigator.language`, then English. A bare path means "no
preference", not "explicit English" — that is what lets an activity's language
reach a student who typed the plain URL.

Detection runs exactly once per page load, in `main.tsx` before `createRoot`,
and rewrites the URL with `replaceState`. Picking a language in the switcher
saves it to `localStorage` before navigating.

The activity rung fires later, because an activity resolves long after boot:
`JoinActivityPage` swaps the URL's locale for the activity's the instant
`lookup.state === "found"`, and never once a seat is in sessionStorage. What
counts as an explicit choice is tracked in `localePreference.ts` — a prefix
already in the URL at boot, or a switcher pick. A bare path that
`applyBootLocale` rewrote from `navigator.language` is a guess, so an activity
outranks it in both directions: a Hebrew activity's plain link lands an
English-phoned student on `/he`, and an English one sends a Hebrew-phoned
student back to the unprefixed path.

**Why:** An Israeli teacher shouldn't have to know to type `/he`, and a visitor
who deliberately picks English shouldn't be bounced back by their own phone
settings on the next click. Running before React exists means frame 1 of a
Hebrew load is already Hebrew and RTL instead of flashing English, and it keeps
the redirect out of render, where it would break the Rules of React. Only
unprefixed URLs are ever rewritten, so a shared `/he` link is never overridden
and the redirect cannot loop.

---

### The language switcher disappears once a student is seated

_2026-07-27_

**Decision:** On the student world, the floating language pill is visible at
the join gate and in the lobby, and gone from the moment a chat is on screen
(the same signal that hides the brand pill). The teacher's dashboard keeps its
switcher.

**Why:** `/` and `/he` are two separate route mounts, so switching language
gives the page a different identity and React unmounts and remounts it. Mid-chat
that means a dropped socket and a reset conversation. A student picks their
language at the gate; mid-roleplay is the worst possible moment to offer a
reset. Collapsing the two mounts into one optional-segment route would remove
the hazard, and was deliberately not attempted inside the localization work.

---

### Clicking to a new page opens it at the top

_2026-07-16_

**Decision:** In-app navigation scrolls the window to the top of the page it
opens. Two exceptions: browser back/forward keeps the browser's own scroll
restoration, and switching languages (same page, only the `/he` prefix
changes) keeps your place.

**Why:** Founder bug report (2026-07-16): "Open the teacher demo", clicked
from the homepage's demo section, opened the host page scrolled to its
middle. SPA routers keep the window's scroll position across navigations
unless told otherwise, so every link clicked from far down a page inherited
that scroll — and landing mid-page reads as broken.

_Implemented in
[ScrollToTop.tsx](../../client/src/components/layout/ScrollToTop.tsx), mounted in
[App.tsx](../../client/src/App.tsx)._

### `/demo`, `/demo/teacher`, and `/demo/student` are thin redirects, never pages

_2026-07-16_

**Decision:** Three speakable demo URLs: `/demo` and `/demo/teacher` land on
`/activity/host/1234`; `/demo/student` lands on `/activity/join` — the code
screen, so a visitor walks the student trip from its first step.
(**2026-07-16:** that last part changed — `/demo/student` now lands on
`/activity/join/1234`; see
[The student demo skips the code screen and joins you as Rachel](demo-flows.md#the-student-demo-skips-the-code-screen-and-joins-you-as-rachel).)
All three
are locale-aware `<Navigate>` redirects with no page components of their
own, and that's a hard rule:
[The temporary `/demo/*` routes are gone](#the-temporary-demo-routes-are-gone--every-surface-lives-in-its-real-flow)
still stands — a demo URL that grows its own UI recreates the diverging
second path that entry deleted.

**Why:** Founder call (2026-07-16). The demos are a sales surface, and
"chaverola.com slash demo" can be said across a table in a way "slash
activity slash host slash one-two-three-four" can't. Bare `/demo` goes to
the teacher view because pitches are aimed at teachers. Redirects cost
nothing to keep in sync — there is nothing in them to drift.

_Implemented in [App.tsx](../../client/src/App.tsx)._

### The temporary `/demo/*` routes are gone — every surface lives in its real flow

_2026-07-15_

**Decision:** The temporary demo routes `/demo/student-chat` and
`/demo/teacher-chat` are removed, along with everything only they used: their
pages, the `useTeacherChatsDemo` drip engine, the `studentChatDemo` /
`teacherChatDemo` scenario data, the `MonitoredChat` / `TeacherChatScenario`
types, and the demo-only chrome (`DemoPageHeader`, `SegmentButton`). The
student chatbox is exercised through the real join flow (`/activity/join`,
code `1234`) and the teacher chat cards through the real live activity page
(`/activity/host/1234`). Older entries in this file that mention
`/demo/student-chat` describe behavior that now lives at those real routes.

**Why:** The demo routes existed to build the chatbox and chat cards before
their real pages did. Both are now wired into the real flows, so the demo
routes had become a second, diverging path to the same components — extra
code to keep in sync and a misleading entry point. The dev-only "Demo
controls" panels stay, inside the real flows: the routes were duplication,
not the testability.

_Routes live in [App.tsx](../../client/src/App.tsx)._
