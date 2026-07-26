# 26 — Scrolling up means you get to read

State: **Not started**

**The problem.** The shared conversation feed hard-snaps to the bottom on
every new message/typing change
([`Conversation.tsx:54-57`](../../client/src/components/chat/Conversation.tsx))
and on every resize via a deliberately unconditional `ResizeObserver`
(:64-72 — its comment says "no 'was I at the bottom?' bookkeeping: chats
here are short"). Transcripts run to 200 lines
(`CHAT_TRANSCRIPT_MAX_LINES`), so they aren't short: a student scrolling up
to re-read what their partner said gets yanked to the bottom the moment
anyone types, a message lands, the keyboard opens/closes, or the phone
rotates.

**Where it ripples.** `Conversation` is a shared chat piece — the student
chatbox, the homepage hero, and the teacher's chat cards all render it. One
change, three surfaces, full cross-surface sweep (AGENTS.md → Shared chat
pieces).

**Decisions in play.** No decisions entry covers feed scrolling — the
"unconditional on purpose" note is an inline comment, not a recorded call.
Record the new rule when done: entry atop
[`chat-behavior.md`](../decisions/chat-behavior.md) + DECISIONS.md line
("The feed follows the newest line only when you're already at the bottom —
except your own send, which always snaps").

- [ ] Prompt — Stick to the bottom only from the bottom

---

## Prompt — Stick to the bottom only from the bottom

**Goal:** reading upward is stable — new lines and keyboard moves don't
yank the view; being at (or near) the bottom keeps today's behavior
exactly; sending your own message always returns you to the bottom.

1. In [`Conversation.tsx`](../../client/src/components/chat/Conversation.tsx),
   track "pinned to bottom" with a scroll listener on the feed (threshold
   ~48px — an intentional upward scroll unpins; sub-line jitter doesn't).
   Store it in a ref (render doesn't depend on it), per the React Compiler
   rules (no ref writes during render — update in the event handler).
2. Message/typing effect (:54-57): scroll only when pinned, **or** when the
   newest message is the viewer's own (`selfId` — the composer's send must
   always bring the student back down; the hero behaves the same way).
3. ResizeObserver (:64-72): re-pin only when pinned. The keyboard-shrink
   case that motivated it happens while the student is composing — which is
   the pinned case — so the original fix keeps working; keep the comment's
   history, updated.
4. **Settled (founder, 2026-07-26): add the chip.** While unpinned and new
   lines arrive below, float a quiet "New messages ↓" chip near the bottom
   of the feed; tapping it scrolls to the newest line and re-pins, and it
   clears on re-pin. Chip copy through the humanizer. The student chat is
   the surface that matters; the hero auto-follows (never unpinned in
   practice), and the teacher cards may skip the chip if it fights the
   card layout — note whichever call you make.
5. **Cross-surface sweep** (this is a shared piece): the student chat
   (phone + desktop), the homepage hero (its scripted lines must still
   auto-follow — the visitor never scrolls it mid-demo, so pinned stays
   true), and a teacher chat card (collapsed cards render 5 lines — verify
   the collapsed/expanded "Full chat" view still opens at the newest line).
6. **Demo parity:** the demo student chat uses the same component — covered
   by the sweep; nothing engine-side.

**Edge cases:** initial mount must start pinned (open-at-newest is today's
behavior everywhere). `behavior: "smooth"` on the message scroll +
instant on resize stays as-is. A feed shorter than its container is always
"pinned" (scrollTop 0 == bottom) — threshold math must treat
`scrollHeight <= clientHeight` as pinned. RTL isn't a factor (vertical
scroll only).

**Tests:** none — scroll-position behavior, no-DOM policy can't reach it;
the sweep is the verification.

**Done when:** `pnpm typecheck` green; browser pass at phone + desktop on
all three surfaces: scrolled-up student feed stays put while the partner
sends and while the keyboard toggles; the "New messages ↓" chip appears,
jumps to the newest line on tap, and clears; own send snaps down; hero
still follows its script; teacher card unaffected. Decision entry + DECISIONS.md
line in this commit. `pnpm format`, one commit to `main`, push, tick this
box, flip doc + README state to Complete.
