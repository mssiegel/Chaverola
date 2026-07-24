# Feature 22 — The transcript email reads like the app

**Status: DONE — closed 2026-07-24.** Both prompts shipped, each as one
commit to `main`. Prompt 1 keyed the teacher's character colors to roster
order (one color per character across every chat card), darkened light-mode
green/golden past the AA contrast bar, and moved the palette to
`shared/src/colors.ts`. Prompt 2 made the transcript email multipart: an
HTML part that reads like the app — roster-colored bold character names,
muted real names, hairlines, no backgrounds — with the plain-text body
riding along as the alternative, plus `pnpm preview:email` as the standing
design check. Decisions recorded in
[chat-behavior.md](../decisions/chat-behavior.md#character-name-colors) and
[teacher-live.md](../decisions/teacher-live.md#the-transcript-email-is-html-that-reads-like-the-app-with-plain-text-riding-along).

**Look at one:** the email a teacher gets when they end an activity is a wall of
gray monospace-ish text. Every line is
`(Ana Fallback) Herzl: Ana here — nobody is going to press End activity`, at the
same weight and the same color as every other line, with `──────────` between
chats. A teacher scanning fifteen pairings has nothing to track a character by,
and the real name — the thing they need least often — sits first and competes
with the character name for attention.

The app already solved this on screen. Character names are bold and colored from
the `--char-*` palette
([`ConversationLines.tsx:62-79`](../../client/src/components/chat/ConversationLines.tsx),
[`index.css:69-76`](../../client/src/index.css)), and the teacher's live grid
reads at a glance because of it. The email is the same content with all of that
thrown away: [`transcript.ts`](../../server/src/email/transcript.ts) composes a
plain-text body, [`mailer.ts:52`](../../server/src/email/mailer.ts) sends
`{ from, to, subject, text }`, and that's the whole surface.

Two things turned up while scoping this, and both changed the shape of the work:

**1. Colors aren't keyed to the character's roster number.**
[`characterColor.ts:33`](../../client/src/lib/characterColor.ts) assigns by order
of first appearance in the room, and
[`matchRules.ts:31`](../../shared/src/matchRules.ts) `dealCast` **shuffles** the
cast for every chat — so on the teacher's grid today, Herzl is green in one card
and golden in the next. Nobody noticed because a teacher reads one card at a
time; an email is fifteen cards stacked on one page, where it would read as
noise.

**2. Green and golden fail contrast on white.** `--char-1` `#1f9d55` is 3.5:1 and
`--char-2` `#b7791f` is 3.4:1 against white — under the 4.5:1 AA bar for normal
text. That's true on screen too, not just on paper; `--char-3` (5.2:1) and
`--char-4` (5.8:1) already pass, and the `.dark` variants
([`index.css:112-119`](../../client/src/index.css)) are bright on a dark card and
fine.

**Product calls (founder, 2026-07-24):**

- **The teacher's view is roster-ordered, in the email and on the live grid.**
  Character #1 on the setup roster is always green, #2 golden, #3 bluish, #4
  purplish — the same color in every chat of the activity. It's easier to scan
  fifteen chats when a name never changes color. **The student view is
  untouched:** "you are always green" stays exactly as decided in
  [`chat-behavior.md`](../decisions/chat-behavior.md) → "Character-name colors".
- **Darken green and golden once, in the app, and let the email read the same
  values.** `--char-1` → `#14804a` (5.0:1), `--char-2` → `#96690f` (4.9:1). One
  palette, so screen and email can't drift. Dark mode unchanged.
- **No background colors anywhere in the email.** A teacher may print it, and a
  page of colored blocks is a page of wasted ink. Color lands on character names
  only; everything else is near-black or gray.
- **The plain-text body stays**, as the multipart alternative — plain-text
  clients, screen readers, and the dev log all keep working, and the existing
  formatter tests keep passing.
- **Explicitly not doing:** `page-break-inside` print rules (printing is rare
  enough to revisit when a teacher actually asks), a date in the summary line
  (the server runs on UTC, so a late-evening class would be stamped tomorrow),
  and any `<style>`-block/Gmail-clipping cleverness (a real class is nowhere near
  the ~102KB limit — inline styles only, which survive more clients anyway).

**No wire, no new event, no student-facing change.** No
`docs/adding-a-wire-event.md` pass, no `projections.test.ts` allowlist pin. The
AGENTS.md status table stops at feature 10, so nothing to flip there. Prompt 1
touches `client/` and `shared/` (Vercel builds it); prompt 2 touches `server/`
and `shared/` (Render redeploys).

## How to use this document

Same rules as the features before it: each prompt is one agent session, ends
green (`pnpm typecheck` + `pnpm test` + its own browser/preview pass), gets **one
commit straight to `main`**, and is safe to push on its own. Run `pnpm format`
before committing, record decisions in [`DECISIONS.md`](../../DECISIONS.md) plus
the right file under [`docs/decisions/`](../decisions/), and run the humanizer
skill on new user-facing copy — the email body counts. The prompts are
sequential (2 imports the palette 1 adds), but 1 ships a visible improvement on
its own.

- [x] Prompt 1 — One palette, one color per character
- [x] Prompt 2 — The transcript email in HTML

---

## Prompt 1 — One palette, one color per character

**Goal:** on the teacher's live page, a character holds the same color in every
chat card, and the light-mode green and golden are legible. Students see no
change at all.

1. **`shared/src/colors.ts` (new)** — the palette's home, because prompt 2's
   server code needs it and CSS can't import TS:
   - `CHARACTER_COLOR_VARS` — the eight `--char-N` names, **moved** out of
     [`characterColor.ts:16`](../../client/src/lib/characterColor.ts). The client
     keeps emitting `var(--char-N)`, so theming is unaffected.
   - `CHARACTER_EMAIL_COLORS` — the same eight, as light-mode hexes, in the same
     order. An email has no CSS vars and no dark mode.
   - Export both from [`shared/src/index.ts`](../../shared/src/index.ts). Comment
     each list as mirroring `--char-*` in
     [`index.css`](../../client/src/index.css), and add the return pointer in the
     CSS. One test pins that the two arrays are the same length — that's the only
     drift a reader can't see.
2. **Darken the two, light mode only**
   ([`index.css:69-76`](../../client/src/index.css)): `--char-1` `#1f9d55` →
   `#14804a`, `--char-2` `#b7791f` → `#96690f`. `--char-3`…`--char-8` and the
   whole `.dark` block stay as they are. Update the comment above them — it
   currently just names the hues.
3. **`rosterCharacterColors(roster, participants)`** in
   [`characterColor.ts`](../../client/src/lib/characterColor.ts), beside
   `selfFirstCharacterColors` and in the same shape: seed the existing
   `assignCharacterColors` with the roster's ids first, then the participants'.
   The roster claims colors 1..N in order, and a character removed from the
   roster mid-activity (whose completed cards still render) picks up the next
   free color instead of colliding. Don't touch `assignCharacterColors` itself.
4. **`ChatCard` takes an optional roster.** Add `roster?: Character[]` to
   [`ChatCardProps`](../../client/src/components/Teacher/ChatCard/index.tsx) and
   use `rosterCharacterColors` when it's there, today's participant-order
   behavior when it isn't — the homepage demo card
   ([`TeacherViewSection.tsx:77`](../../client/src/components/home/TeacherViewSection.tsx))
   has no roster and doesn't need one. **Rewrite the comment at
   [`:65-66`](../../client/src/components/Teacher/ChatCard/index.tsx)**; it states
   the old rule.
5. **Pass it from both sections** —
   [`ChatsInProgressSection.tsx:148`](../../client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)
   and
   [`CompletedChatsSection.tsx:46`](../../client/src/components/Teacher/HostActivity/CompletedChatsSection.tsx):
   `roster={activity.characters}`. Both already hold `activity` for
   [`withCurrentCharacters`](../../client/src/lib/hostActivity.ts).
6. **Docs, inside this prompt.** Amend "Character-name colors" in
   [`chat-behavior.md:809`](../decisions/chat-behavior.md) (plus its
   [`DECISIONS.md`](../../DECISIONS.md) index line if the heading moves): the
   teacher's view is roster-ordered, the student's stays viewer-relative and
   self-first, and light-mode green and golden were darkened for contrast with
   the numbers. Nothing else changes.

**Edge cases:** a roster shorter than the room can't happen (`dealCast` deals
from the roster), but a character **removed** from the roster mid-activity can —
its completed cards must still render a color, which is what the seeding order in
step 3 buys. A roster longer than eight wraps, exactly as
`assignCharacterColors` already does. The demo host page at `/activity/host/1234`
runs through the same components with a roster, so it changes too — that's
correct, not a regression.

**Tests:** the length pin in step 1, plus keep
[`characterColor.test.ts`](../../client/src/lib/characterColor.test.ts) green
(the `var(--char-N)` strings it asserts don't change). One small case for
`rosterCharacterColors` — two chats with opposite cast order give the same
character the same color — is worth it; it's the rule the whole feature rests on.

**Done when:** `pnpm typecheck` + `pnpm test` green. Browser pass at
`/activity/host/1234?fast=10`: pair two chats and confirm a character holds one
color across both cards, in light **and** dark mode. Then a real host page with
three or more characters, same check. Glance at the student chatbox to confirm
"you" are still green and nothing else moved. `pnpm format`, one commit to
`main`, checkbox ticked.

---

## Prompt 2 — The transcript email in HTML

**Goal:** the teacher's transcript email looks like the app — bold, colored
character names, muted real names, clean rules between chats, no background
color anywhere — with the plain-text version still riding along for clients that
want it.

1. **`formatTranscriptEmail` returns `{ subject, text, html }`**
   ([`transcript.ts:69`](../../server/src/email/transcript.ts)). The existing
   `text` body stays as-is in wording; header lines added below get added to both
   so the two never disagree. Still pure, still no io.
2. **Escaping is load-bearing.** A local `escapeHtml` over every interpolated
   value — student message text above all, plus names, character labels, the host
   name and the scenario. Student text is untrusted input that has never been
   rendered as markup before; this is the one line in the feature that's a
   security bug if it's missed. Emoji ride through as UTF-8 exactly as today.
3. **One color map per email**, built before the blocks: roster ids first, then
   any character id seen across the chats, `index % 8` into
   `CHARACTER_EMAIL_COLORS` — the same seeding rule as prompt 1's
   `rosterCharacterColors`, so the email and the grid agree.
   [`resolveCharacter`](../../server/src/store/projections.ts) still resolves the
   label.
4. **The layout** — a 640px container, system font stack, near-black body text,
   `#6b7280` for muted, **inline styles only**, no images, and no `background` on
   any element:
   - The intro sentence, then `Hosted by …` / `Join code …`, then a summary line
     (`3 chats · 6 students` — students are the distinct studentIds across the
     chats), then the scenario in italic gray when one is set.
   - Each chat: a hairline `border-top`, a small uppercase gray `CHAT 1 OF 3`
     label in place of the `──────────` divider, the cast line (real name gray,
     character bold and colored), then the lines.
   - A line reproduces
     [`ConversationLines.tsx:62-79`](../../client/src/components/chat/ConversationLines.tsx):
     gray `(Ana Fallback)`, the character label bold in its color, `: `, then the
     escaped text.
   - `(No messages in this chat.)`, `(left partway)` and the
     `(Showing the most recent 200 messages.)` cap note all render as small gray
     text rather than full-weight body copy.
5. **Send it** — `EmailMessage` gains `html?: string`
   ([`mailer.ts:23`](../../server/src/email/mailer.ts)) and the gmail branch
   passes it to `sendMail`, which builds the multipart message itself.
   [`sendTranscript.ts:46-48`](../../server/src/email/sendTranscript.ts) threads
   it through; **the send-once guard is untouched**. Log mode keeps logging
   `text` only — HTML in the dev log would drown it, and step 6 is the better
   loop.
6. **`server/scripts/emailPreview.ts` (new)** — renders `formatTranscriptEmail`
   over a fixture class (a four-character chat, one with a member who left
   partway, one silent room), writes the HTML to a file and prints the path.
   Wired as `"preview:email": "tsx scripts/emailPreview.ts"` in
   [`server/package.json`](../../server/package.json) and surfaced at the root as
   `pnpm preview:email`. This is how the design gets checked without sending real
   mail, now and the next time anyone touches it.
7. **Humanizer pass** on the intro sentence, the summary line, and the
   empty-chat and cap notes.
8. **Docs, inside this prompt.** A short entry in
   [`teacher-live.md`](../decisions/teacher-live.md) plus its
   [`DECISIONS.md`](../../DECISIONS.md) index line: what the email looks like and
   why no background colors. Then fix the two places that say the body is plain
   text — [`backend-api.md:56`](../decisions/backend-api.md) and
   [`architecture.md:215`](../architecture.md).

**Edge cases:** a chat where nobody spoke, a member who left partway, a character
with no emoji ([`labels.ts`](../../shared/src/labels.ts) drops it), a chat at the
200-line cap, an activity with no scenario, and a character removed from the
roster after its chats ended — the existing tests cover the text side of each,
and the preview shows the HTML side. A student message containing `<`, `&` or a
full `<script>` tag must come out visible and inert.

**Tests:** two, added to
[`transcript.test.ts`](../../server/src/email/transcript.test.ts) — the html
escapes a message containing `<script>` and `&`, and a character keeps one color
across two chats whose casts are ordered differently. Everything else is checked
in the preview, per `DECISIONS.md` → "Testing stays small".

**Done when:** `pnpm typecheck` + `pnpm test` green. `pnpm preview:email`, open
the file: bold colored names, muted real names, hairlines, no background color
anywhere, one color per character across all three chats, and a print preview
that's readable. Then `pnpm verify:up` + `pnpm verify:smoke` — the smoke driver
runs an activity through the transcript, so the mailer path executes and the dev
log shows the text part composed. Last, if creds are handy, set `GMAIL_USER` /
`GMAIL_APP_PASSWORD`, end an activity with a real address and read it in Gmail on
web and phone — the only real proof the styling survives a mail client.
`pnpm format`, one commit to `main`, checkbox ticked.
