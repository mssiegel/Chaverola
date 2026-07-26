# 24 — Removal lands gently

State: **Not started**

**The problem.** A student the teacher removes — possibly out of a _live
chat_ — is teleported straight to the name form, and on a phone the
keyboard immediately opens over the explanation:

- [`JoinActivityPage.tsx:150-154`](../../../client/src/pages/student/JoinActivityPage.tsx):
  `onRemoved` runs `signOut(); setName(""); setRemovedByTeacher(true)`.
- [`JoinGateCard.tsx:177`](../../../client/src/pages/student/join/JoinGateCard.tsx):
  `autoFocus={isDesktopViewport || name === ""}` — the name was just
  cleared, so the field autofocuses and the phone keyboard slides over the
  red notice the student most needs to read.
- The notice (:162-170): "Your teacher removed you from the activity, so
  you're signed out. Enter your name to join again." — "signed out" is
  account-speak in a product whose pitch is _no accounts_, and nothing
  acknowledges the conversation that just vanished mid-sentence. Every
  other ending in the flow gets a wrap-up screen (🎬 🎭 🎓 🔌 📶 👋 in
  [`ChatEndedSection.tsx`](../../../client/src/components/Student/Chatbox/ChatEndedSection.tsx));
  removal is the one exit with none.

**The founder's call (2026-07-26): a mid-chat removal gets a full wrap-up
screen first.** The doc originally proposed only a richer notice on the
name step; the founder chose the wrap-up screen — removal from a chat
becomes a real ending (like the other six), and the name step follows on a
tap. A student removed from the **lobby** (no chat to wrap up) still lands
directly on the name step with the warmer notice.

**Decisions in play.**

- "Student sign-in lives in the tab, and removal sends you to the name
  step" ([`student-join.md`](../../decisions/student-join.md)) — **amended by
  the founder call above**: the name step stays the destination, but a
  mid-chat removal shows its ending screen on the way. Prompt 2 records
  the amendment.
- "A removed student retypes their name — the field is not refilled"
  ([`student-join.md`](../../decisions/student-join.md)) — **stands**; the
  blank field is deliberate (founder call).
- "Removing a student mid-chat is a quiet exit"
  ([`teacher-live.md`](../../decisions/teacher-live.md)) — quiet for the
  _room_ (no group notice, partner handling unchanged); the removed
  student's own screen getting an ending doesn't touch it.
- "The live name reveal fires at chat-end, per the teacher's setting" —
  removal is **not** a reveal moment: the server sends no reveal for a
  removal, and the wrap-up screen must not invent one.
- Doc [28](28-endings-talk-like-the-game.md) rewrites the activity-over
  card; **this doc owns the removal notice and the removal ending** — no
  overlap.

**Prompt order.** Independent, either first. Prompt 1 is the small one
(gate copy + keyboard); Prompt 2 adds the wrap-up screen for the mid-chat
case. If Prompt 2 lands first, the gate notice it hands off to is still
today's — fine; Prompt 1 warms it.

- [ ] Prompt 1 — The gate lands gently
- [ ] Prompt 2 — A mid-chat removal is an ending, not a teleport

---

## Prompt 1 — The gate lands gently

**Goal:** whatever preceded it, the name-step landing after a removal is
readable — keyboard down, copy in the product's voice — and rejoining
stays one tap away.

1. **Keyboard down:** in
   [`JoinGateCard.tsx`](../../../client/src/pages/student/join/JoinGateCard.tsx),
   suppress the autofocus when the removal notice is showing (the
   `removedByTeacher` flag already reaches the card — use it in the
   `autoFocus` condition rather than `name === ""`). Desktop can keep
   focus (no keyboard overlay there) — simplest is to suppress on the
   same `isDesktopViewport` split the line already reads.
2. **Copy:** rewrite the notice in the product's voice, no "signed out".
   Keep it working for both arrival paths: directly from the lobby, and
   (once Prompt 2 ships) after the wrap-up screen's tap — the
   post-wrap-up variant can be shorter, since the ending screen already
   explained the chat. Copy through the **humanizer**.
3. **Demo parity:** removal isn't a student-demo event (the demo's
   steering panel has no remove; the teacher demo's remove acts on
   pretend students). Nothing to show; note it here.
