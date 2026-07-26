# 06 — The queue counts who can actually pair

State: **Not started**

**The problem.** The waiting count — the poster-sized hero stat the whole
host page is built around — counts students the server won't pair. The
queue payload deliberately keeps disconnected seats
([`seats.ts:275-289`](../../../server/src/live/seats.ts) filters only
wrapping-up and matched), so `engine.waiting` includes students marked
`reconnecting`, and every count derived from it over-reports:

- the hero stat ([`HostHeader.tsx`](../../../client/src/components/Teacher/HostActivity/HostHeader.tsx),
  fed from [`index.tsx`](../../../client/src/components/Teacher/HostActivity/index.tsx)),
- the phone-width collapsed hint,
- the pairing panel's hold-notice counts and its
  `disabled={waiting.length < 2}` gate on **Pair everyone 1:1**
  ([`PairingPanel.tsx`](../../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)).

Server-side, `planPairEveryone` filters to _connected_ seats and
`match:pair-everyone` returns silently when fewer than 2 are eligible —
the comment admits it:
[`teacher.ts:151-155`](../../../server/src/live/handlers/teacher.ts)
(`if (!plan) return; // under 2 eligible — a visible no-op`). Net: with two
waiting students whose phones both went to sleep, the page says "2 waiting
to chat", **Pair everyone 1:1** is enabled, and tapping it does absolutely
nothing — no chat, no notice, no state change.

**Decisions in play.**

- "The waiting count is the hero stat, and it never leaves the screen"
  ([`teacher-live.md`](../../decisions/teacher-live.md)) — stays; what the
  number _means_ sharpens to "can pair right now". Amend the entry.
- "A dropped student keeps their seat for 2 minutes, marked and
  unmatchable" — stays; the queue keeps showing them (amber-tagged rows are
  correct and untouched). Only the _counts_ and the _CTA gate_ change.
- Doc [07](07-a-wifi-blip-keeps-your-tick.md) touches the adjacent
  selection-prune lines in `index.tsx` — either order; rebase.

- [ ] Prompt — Counts and CTAs follow the connected queue

---

## Prompt — Counts and CTAs follow the connected queue

**Goal:** every number and every pairing affordance on the host page agrees
with what the server would actually do; a sleeping class can't produce an
enabled button that does nothing.

1. In [`index.tsx`](../../../client/src/components/Teacher/HostActivity/index.tsx),
   derive `connectedWaiting = engine.waiting.filter(s => s.connection ===
"connected")` beside the existing `waiting` and thread it to every
   **count and gate**: the hero stat, the phone collapsed hint, and
   `PairingPanel`'s CTA enablement + hold-notice counts. The queue **list**
   keeps rendering all seats (amber rows included) — that's the recorded
   decision and it's right.
2. **Settled (founder, 2026-07-26): count + subline.** The hero stat shows
   the connected number, with a quiet "+M reconnecting" second line that
   appears only when M > 0 — honest about drops without the big number
   silently shrinking. One line of copy — humanizer pass.
3. **Pair everyone 1:1** disables below 2 connected; the section empty-state
   copy ("Pair two students in the queue…") should not invite a tap the
   gate refuses — check the empty-state variant that renders when everyone
   waiting is disconnected, and give it an honest line if needed.
4. Server: leave `match:pair-everyone`'s silent-null as the belt (the
   client gate now makes it unreachable for honest UIs — same pattern as
   the composer/pause belt). No wire change.
5. The demo engine simulates wifi blips ("A student's wifi blips" steering
   button) through the same dashboard — **demo parity is free**; verify the
   demo hero count dips while the pretend student is out.
6. Docs: amend the hero-stat decision entry
   ([`teacher-live.md`](../../decisions/teacher-live.md)) + DECISIONS.md line.

**Edge cases:** `Start their chat` already gates on connected selections
(the derived `validSelectedIds`, `index.tsx:89-93` — doc 07 adjusts which
ticks _persist_, not this gate). All-disconnected queue: hero shows 0 (+M
reconnecting), CTAs disabled, rows still listed — exactly the truth. The
pause anchor freezes wait clocks, not connection state — pausing changes
nothing here.

**Tests:** if the count derivation lands as a pure helper, a
`hostWorld`/lib test is cheap and in-policy; otherwise browser-verified.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass
(`verify:up --scale 10`, two students): drop both student contexts → hero
count falls to 0 with the "+2 reconnecting" subline, Pair everyone
disables; one returns → 1, still disabled; both back → 2, enabled, and
pairing works. Demo blip dips the demo count. `pnpm format`, one commit to
`main`, push, tick this box, flip doc + README state to Complete.
