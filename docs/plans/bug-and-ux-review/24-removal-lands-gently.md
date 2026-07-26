# 24 — Removal lands gently

State: **Not started**

**The problem.** A student the teacher removes — possibly out of a _live
chat_ — is teleported straight to the name form, and on a phone the
keyboard immediately opens over the explanation:

- [`JoinActivityPage.tsx:150-154`](../../client/src/pages/student/JoinActivityPage.tsx):
  `onRemoved` runs `signOut(); setName(""); setRemovedByTeacher(true)`.
- [`JoinGateCard.tsx:177`](../../client/src/pages/student/join/JoinGateCard.tsx):
  `autoFocus={isDesktopViewport || name === ""}` — the name was just
  cleared, so the field autofocuses and the phone keyboard slides over the
  red notice the student most needs to read.
- The notice (:162-170): "Your teacher removed you from the activity, so
  you're signed out. Enter your name to join again." — "signed out" is
  account-speak in a product whose pitch is _no accounts_, and nothing
  acknowledges the conversation that just vanished mid-sentence. Every
  other ending in the flow gets a wrap-up screen (🎬 🎭 🎓 🔌 📶 👋 in
  [`ChatEndedSection.tsx`](../../client/src/components/Student/Chatbox/ChatEndedSection.tsx));
  removal is the one exit with none.

**Decisions in play.**

- "A removed student retypes their name — the field is not refilled"
  ([`student-join.md`](../decisions/student-join.md)) — **stands**; the
  blank field is deliberate (founder call). Only the focus grab and the
  copy change.
- "Student sign-in lives in the tab, and removal sends you to the name
  step" — stands; the landing place doesn't change, just how it lands.
- "Removing a student mid-chat is a quiet exit"
  ([`teacher-live.md`](../decisions/teacher-live.md)) — quiet for the
  _room_ (no group notice); it doesn't require the removed student's own
  screen to skip the explanation.
- Doc [28](28-endings-talk-like-the-game.md) rewrites the activity-over
  card; **this doc owns the removal notice** — no overlap.
- Record when done: amend-note on the retype entry + DECISIONS.md line
  ("Removal explains itself before it asks for a name").

- [ ] Prompt — Read first, type second

---

## Prompt — Read first, type second

**Goal:** a removed student gets a beat to understand what happened —
notice readable, keyboard down — and copy that sounds like the game, with
a mid-chat removal acknowledged; rejoining stays one tap away.

1. **Keyboard down:** in
   [`JoinGateCard.tsx`](../../client/src/pages/student/join/JoinGateCard.tsx),
   suppress the autofocus when the removal notice is showing (the
   `removedByTeacher` flag already reaches the card — use it in the
   `autoFocus` condition rather than `name === ""`). Desktop can keep
   focus (no keyboard overlay there) — simplest is to suppress on the
   same `isDesktopViewport` split the line already reads.
2. **Copy:** rewrite the notice in the product's voice, no "signed out".
   Two variants: from the lobby ("Your teacher took you out of the
   activity. Type your name if you're meant to jump back in." energy) and
   mid-chat — acknowledge the chat ended ("your chat closed" beat). The
   hook knows which: `onRemoved` fires with the match state still in reach
   in [`useActiveMatch.ts`](../../client/src/pages/student/join/useActiveMatch.ts)
   — pass a `wasInChat` boolean through to the page's `removedByTeacher`
   state (make it `false | "lobby" | "chat"` instead of a bare boolean).
   Copy through the **humanizer**.
3. **Considered and rejected (record it):** a full wrap-up screen for
   removal (a 7th `ChatEndedSection` reason). Rejected because removal's
   landing must stay the name step (recorded decision) and a second
   interstitial adds a tap between the student and rejoining — the
   teacher may be removing them precisely to have them rejoin cleanly.
   The richer notice on the gate is the whole fix. If the founder
   disagrees when this runs, that's a new decision entry.
4. **Demo parity:** removal isn't a student-demo event (the demo's
   steering panel has no remove; the teacher demo's remove acts on
   pretend students). Nothing to show; note it here — the notice itself
   is reachable in real flows only.

**Edge cases:** removal racing chat-end (teacher ends the chat, then
removes from the queue): `onRemoved` fires with no live match → lobby
variant — correct. A removed student who was mid-typing a message: the
match clears with the seat (existing hook behavior, untouched). The
notice must survive the gate's error slot without colliding with
`UNREACHABLE_COPY`/not-found states (they're mutually exclusive renders —
verify).

**Tests:** none — copy + a focus condition; browser-verified.

**Done when:** `pnpm typecheck` green; browser pass (`verify:up
--scale 10`, phone width): remove a student from the queue → notice
readable, no keyboard, lobby-variant copy; remove one mid-chat → chat
variant; tapping the field still works normally, and rejoining works.
Desktop glance. Decision amend-note + DECISIONS.md line in this commit.
`pnpm format`, one commit to `main`, push, tick this box, flip doc +
README state to Complete.
