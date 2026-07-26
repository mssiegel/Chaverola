# 07 — A wifi blip keeps your tick

State: **Not started**

**The problem.** The teacher taps two names to pair them, glances up to
quiet the room, and one of the phones sleeps for a second. That student's
tick is gone — permanently and silently. In
[`index.tsx:89-102`](../../client/src/components/Teacher/HostActivity/index.tsx),
`validSelectedIds` filters the selection to
`s.connection === "connected"`, and lines 100-102 **write the filtered list
back into state** ("Falling out is permanent"). A student who passes
through `reconnecting` — the single most common event on classroom phones —
and comes right back has lost their selection for good. Nothing on screen
says why "Start their chat" went disabled or why the round started with the
wrong pair.

The permanence exists for a good reason that doesn't require this: a
student who _left the queue_ (matched away, removed, seat gone) must lose
their tick, or ending their chat would land them back in the queue still
selected from the round before. That reason covers absence from the queue —
not a transient connection state of a row still sitting in it.

**Decisions in play.**

- "A dropped student keeps their seat for 2 minutes, **marked and
  unmatchable**" ([`teacher-live.md`](../decisions/teacher-live.md)) —
  stays fully: while `reconnecting`, the row is dimmed/disabled
  ([`PairingPanel.tsx`](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx))
  and "Start their chat" must not fire with them in the group. The change
  is only that the **tick survives** the blip.
- The cast-cap prune (`slice(0, maxGroupSize)`, founder call 2026-07-26 in
  the code comment) — stays.
- Doc [06](06-the-queue-counts-who-can-actually-pair.md) touches adjacent
  lines — either order; rebase.
- Record when done: entry atop
  [`teacher-live.md`](../decisions/teacher-live.md) + DECISIONS.md line
  ("A selection survives a reconnect; only leaving the queue clears it").

- [ ] Prompt — Prune on absence, gate on connection

---

## Prompt — Prune on absence, gate on connection

**Goal:** a tick clears only when the student actually leaves the queue (or
the cast shrinks); a reconnecting student keeps theirs — visibly parked —
and everything gates exactly as safely as today.

1. In [`index.tsx`](../../client/src/components/Teacher/HostActivity/index.tsx),
   split the derivation:
   - `presentSelectedIds` — selected ids still in `engine.waiting` at all,
     capped by `maxGroupSize` (the state-prune baseline: :100-102 writes
     THIS back, keeping the round-trip protection the comment describes);
   - `actionableSelectedIds` — the connected subset (what `Start their
chat` counts, what `startSelectedChat` sends, what the rematch-warning
     derivation uses — today's `validSelectedIds` semantics).
2. `toggleSelect` (:104-112) operates on `presentSelectedIds` so tapping a
   dimmed-but-ticked row untoggles it cleanly; adding while at the cap
   still refuses.
3. [`PairingPanel.tsx`](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx):
   a `reconnecting` row that is ticked renders tick + amber tag together
   (today a ticked row can't be reconnecting, so verify the combined visual
   doesn't collide — `aria-pressed` stays true, the button stays disabled).
   If the Start button's count would read confusingly ("Start their chat"
   with 2 ticked / 1 actionable), show the honest state — small copy,
   founder's voice, humanizer if new text is added.
4. Re-check the rematch-warning lookup (:123-126) — it indexes
   `engine.waiting` by the derived ids; keep it on the actionable set so
   the non-null assertion stays sound.
5. **Demo parity:** the demo's wifi-blip steering event exercises exactly
   this — tick a pretend student, blip them, watch the tick survive and
   the row dim, then re-enable on return. Free; verify.

**Edge cases:** a reconnecting student whose grace expires leaves the queue
→ the absence prune clears the tick (correct, and the round-trip
protection holds). A student who was ticked, matched by auto-match, and
freed later: absent during the chat → pruned — unchanged. React Compiler:
the render-time `setSelectedIds` convergence pattern (:98-101) stays
length-guarded against the new baseline; keep the guard exact or it loops.

**Tests:** the derivation is inside a component today; if it extracts
naturally into a pure helper (`lib/` or beside `hostEngine`), one test is
in-policy — don't force the extraction just for a test.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass
(`verify:up --scale 10`, two students): tick both, drop one context —
tick stays, row dims, Start disables; student returns — Start re-enables
with the same ticks and starts the right chat; remove a ticked student —
tick clears. Demo blip pass per step 5. Decision entry + DECISIONS.md line
in this commit. `pnpm format`, one commit to `main`, push, tick this box,
flip doc + README state to Complete.
