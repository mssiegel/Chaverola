# Hebrew — the `/he` tree actually speaks Hebrew

**State: Complete.** All seven prompts shipped, 2026-07-27.

`/he` has existed since the routing work as a mirror of the whole route tree,
rendering identical English text left to right. This plan makes it a Hebrew
product: every user-facing string, the document title and meta description,
right-to-left layout, mirrored directional icons, a Hebrew typeface, a Hebrew
transcript email, and a demo cast an Israeli teacher recognizes as their own
curriculum. English is untouched throughout.

A separate future task adds Vite prerendering and SEO for the homepage,
`/activity/create`, and `/activity/join`. Prompt 1 already set the
title/description strings up as a pure, route-keyed table
([`lib/pageMeta.ts`](../../../client/src/lib/pageMeta.ts)) so that task can
consume them without rework. Don't do prerendering here.

## Product calls — settled, don't re-litigate

Founder, 2026-07-27. All of these are recorded in
[`DECISIONS.md`](../../../DECISIONS.md); the pointers are there so a prompt can
check the reasoning, not so it can reopen the question.

|                    | Call                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mechanism**      | `react-i18next` in the client. **The server takes no i18n dependency** — one hand-rolled `Record<Locale, EmailCopy>`.                                                            |
| **Register**       | Conversational Hebrew, **masculine second person**, never slash forms (`אתה/את`). Teacher surfaces talk to a colleague; student surfaces read at upper-middle/high-school level. |
| **Brand**          | **חברולה** in Hebrew, everywhere the app writes it, wordmark included. The domain and the email From-name stay Latin.                                                            |
| **Font**           | Rubik under `[dir="rtl"]`, Fredoka behind it. A quality call, not a missing-glyph fix.                                                                                           |
| **Detection**      | URL prefix > activity locale > saved choice > `navigator.language` > English. A bare path means _no preference_, not _explicit English_.                                         |
| **Student locale** | The activity stores its locale at create; a student resolving a join code inherits it, so a class matches the projector.                                                         |
| **URL scheme**     | English stays unprefixed. A third language adds its own prefix.                                                                                                                  |
| **Icons**          | `flip-rtl` **per icon**, never a sweep.                                                                                                                                          |
| **Switcher**       | Hidden once a student is seated.                                                                                                                                                 |
| **Demo**           | Re-cast, not translated. Hero: **הכנרת ↔ מד המים**. Activity: **תל אביב, ה׳ באייר תש״ח**, the hours before the Declaration.                                                      |
| **Tests**          | Fix what breaks. TypeScript carries catalog completeness. Add almost nothing.                                                                                                    |

**The invariant this work could plausibly break:** teacher-authored free text is
**never translated**, in any locale — character names, the host's name, the
student instructions, student real names, and every chat message pass through
verbatim, in every projection and both email parts. A prompt that "translates
the demo" into the catalogs has broken it.

## How to run these

Same rules as every plan doc in this repo. **One prompt per session.** Read this
whole header before starting a prompt: the conventions below are part of every
prompt and are not repeated in each one.

Each prompt ends green (`pnpm typecheck` + `pnpm test` + its own browser pass),
gets **one commit straight to `main`**, and is safe to push on its own. Run
`pnpm format` before committing — `prettier-plugin-tailwindcss` reorders the
`rtl:` variants you add, so never hand-order class strings. Record decisions in
[`DECISIONS.md`](../../../DECISIONS.md) plus the right file under
[`docs/decisions/`](../../decisions/), and **run the humanizer skill on new
user-facing copy** — Hebrew counts. **Tick the checkbox** in the list below in
the same commit as the work.

- [x] Prompt 1 — Plumbing, RTL, shell and homepage (`b9a9e59`)
- [x] Prompt 2 — Teacher surfaces
- [x] Prompt 3 — Student surfaces
- [x] Prompt 4 — `locale` on the record, `railNotice` beside `rematchNotice`
- [x] Prompt 5 — The Hebrew transcript email
- [x] Prompt 6 — Drop the deprecated prose
- [x] Prompt 7 — The Hebrew demo cast

Prompts 2 and 3 are independent of each other; both must land before 4's client
half, which needs `useTranslation` on the host page. 4 → 5 → 6 are sequential,
and **6 must not ship until 4 is confirmed live on both sides**. 7 is
client-only and can run any time after 3.

---

## What prompt 1 already built

Read these before writing any string. Every later prompt uses them, and none of
them should be reinvented.

**Catalogs.** [`client/src/i18n/`](../../../client/src/i18n/): flat dotted keys
in `locales/{en,he}/<ns>.ts`, five namespaces (`common`, `home`, `teacher`,
`student`, `chat`). `common` loads at init and is the only namespace eager code
may read. The rest register from a side-effect module in `i18n/ns/`, which the
lazy page imports at its top — **so the strings ride that page's chunk and cost
no request.** All four page modules already carry their import.

**Completeness is a compile check.** English catalogs are `as const satisfies
Catalog`; Hebrew ones are _annotated_ `HebrewOf<EnCatalog>`, which demands every
English key plus a `_two` for every plural base. A missing Hebrew key is
"Property 'x' is missing"; a stray one is an excess-property error. There is no
parity test and none is wanted.

