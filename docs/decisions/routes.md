# Routes & app structure

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

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