4. Decision: amend-note on "A removed student retypes their name" (notice
   and focus behavior) + DECISIONS.md line.

**Edge cases:** the notice must not collide with the gate's other error
renders (`UNREACHABLE_COPY`, not-found) — they're mutually exclusive
states; verify. Tapping the field still focuses and types normally.

**Tests:** none — copy + a focus condition; browser-verified.

**Done when:** `pnpm typecheck` green; browser pass (`verify:up
--scale 10`, phone width): remove a student from the queue → notice
readable, no keyboard popping over it, warm copy; rejoining works.
Desktop glance. Decision amend-note + DECISIONS.md line in this commit.
`pnpm format`, one commit to `main`, push, tick this box; if Prompt 2
already landed, flip doc + README state to Complete.

---

## Prompt 2 — A mid-chat removal is an ending, not a teleport

**Goal:** a student pulled out of a live chat sees their chat close like
any other ending — greyed room, a clear "your teacher took you out of
this one" wrap-up, no reveal — and one tap lands them on the name step.

1. **Route the removal:** in
   [`useActiveMatch.ts`](../../../client/src/pages/student/join/useActiveMatch.ts)
   / [`JoinActivityPage.tsx`](../../../client/src/pages/student/JoinActivityPage.tsx),
   when the removal event arrives **while a live match is on screen**,
   don't run the instant `signOut()` path — set the chat-ended state with
   a client-local end reason (`"removed"`) so the ended stage renders,
   and defer the sign-out to the ending screen's CTA. A lobby removal
   (no match) keeps today's immediate path to the gate (which Prompt 1
   warms). Mind the ref/latch patterns around `chatEnded` and the stage
   machine — the ended screen must survive the socket teardown that
   follows removal, exactly like doc
   [02](02-end-activity-ends-with-the-reveal.md) prompt 2's screen (the
   presence hook already treats `removed` as terminal — no reconnect
   flashes).
2. **The screen:** a seventh reason in
   [`ChatEndedSection.tsx`](../../../client/src/components/Student/Chatbox/ChatEndedSection.tsx)
   — tile/title/body in the family's voice ("Your teacher took you out
   of this one" energy; 🚪 or similar tile; **no reveal block ever**, the
   server sends none for removal and the screen must not imply one). CTA
   label points at the name step, not the lobby ("Back to the name
   step" / better — humanizer). The CTA runs the deferred
   `signOut(); setName(""); setRemovedByTeacher(true)` so the gate shows
   Prompt 1's (shorter) notice.
3. **Wire check:** no server change expected — the removal event the
   client already receives is the trigger; the chat's server-side end for
   the partner is untouched ("quiet exit" stands). Verify the removed
   student's event actually arrives before the socket drops in the
   mid-chat case (trace it live; if removal reaches the client only as a
   disconnect, surface that finding and stop — that would need a small
   server ordering fix, its own decision).
4. **Demo parity:** not a demo event — note and move on.
5. Decision entry: the amendment described at the top of this doc
   ([`student-join.md`](../../decisions/student-join.md)) + DECISIONS.md
   line ("A mid-chat removal ends like a chat, then lands on the name
   step").

**Edge cases:** removal racing a chat end (teacher ends the chat, then
removes): `chatEnded` is already set with the real reason — the removal
should NOT overwrite the reason; it just means the CTA's destination is
the gate (the seat is gone). Removal racing the reveal: reveal came from
`chat:ended` before the removal — keep whatever was on screen; the CTA
still exits to the gate. Back-guard: the ended screen disarms it
(`useBackGuard(!isEnded…)`) — unchanged.

**Tests:** if the removal routing lands in the pure reducers
([`liveMatchState.ts`](../../../client/src/pages/student/join/liveMatchState.ts)),
add the case beside the others — in policy. Component rendering stays
browser-verified.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass
(`verify:up --scale 10`, phone width): remove a student mid-chat → they
get the removal ending (no reveal), partner's screen behaves as today,
teacher's card as today; tap → name step with the notice; rejoin works.
Remove from the lobby → straight to the gate. Decision entry +
DECISIONS.md line in this commit. `pnpm format`, one commit to `main`,
push, tick this box; if Prompt 1 already landed, flip doc + README state
to Complete.