**Plurals.** Hebrew's CLDR categories are `one` / `two` / `other` — there is no
`many`, and `_two` fires at **exactly 2**, the most common count on a teacher's
dashboard. Hebrew spells small numbers as words, so `_one` and `_two` usually
omit `{{count}}` on purpose. A **zero** branch is a different sentence, not a
plural form: give it its own key, because i18next honors `_zero` only for
languages whose CLDR set has it, which en and he don't.

**Bidi.** `{{name, bidi}}` wraps an interpolated value in FSI…PDI, registered
via `i18n.services.formatter.add` in
[`i18n/index.ts`](../../../client/src/i18n/index.ts) (i18next 26 dropped
`interpolation.format` from its types). In JSX, use `<bdi>`. Use both freely on
anything a teacher or student typed. Where a run of digits meets a neutral —
`m:ss`, `{count}/{MAX}`, a numbered-list marker, a join code, a bare URL — the
fix is `dir="ltr"` on the element, not an isolate.

**Extraction convention — one rule.** _A copy function takes `t` as its first
parameter and stays pure. A copy object becomes a map of keys. Nothing becomes a
hook._ Hooks would make these uncallable from `getFixedT` (which
[`PageErrorBoundary`](../../../client/src/components/layout/PageErrorBoundary.tsx)
needs, sitting outside the router) and from a future prerender, and would hand
the React Compiler a component that isn't one. Type the parameter
`TFunction<"teacher">` and you keep full key checking.
[`stageTypes.ts`](../../../client/src/pages/student/join/stageTypes.ts)'s
`STAGE_TITLE_KEYS` is the worked example of the object case, including why the
`as const satisfies Record<StudentStage, …>` is load-bearing.

**RTL.** Logical properties are already swept **across the whole app**, so
prompts 2 and 3 are pure copy work and should need no CSS. Three exceptions stay
physical and say why in place: `StudentWorldLayout`'s safe-area paddings
(`env()` values are physical), `ui/dialog`'s centering (direction-invariant),
and the decorative blur/doodle scatter (composition, not reading order).
Transforms have no logical form: mirror a whole control with `rtl:-scale-x-100`
when it holds no text, or write an explicit `rtl:` twin when it does. `flip-rtl`
is defined in [`index.css`](../../../client/src/index.css) and is applied per
icon — vertical chevrons, media transport controls (play, fast-forward), cycle
glyphs, and the logo mark all deliberately stay put, and each says so at its
call site.

**`<Trans>` is sanctioned for one thing:** a styled fragment inside a sentence,
where word order differs by language. It ships inside `react-i18next`.
[`HomePage`](../../../client/src/pages/HomePage.tsx)'s hero and
[`PlansSection`](../../../client/src/components/home/PlansSection.tsx)'s Google
Classroom bullet are the two worked examples. Don't reach for it otherwise.

**Head start already in the catalogs:** `teacher` holds `setup.meta.*` and
`host.meta.title`; `student` holds the six `title.*` keys and
`join.meta.description`; `chat` is empty. All four pages call `usePageMeta`.

**`aria-label` and `sr-only` text is copy too.** It never renders visibly, so
it's the easiest thing to miss. Make `grep -rn 'aria-label=\|sr-only'` an
explicit step in every prompt that touches components.

---

## Prompt 2 — Teacher surfaces

**Goal:** a teacher can set up and host an entire activity in Hebrew, right to
left, without meeting an English word.

1. **Fill [`locales/en/teacher.ts`](../../../client/src/i18n/locales/en/teacher.ts)
   and its Hebrew twin.** The meta keys are already there; everything below adds
   to them. Extract as you go rather than up front, so a key's shape is decided
   by the call site that uses it.
