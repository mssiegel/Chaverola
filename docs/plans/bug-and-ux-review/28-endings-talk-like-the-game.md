# 28 — Endings talk like the game

State: **Not started**

**The problem.** The product's endings copy is genuinely great — 🎬 "And…
scene!", "Nicely played! 👏", "Eyes up front! 👀" — but the single
most-read ending in the product breaks register and talks like an ops
dashboard. The activity-over card
([`ActivityGoneCard.tsx:28-35`](../../client/src/pages/student/join/ActivityGoneCard.tsx))
tells a 13-year-old:

> "Your class wrapped up, or **Chaverola's server restarted and cut the
> activity short.** If class is still going, ask your teacher for a fresh
> code."

Once doc [02](02-end-activity-ends-with-the-reveal.md) lands, this card is
the screen the **entire class** reads at the bell (after their reveal) —
it's the product's goodbye, and it leads with server infrastructure. A kid
reading "server restarted" concludes the app broke.

**Decisions in play.**

- "A wiped server ends the class honestly on the student's screen"
  ([`student-join.md`](../decisions/student-join.md)) — the honesty
  **stands** (that entry replaced misleading not-found copy, and rightly).
  Only the register changes: honest ≠ infrastructure vocabulary. The
  entry gets an amend-note, not a supersede.
- Doc [24](24-removal-lands-gently.md) owns the removal notice ("signed
  out") — **not this doc**. This doc owns the activity-over card plus a
  sweep for any other student-facing ops-voice strings (excluding 24's).
- The humanizer pass is mandatory here — this prompt is almost entirely
  copy.

- [ ] Prompt — Rewrite the goodbye

---

## Prompt — Rewrite the goodbye

**Goal:** the activity-over card reads like the game saying goodnight —
honest about both cases (class wrapped up; something cut it short) without
naming servers — and no other student-facing string talks infrastructure.

1. Rewrite [`ActivityGoneCard.tsx`](../../client/src/pages/student/join/ActivityGoneCard.tsx):
   keep both truths the current copy carries — (a) the normal case: class
   wrapped up, well played, see you next round; (b) the cut-short case:
   if class is still going, something interrupted the activity — ask your
   teacher for a fresh code. Lead with (a); keep (b) blame-free and
   server-free ("the activity got cut short" carries the same honesty as
   "the server restarted" without the ops vocabulary). Keep the "Enter a
   new code" CTA exactly as is. **Humanizer pass** on the final text.
2. Check the title too ("This activity is over") — fine to keep; if it
   changes, sweep [`usePageTitle`](../../client/src/lib/usePageTitle.ts)
   usages for the stage title.
3. **Sweep** the student-world strings for other ops-voice leaks (grep
   `client/src` for `server`, `signed out`, `connection` in user-facing
   strings): expected finds — the unreachable copy ("We can't reach
   Chaverola right now…" — acceptable, it's genuinely a network message;
   founder's call whether to warm it), and doc 24's removal notice (leave
   it — owned there). Fix only what's clearly ops-voice on a student
   screen; list what was left alone in the commit message.
4. **Demo parity:** the demo never shows the gone card (the demo activity
   can't die). Nothing to do; note it.
5. Docs: amend-note on the "ends the class honestly" entry
   ([`student-join.md`](../decisions/student-join.md)) + DECISIONS.md
   line ("Honest endings, game register — the goodbye names no servers").

**Edge cases:** the card renders from the session (the student may be
signed out already by the time they read it) — copy must work for a
student who joined mid-class and one who was there the whole time; avoid
assuming which ending they got first (with doc 02: reveal-then-this; a
lobby student: this directly).

**Tests:** none — copy.

**Done when:** `pnpm typecheck` green; browser glance at the card (end a
real local activity with a student in the lobby to summon it — or
temporarily hit the route with a dead code's latched state); humanizer
run recorded in the commit message. Decision amend-note + DECISIONS.md
line in this commit. `pnpm format`, one commit to `main`, push, tick
this box, flip doc + README state to Complete.