2. **`components/Teacher/ActivitySetup/`** — `index.tsx` (its `FAILURE_COPY` map
   and the submit-button labels), `SettingsSection.tsx` (three setting rows plus
   the stepper's `format`, `decreaseLabel`, and `increaseLabel`),
   `AboutYouFields.tsx`, `CharacterRowsField.tsx` (its `ROW_PLACEHOLDERS` array
   is example content, so give it a Hebrew cast — Israeli-curriculum names, per
   prompt 7's reasoning), `StudentInstructionsField.tsx` (placeholder), `NumberStepper.tsx`,
   `FieldFeedback.tsx`, `FormSection.tsx`, `LobbyPreview.tsx`.
3. **[`lib/activitySetup.ts`](../../../client/src/lib/activitySetup.ts)** —
   `SetupProblem.message` becomes `messageKey`; the four validation strings move
   to the catalog and the consumers call `t`. **`activitySetup.test.ts` asserts
   `.field` only, so it does not break** — leave it alone.
4. **`components/Teacher/HostActivity/`** —
   `confirmCopy.ts` (five actions × four fields; convert to
   `confirmCopy(t, …)`, and leave `confirmVariant` in code, since it's behavior
   rather than copy), `WrappedUpCard.tsx` (`wrappedCopy(t, …)`, six email-outcome
   states, four of which interpolate the teacher's Latin address — `{{to, bidi}}`),
   `index.tsx`, `PairingPanel.tsx`, `HostHeader.tsx`, `ChatsInProgressSection.tsx`,
   `CompletedChatsSection.tsx`, `CollapsibleSection.tsx`, `LiveSettingsPanel.tsx`,
   `JoiningInstructions.tsx`, `EmptyState.tsx`, plus `Teacher/ChatCard/`.
5. **Plurals** — `waitingHint` in `HostActivity/index.tsx`, the hold notice in
   `PairingPanel.tsx`, and **two the first audit nearly missed**:
   `ChatsInProgressSection.tsx`'s "students mid-chat" and
   `CompletedChatsSection.tsx`'s "wrapped up" both hard-code the plural `s` on
   counts that are ≥2 in practice, so English never shows a bug while Hebrew's
   `_two` fires on the most common value.
6. **Bidi in `JoiningInstructions.tsx`**, which is the densest spot on the page:
   `dir="ltr"` on the pin tile (its `tracking-[0.2em]` trailing letter-space
   otherwise lands on the wrong edge), `dir="ltr"` on `www.chaverola.com` (which
   otherwise renders `com.chaverola.www`), and `dir="ltr"` on the hand-written
   `1.` `2.` `3.` markers. `collapsedHint` has to widen from `string` to
   `ReactNode` in `CollapsibleSection` so it can carry a `<bdi>`.
7. **[`lib/time.ts`](../../../client/src/lib/time.ts)** — `formatWaitShort`'s
   `s` and `m` are English abbreviations. Split it into
   `splitWaitShort(n) → { unit, value }` and render through a plural key. Add a
   doc line on `formatSecondsAsClock` saying its `m:ss` output must always render
   inside a `<bdi>` — the `:` is a neutral between two digit runs, so `1:43`
   renders as `43:1` in an RTL line otherwise. Its one call site today is
   `PeerReconnectBanner`, which prompt 3 owns.
8. **Leave a `// TODO(prompt 4)`** at `PairingPanel`'s `rematchNotice` render.
   It is server-authored English and will otherwise look like a bug on an
   otherwise-finished dashboard.
9. **Icons:** `flip-rtl` on `ArrowRight` in `ActivitySetup/index.tsx` and on the
   `LogOut`/`DoorOpen` exits. **Not** on `Play` (transport control) or `Repeat2`
   (a cycle) — comment each refusal.

**Traps:** the roster and settings popovers get their direction from the
`DirectionProvider` in [`App.tsx`](../../../client/src/App.tsx), so check their
`align` visually rather than assuming. The blur-glow scatter on both teacher
pages stays physical and already says so.

**Tests:** none new. Keep `activitySetup.test.ts`, `hostWorld.test.ts`, and
`hostChats.test.ts` green.

**Done when:** `pnpm typecheck` + `pnpm test` green. Browser pass at desktop and
phone width over `/he/activity/create` (fill the whole form) and
`/he/activity/host/1234?fast=10` (pair, open every collapsible, open the
end-activity confirm), then the same two in English to prove nothing moved.
Check for horizontal overflow on both. `pnpm format`, one commit, box ticked.

---

## Prompt 3 — Student surfaces

**Goal:** a student joins, waits, chats, and reaches every ending in Hebrew.

**Prompt 2 already did the shared parts of items 6 and 11, and it is worth
reading before redoing them.** `EndChatConfirmationModal`'s own title and
confirm label, and `DemoBanner` / `DemoControls`, render on the teacher's demo
page too, so they are already translated and their strings sit in **`common`**,
not in `chat` or `student` (see DECISIONS.md → "A component that renders on two
pages keeps its strings in `common`"). That also settles the cross-namespace
problem those two would otherwise have posed: `components/chat/` is registered
by the student pages, and the teacher's chat card mounts both of them. Prompt 3
still owns `ChatDemoControls.tsx` and `LobbyDemoControls.tsx`, which are
student-only. `DemoBanner` needed two keys rather than a `<Trans>` — the "Start
your own" link is a trailing CTA, not a fragment inside the sentence.

1. **Fill `locales/{en,he}/student.ts` and `chat.ts`.** The six `title.*` keys
   and `join.meta.description` are already in `student`.
2. **`pages/student/join/`** — `JoinGateCard.tsx`, `ActivityGoneCard.tsx`,
   `ActivityFullCard.tsx`, `LoadingCard.tsx`, `ReconnectingCard.tsx`,
   `LobbyDemoControls.tsx`.
3. **`stageTypes.ts`** — `UNREACHABLE_COPY` moves into the catalog and its export
   is deleted. `FALLBACK_CHARACTER_NAME` is **threaded as a parameter** instead,
   matching how `selfName` is already threaded, because
   [`liveMatchState.ts`](../../../client/src/pages/student/join/liveMatchState.ts)
   is a pure node-tested module and must stay one.
4. **`liveMatchState.ts`** — thread a `notices` object built by the caller from
   `t` for its two membership notices. **This is where most of the breaking test
   assertions live**: `liveMatchState.test.ts` around lines 96, 103, 218-221,
   355, and 363 assert on the generated English. Update the fixtures rather than
   loosening the assertions.
5. **`components/Student/`** — `WaitingLobby.tsx` (three-way waiting and body
   lines, four pills, the leave confirm; `{{hostName, bidi}}`),
   `Chatbox/ChatEndedSection.tsx` (`endedCopy(t, …)`, eight cases — **the emoji
   tiles are art, not copy, and stay in code** so a translator can't change
   them), `Chatbox/index.tsx`, `ChatStage.tsx`, `LiveChatStage.tsx`.
6. **`components/chat/`** — `ConversationLines.tsx`, `ChatHeader.tsx`,
   `MessageComposer.tsx`, `Conversation.tsx`, `PeerIsTyping.tsx`,
   `PeerReconnectBanner.tsx`, `SelfReconnectBanner.tsx`, `ChatPausedBanner.tsx`,
   `EndChatConfirmationModal.tsx`, `LazyEmojiPicker.tsx`, `EmojiPickerBody.tsx`.
7. **The transcript line is the hard one.** `ConversationLines.tsx` renders
   `(realName) character: message` — up to three scripts on one line separated by
   neutrals. The container keeps the **UI's** direction, so the "(you)" tag and
   the retry button sit at a consistent inline end; each field then isolates
   itself in its own `<bdi>`, with **the parentheses inside the bdi**, since
   they're the neutrals that would otherwise swap ends. One fix covers both the
   student chatbox and the teacher's chat card.
8. **English contractions split across styled spans.** `ChatHeader.tsx` renders
   `<span>You're </span>` + name and `<span>with </span>` + name. That is not one
   key without restructuring: move the styling to a wrapper and use one key plus
   `<bdi>{name}</bdi>`.
9. **More bidi:** `dir="ltr"` on the join-code `<input>` (`tracking-[0.4em]` plus
   `text-center` plus RTL puts the caret and the trailing letter-space on the
   wrong side, and the `1234` placeholder pads backwards) and on the composer's
   `{count}/{MAX}` counter. `<bdi>` around `formatSecondsAsClock` in
   `PeerReconnectBanner`.
10. **`emoji-picker-react` has zero RTL support** (`grep -o "rtl"` over its
    bundle hits only the substring inside "turtle"). **This one is not
    student-only:** the setup form's character rows open the same picker, so
    its English "Search" and category names are the last English a Hebrew
    teacher can reach. Prompt 2 checked the popover's RTL anchoring and left
    the picker's own chrome here. Wrap `<EmojiPicker>` in
    `<div dir="ltr">` — correct anyway, it's a grid of pictures rather than
    prose. Its `searchPlaceHolder`, `searchClearButtonLabel`, and
    `categories[].name` **are** translatable; "No results found" and the a11y
    live region are module constants and are not, so accept them. Build the
    `categories` array at **module scope**: the picker memoizes config by
    reference, so a fresh array per render re-renders every visible emoji on
    every keystroke.
11. **`components/demo/`** — `DemoBanner.tsx` (needs `<Trans>`),
    `ChatDemoControls.tsx`, `DemoControls.tsx`.
12. **Plurals:** `ChatHeader`'s "and N others".

**Traps:** the switcher already hides once a student is seated — don't
reintroduce it. The student world's safe-area paddings stay physical.

**Tests:** update `liveMatchState.test.ts`'s fixtures. Add nothing.

**Done when:** `pnpm typecheck` + `pnpm test` green. Browser pass at phone width
(this flow is phone-first) over `/he/activity/join/1234?fast=10` end to end —
gate, lobby, chat, ended — plus a real activity from `pnpm verify:up` with two
students, driven far enough to see a reveal and a peer-drop banner. Then the
same in English. `pnpm format`, one commit, box ticked.

---

## Prompt 4 — `locale` on the record, `railNotice` beside `rematchNotice`

**Goal:** an activity remembers the language it was created in, a student
inherits it, and the pairing rail's notice crosses the wire as data instead of
English prose.

**Read [`docs/adding-a-wire-event.md`](../../adding-a-wire-event.md) first.**

1. **`shared/src/types.ts`** — add `LOCALES`, `Locale`, `DEFAULT_LOCALE` (here,
   not `constants.ts`, which already imports from `types.ts`; the other
   direction is circular) and `Activity.locale`. `HostedActivity` inherits it.
2. **`shared/src/api.ts`** — `CreateActivityRequest.locale` is **optional on the
   wire** and defaulted server-side. Non-negotiable: a required field 400s every
   create for the length of the Vercel deploy, on the worst possible surface.
3. **`shared/src/socket.ts`** — a **discriminated union**, not a flat bag:

   ```ts
   export type RematchNotice =
     | { kind: "stuckInLine"; names: string[] }
     | {
         kind: "tooFewCharacters";
         characterCount: number;
         studentCount: number;
       };
   ```

   The flat `{ kind, names?, … }` shape lets `{ kind: "stuckInLine" }` with no
   names typecheck, and the renderer then needs `!` on every read.
   `chats:snapshot` carries **both** `railNotice` (new) and `rematchNotice`
   (deprecated, one deploy only).

4. **Server** — `schemas/activity.ts` (`z.enum(LOCALES)`, keeping the
   `satisfies` pin), `store/activityStore.ts` (the field plus the
   `rematchNotice` → `railNotice` rename; **six fixtures are compiler-forced**,
   including `scripts/emailPreview.ts`, which `tsconfig` includes),
   `store/projections.ts`, `live/lobbyContext.ts`, `live/handlers/teacher.ts`.
   **Keep the `match:dismiss-rematch-notice` event name** — renaming a
   client→server event is a separate breaking change for no gain.
5. **`projections.ts` gets one line each in `toActivity` and
   `toHostedActivity`, and nothing in `toActivityDetails`** — the locale is
   frozen at create, and that untouched allowlist test is what proves it never
   leaks into the details channel. Add a `toRailNotice` projector so the notice
   stops escaping the projection layer's one-module rule now that it carries real
   student names. Two allowlist tests in `projections.test.ts` each gain the
   string `"locale"`; that is the whole invariant impact.
6. **Client** — `lib/locale.ts` re-exports `Locale` from shared (the shim pattern
   `types/activity.ts` already uses); `hostEngine`, `hostWorld`,
   `useHostActivityLive`, `useHostActivityDemo`, and `PairingPanel` move to
   `railNotice`. `hostWorld.test.ts`'s three prose assertions become structural
   `toEqual({ kind, names })`, which pins **more** than the strings did.
7. **Replace `shared`'s `listNames`** with a client `lib/names.ts` using
   `Intl.ListFormat`, **pinned to the `Locale` value, never `navigator.language`**
   — `en-GB` drops the Oxford comma, which would make the rendered output depend
   on the machine the browser runs on. It reproduces the current English exactly.
   **`lib/names.ts` already exists**: prompt 2 needed it for the rail's two
   client-authored sentences, so only the `shared` half is left (and prompt 6
   deletes it outright). It isolates each name before joining — a Latin name at
   the front otherwise flips the whole list.
8. **Locale inheritance fires only before a seat exists** — at the instant
   `lookup.state === "found"`, never once a session is in sessionStorage.
   `/` and `/he` are separate `<Route>` mounts, so the redirect gives the page a
   different identity and React unmounts and remounts it, wiping state and
   reconnecting the socket. **Verify the ordering against
   `useHostActivityLive` opening its socket.**

**The deploy hazard, and it is the sharpest in this plan.** If `rematchNotice`
merely changed type, an old client would render an object as a React child,
throw, and unwind to `PageErrorBoundary` — which is mounted at the **root**, so
it replaces the _entire teacher dashboard_ with an error page, mid-lesson. The
usual server-then-client push dance **cannot help**: `shared/` is in both deploy
triggers, so no commit touching it is server-only. Shipping both fields is the
only tool. New-client/old-server then degrades to a missing notice for one
deploy, which is the failure this deliberately chooses.

**Done when:** `pnpm typecheck` + `pnpm test` green across all three workspaces.
A real activity from `pnpm verify:up`: create from `/he/activity/create`, confirm
a student who types the bare join URL lands in Hebrew, and trigger both notice
kinds on the rail. `pnpm format`, one commit, box ticked. **Note in the commit
that prompt 6 is gated on this being live.**

---

## Prompt 5 — The Hebrew transcript email

**Goal:** a teacher who ran a Hebrew activity gets a Hebrew transcript that
renders right to left in a real mail client.

Touches only `server/src/email/**` and `server/scripts/emailPreview.ts`. No
`shared/` change, so **only Render deploys and nothing can race.** The safest
prompt here.

1. **`server/src/email/copy.ts` (new)** — `Record<Locale, EmailCopy>`,
   hand-rolled. A typed record makes a missing string a **compile error**;
   i18next would make it a runtime fallback and cost a dependency for the only
   prose the server ships.
2. **Subject: `חברולה · הפעילות של {host} (קוד {code})`.** Brand first is
   load-bearing — a subject line has no `dir` mechanism, so the client guesses
   from the first strong character. Opening with חברולה makes it RTL even when
   the teacher's name is Latin, and the trailing `(קוד 5678)` then renders with
   mirrored parens and in-order digits with no marks at all. **Do not move the
   brand off the front.** No RLM here: one at position 0 of a subject confuses
   column-alignment heuristics in some clients' message lists.
3. **Grammar choices worth keeping:** `hostedBy` is `מנחה: {name}`, a label
   rather than a verb, which sidesteps gender agreement with the teacher's name
   entirely. `participant` is `{name} בתפקיד {character}`, the playbill
   connective; `בתור` was rejected because תור also means "queue" and collides
   with the pairing UI's own vocabulary. **Keep `בתפקיד` here even though prompt
   3 shipped `לדבר בתור {name}…` in the composer** — that placeholder sits a few
   pixels under the homepage hero's own `תכתוב בתור {self}` from prompt 1, and
   two words for one idea on one screen reads worse than a collision with a
   word that only appears on the teacher's rail. `he/chat.ts` says so in place. Plurals are hand-written per noun
   (שיחה is feminine, תלמיד masculine; 1 and 2 take the spelled-out numeral).
4. **HTML part:** `dir` as an **attribute**, not CSS — Gmail strips `<html>` and
   `<body>` and much CSS but keeps `dir` on block elements — plus `text-align`
   alongside, because older Outlook honors `dir` for reordering but not block
   alignment. `<bdi>` around the three untrusted runs: character label, real
   name, message text. All three already pass through `escapeHtml`. A client that
   doesn't know `<bdi>` also doesn't apply `unicode-bidi: isolate`, so it
   degrades to a no-op.
5. **Plain-text part has no `dir` mechanism at all.** A renderer guesses each
   **line's** base direction from its first strong character, and `\n` is a
   paragraph separator — so a prefix on the block does nothing for lines 2..n.
   Prefix **every** Hebrew line with `U+200F RLM`. The case this exists for:
   `רחל בתפקיד ברוטוס 🔪 (עזב באמצע)` is fine until the student's name is Latin,
   at which point the paragraph is judged LTR, the parentheses are _not_
   mirrored, and the Hebrew runs lay out backwards. RLM rather than isolates
   because RLM is Unicode 1.0 and universally handled, while an isolate can
   render as a visible box in a plain-text client. **Comment it loudly** — it
   looks like mojibake in a Windows terminal and in the dev log's `text` field,
   and someone will try to clean it out.
6. **Font stack:** system Hebrew faces (`'Segoe UI'`, `'Arial Hebrew'`,
   `'Noto Sans Hebrew'`, …). **No Rubik** — mail clients don't load webfonts
   reliably.
7. **`emailPreview.ts` always writes both locales** rather than parsing a flag;
   that forces whoever changes the formatter to look at both. Give the Hebrew
   fixture Hebrew character names, and **keep one Latin-named student** — that's
   exactly the hazard the RLM fixes, so the preview shows the fix working.
8. **The From-name stays `Chaverola`.** `createMailer` runs once at boot and
   never sees a record. Record it as a decision, because it looks exactly like an
   oversight to the next agent.

**Tests:** all ten existing assertions stay **byte-identical** — `EMAIL_COPY.en`
reproduces today's constants exactly, and `record()` gains one compiler-forced
`locale: "en"`. Add **one** Hebrew test covering the three things code review
can't see: a brand-first subject, `dir="rtl"` in the HTML, `<bdi>` around a Latin
name, and an RLM on every non-empty text line. **Do not parameterize the suite
over both locales** — that doubles ten tests to prove the catalog is populated,
which is testing data rather than code.

**Done when:** `pnpm typecheck` + `pnpm test` green, `pnpm preview:email` opened
for **both** files and eyeballed. If SMTP credentials are available, one real
send to Gmail and one to Outlook is the only thing that truly proves the
encoding; if not, log the ask in
[`docs/pending-manual-tests.md`](../../pending-manual-tests.md). `pnpm format`,
one commit, box ticked.

---

## Prompt 6 — Drop the deprecated prose

**Gate: do not start until prompt 4 is confirmed live on both sides** —
`/healthz` reporting the new server commit **and** Vercel's latest production
deployment showing **Ready** (not Canceled) for the expected SHA. `/healthz`
alone does not catch a skipped client build.

Delete `rematchNotice` from the `chats:snapshot` payload, `legacyNoticeText`
from `lobbyContext.ts`, and `listNames` / `stuckInLineNotice` /
`tooFewCharactersNotice` from `shared/src/matchRules.ts` — the prose helpers were
always the odd ones out in a file whose header claims it holds pure matching
primitives. **The client changes nothing**; it has read `railNotice` since
prompt 4.

Race analysis: new client + old server means the old server still sends both and
the new client reads `railNotice`; new server + old client means the old client's
`?? null` yields no notice. **Degradation only, in both orders.**

Add the new section to [`docs/adding-a-wire-event.md`](../../adding-a-wire-event.md)
in this same commit: **"Changing an existing field's type"**, the
additive-then-subtractive two-push recipe worked through with
`rematchNotice → railNotice`, and the explicit statement that the
server-then-client ordering dance _cannot_ help when `shared/` is touched. That
is genuinely new knowledge for this repo and is the durable output of prompts
4 and 6.

**Done when:** green, a real activity's rail still shows both notice kinds,
`pnpm format`, one commit, box ticked.

---

## Prompt 7 — The Hebrew demo cast

**Goal:** a Hebrew visitor's demo is an Israeli classroom, not a translated
Roman one.

**After prompt 3, the scripted lines in `mockData/` are the ONLY English left on
a Hebrew student screen** — the chrome around them all reads Hebrew, so a
half-done cast is very visible. Two things prompt 3 changed under this prompt's
feet: `useChatDemo` is now a `t`-calling hook (its two membership notices come
from `chat:notice.*`), and `hostActivityDemo`'s removal notice does too — so
neither needs re-translating with the cast, only re-casting.

Client-only. The demo `1234` is purely client-simulated — the server refuses to
mint it, 404s it, and rejects it at socket auth — so **no Hebrew twin is needed
server-side.** The one deploy rule that still applies: the tip commit must touch
`client/`, or Vercel silently never rebuilds.

**Content**

- **Hero: `הכנרת 🌊` ↔ `מד המים`** — the Sea of Galilee arguing with the man who
  reports its level every winter. Same shape as the Moon/Armstrong joke: a
  landmark with feelings about being measured. Mirror the English beat structure
  exactly — four seed messages, two scripted lines, **empty `ambientLines` for
  the same deliberate reason**, six reply lines.
- **Activity: `תל אביב, ה׳ באייר תש״ח`**, the hours before the Declaration. Cast:
  `הרוח של הרצל 👻` / `בן־גוריון 📜` / `גולדה 🕊️` / `זאב שרף` (emoji-free on
  purpose, mirroring the English roster's shape). Herzl's ghost is the structural
  twin of Caesar's ghost: the man whose absence set the scene, turning up fifty
  years after Basel to comment. The documented secrecy of that day maps onto "a
  rumour is going around and nobody knows who to trust."
  _Basel 1897 was rejected despite the email fixture's precedent — Golda Meir was
  born in 1898 and was not there. Invisible in a test fixture, a howler on a page
  pitched to history teachers._
- **`studentInstructions` must be re-measured with `Array.from(s).length` and
  landed in 200–249.** The counter appears at 200 and turns red at 250, and
  Hebrew is denser than English, so don't copy the English "239 chars" comment.
- **Eighteen Israeli first names** spanning Ashkenazi, Mizrahi, Russian-Israeli,
  Arab-Israeli, and Ethiopian-Israeli — the same inclusive signal the English
  list sends. Short, per the chat-card header's recorded constraint.
- **`DEMO_STUDENT_NAME` = `נועה`**, and it must be absent from every pretend
  roster (the existing rule: the demo must never show two of the same name side
  by side).
- **`hostActivityDemo.ts`'s seed transcripts and chatter lines are deliberately
  character-agnostic** — its header comment says so, because host-page chats get
  characters assigned at pairing time, possibly a teacher's own cast. **This is
  the constraint a translator breaks first.** `activityChatDemo.ts`'s two
  scenarios _are_ character-specific and need real rewriting against the 1948
  cast, not translation.

**Structure** — each mockData file exports a `Record<Locale, …>`;
[`mockData/index.ts`](../../../client/src/mockData/index.ts) (the sanctioned
barrel — this is exactly package-boundary assembly) assembles a
`DEMO_CONTENT: Record<Locale, DemoContent>`; one hook `useDemoContent()` goes in
`lib/demoContent.ts`, because cross-cutting hooks live in `lib/` and a hook
doesn't belong in `mockData/`.

`heroCopyNames` already exists and the homepage prose already interpolates it
(prompt 1 did this) — it just becomes locale-keyed here.

Rejected, with reasons, so nobody retries them: pushing the casts into the i18n
catalogs (they are **not translations of each other**, and i18next assumes key
parity, which is exactly backwards), and `mockData/en/` + `mockData/he/`
directories (each wants its own index, which breaks the one-barrel convention).

**One real refactor:** `hostWorld.ts` imports `HOST_SEED_CHATS` and
`HOST_STUDENT_NAMES` at module scope and is pure with no React, so it cannot
call a hook. Thread them in via
`createInitialWorld(activity, { studentNames, seedChats })` from
`useHostActivityDemo`, which can.

**Worth writing:** a scratch driver at `tools/verify/scratch/he-demo.mjs` that
loads `/he/activity/host/1234` and `/he/activity/join/1234`, asserts
`document.dir === "rtl"`, asserts **zero** `/socket.io/` traffic via the existing
`watchForSocketTraffic` helper (the Hebrew demo must stay as structurally
zero-network as the English one), and screenshots both at phone width. That last
assertion is the one thing code review cannot see.

**Done when:** green, both demos driven in both languages, `pnpm format`, one
commit, box ticked. Then flip this doc's **State** line to Complete, and **add
the AGENTS.md status row** — Hebrew gives a teacher something new (a Hebrew
product for a Hebrew classroom), so unlike a fix it earns one. Last of all, run
the trimmed production pass from the `verify` skill: cold-wake, a deployed-build
smoke, and one network-sensitive leg.

---

## Pass record — 2026-07-27 (prompt 5, and the deploy that nearly hid prompts 1–4)

**Prompt 5 verified.** `pnpm typecheck` and `pnpm test` green (77/77 on the
server workspace, run four times over the change — the ten pre-existing
transcript assertions untouched). `pnpm preview:email` opened and eyeballed for
both locales. The plan's real-send leg **ran**: a Hebrew transcript went through
the live Gmail SMTP path and the founder confirmed it renders — right to left,
brand-first subject, the Latin-named student's line intact. Outlook was the only
leg blocked (no account to hand) and is logged in
[`docs/pending-manual-tests.md`](../../pending-manual-tests.md); its Word
renderer is the one engine that might honor `<bdi>` while dropping the
container's `dir`, which is the single case where the email would show a teacher
_wrong data_ rather than ugly data.

**The deploy hazard fired, and it was not prompt 5's.** Pushing prompts 4 and 5
together put a server-and-docs commit (`1f7b2c2`) on the tip, so Vercel's Ignored
Build Step canceled the client build — 1s duration, and the newest **Ready**
production build was **16 hours old**, predating prompt 1. Both dashboards read
green. The served bundle contained one scrap of Hebrew, `{en:"EN",he:"עב"}`, the
language switcher from the old routing work: **prompts 1–4's client halves had
never reached production at all.** Nothing broke meanwhile, because prompt 4's
deliberate two-field window covered it — the new server still sent the
deprecated `rematchNotice` beside `railNotice`, and the old client read the one
it knew. That is the design working exactly as its own section predicted.

Fixed with the documented recovery, `vercel --prod --yes` **from the repo root**
([`docs/operations.md`](../../operations.md) → Recovering a skipped client
build). Verified by grepping the served bundle rather than trusting Ready:
`railNotice` 13 hits and `rematchNotice` **0** in the host page chunk, both
notice kinds present, and the Hebrew catalogs shipping in their own chunk
(`Combination-*.js`, 789 Hebrew characters — the entry bundle is clean, so a
grep of `index-*.js` alone reads as a false negative and this is worth knowing
before someone repeats it). `/`, `/he` and `/he/activity/create` all 200;
`/healthz` on `1f7b2c2`.

**Prompt 6's gate is therefore open** — prompt 4 is confirmed live on both
sides. One thing to carry into it: prompt 6 touches `shared/` and `server/` and
**not** `client/`, so its own push will be canceled by Vercel the same way. That
is harmless there (the client changes nothing), but it is not a build worth
debugging.

---

## Pass record — 2026-07-27 (prompt 6)

**The gate was checked rather than assumed**, which is the whole point of it:
`/healthz` on `1f7b2c2` (prompt 4's `efa5c6e` is an ancestor), and the served
host-page chunk grepped directly — `railNotice` 13 hits, `rematchNotice` **0**,
`stuckInLine` and `tooFewCharacters` both present. Grep the lazy chunk, not
`index-*.js`: the entry bundle has never carried any of these and reads as a
false negative.

Green across all three workspaces (shared 1, client 92, server 77; no test
changed, because nothing asserted on the deleted prose). Both notice kinds
driven on a real activity by `scratch/p6-notice-fields-gone.mjs`, 8/8 — the
rail still words both sentences from the catalog, and `rematchNotice` appeared
in **zero** of the eleven `chats:snapshot` frames read off the wire. The
`tooFewCharacters` leg needs the stale-second-host tab: the panel clamps
selection to the cast size, so a single tab can no longer ask for more seats
than there are characters.

The durable output is
[adding-a-wire-event.md](../../adding-a-wire-event.md#changing-an-existing-fields-type)
— the additive-then-subtractive recipe, and the reason the server-then-client
ordering dance can't help when `shared/` is touched. That knowledge was the
real deliverable of prompts 4 and 6; the deletion itself is nine lines.

As this doc predicted, this commit touches `shared/` and `server/` but not
`client/`, so Vercel will cancel its client build. That is correct here — the
client's code is unchanged — and is not a build worth debugging.

---

## Pass record — 2026-07-27 (prompt 7)

Green across all three workspaces (shared 1, client 92, server 77), and **no
test changed**: TypeScript carried the whole refactor, because every
locale-keyed record is a `Record<Locale, …>` and `hostWorld.test.ts` never
touched `seedWorld`. The one real refactor landed as planned, except that the
function kept its name — `seedWorld(activity, cast)` rather than a rename to
`createInitialWorld`, since it has exactly one caller and the rename was
churn without a payer.

`scratch/he-demo.mjs`, **88/88** over both languages at 390 and 1440: both
demos driven end to end, `document.dir` asserted per locale, the 1948 cast
present on the host cards and the lobby chips with no Roman name surviving
(and the reverse in English), the Herzl/Ben-Gurion beat played, and **zero
`/socket.io/` requests** off any of the ten page loads. That last one is the
assertion code review cannot make: the Hebrew demo is as structurally
network-free as the English one. Zero missing i18n keys, zero horizontal
overflow anywhere.

Two things the plan didn't anticipate, both found by driving it:

- **`home:how.step2.body` named the English cast in prose** ("או ירח מסוים
  ואסטרונאוט"), the one place the homepage copy doesn't interpolate from
  `heroCopyNames`. It now points at the Hebrew cast. Worth knowing that the
  interpolation convention has exactly one hole in it.
- **Character-agnostic is a harder constraint in Hebrew than in English.**
  `hostActivityDemo.ts`'s transcripts must not name a character, and in Hebrew
  they must not guess a GENDER either, since the cast at pairing time could be
  גולדה talking to בן־גוריון. Unvocalized Hebrew spells second-person past
  identically for both genders ("ענית", "השתנית"), which is what those
  eighteen chatter lines and four seed transcripts are built on. The file
  header says so, because it is the constraint a translator breaks first.

---

## Notes for whoever runs these

- **`pnpm lint` was already failing on `main` before this work started** — four
  errors and one warning in `useActiveMatch.ts`, `useHostedActivityLookup.ts`,
  `JoinActivityPage.tsx`, and `useLobbyPresence.ts`, all pre-existing. Compare
  against the baseline rather than treating a red `lint` as your regression, and
  don't fix them inside a Hebrew prompt.
- **`docs/operations.md`'s CSS-hash refactor-verification technique is
  invalidated by design for this work** — the hash changes on purpose. A changed
  hash is not a regression here.
- **Send it to a real handset** once the student flow is Hebrew. iOS Safari has a
  history of caret mis-placement with `dir="ltr"` inputs inside `dir="rtl"`
  pages, which is exactly the join-code input's shape. If a device can't run it,
  log the ask in [`docs/pending-manual-tests.md`](../../pending-manual-tests.md).
- **The harness pins `locale: "en-US"`** on both `newContext` calls in
  [`tools/verify/lib.mjs`](../../../tools/verify/lib.mjs), because a bare URL now
  falls back to `navigator.language` and the English selectors would otherwise
  depend on the machine. Don't remove it. **Don't add `data-testid`s** — the
  English tree is fully driveable by its English text and always will be, and a
  Hebrew driver simply uses Hebrew strings.
- **Production is driven once per feature, not per prompt.** The trimmed pass
  (cold-wake, smoke, one network-sensitive leg) belongs after prompt 7, not after
  each one.
