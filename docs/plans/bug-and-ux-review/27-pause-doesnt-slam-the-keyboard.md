# 27 — Pause doesn't slam the keyboard

State: **Not started**

**The problem.** When the teacher pauses the class while a student is
mid-word on a phone, the whole layout convulses in one frame. The chain,
each link verified:

1. Pause flips `isPaused`; the student chatbox passes
   `disabled={isPaused}` to the composer
   ([`Chatbox/index.tsx:200`](../../../client/src/components/Student/Chatbox/index.tsx)).
2. A focused `<textarea>` that becomes `disabled` is blurred by the
   browser; the phone keyboard closes.
3. The blur drops the `group-has-[textarea:focus]` state, so the world
   chrome un-collapses:
   [`StudentWorldLayout.tsx:56`](../../../client/src/components/layout/StudentWorldLayout.tsx)
   un-hides the corner pills, :74 swaps `pt-2` back to `pt-20`, and the
   demo banner reappears on demo flows — the card shifts ~80px under the
   student's thumb in the same frame the paused banner lands.

The draft text is preserved (good), but re-entering it costs a tap and the
jump reads as a glitch — during the exact moment the teacher wants calm.

**Decisions in play.**

- "While a student types on a phone, the world's chrome gets out of the
  way" ([`chat-behavior.md`](../../decisions/chat-behavior.md)) designed the
  collapse; the pause interaction wasn't considered.
- "Pause is one world-level switch: chats freeze, clocks hold" — pausing
  must still genuinely block sending; the server refuses paused sends
  anyway ([`studentChat.ts:63`](../../../server/src/live/handlers/studentChat.ts)),
  so the composer is UX, not the enforcement.
- Record when done: entry atop
  [`chat-behavior.md`](../../decisions/chat-behavior.md) + DECISIONS.md line
  ("A pause locks the composer without stealing focus or the keyboard").

- [ ] Prompt — Lock the composer without blurring it

---

## Prompt — Lock the composer without blurring it

**Goal:** pause blocks typing and sending but keeps focus, the keyboard,
and the layout exactly where they were; resume hands the student straight
back to their draft.

1. In [`MessageComposer.tsx`](../../../client/src/components/chat/MessageComposer.tsx),
   split the `disabled` prop's meaning: keep `disabled` for terminal states
   (chat ended — where dropping focus is correct) and add a `locked` mode
   for pause. **Design (settled by the founder's no-handset call,
   2026-07-26): the locked textarea stays fully enabled** — no `disabled`,
   no `readOnly`, so no browser on any platform can force a blur. The lock
   lives in behavior: `handleSend` refuses while locked (extend the
   `disabled` guard at :130), the send button disables visually with
   `aria-disabled`, the composer takes the dimmed/paused styling, and
   `onTyping` gets an explicit `!locked` gate — the free suppression
   `disabled` gave is gone since change events still fire on an enabled
   field (the server dropping paused heartbeats stays the belt). The
   paused placeholder swap ("Paused. Hang tight…") only shows when the box
   is empty — with a draft, the draft stays visible and editable; editing
   during a pause is drafting, which is fine — they just can't send.
2. [`Chatbox/index.tsx:200`](../../../client/src/components/Student/Chatbox/index.tsx)
   passes the new mode for `isPaused`; the ended path keeps `disabled`.
3. Check the emoji picker while locked: the smile button should disable
   with the composer (it already hides on phones —
   `pointer-coarse:hidden` — so this is desktop-only polish).
4. **Handset check (📱, pre-routed):** founder call 2026-07-26 — no
   device will be available when this runs, which is exactly why step 1
   avoids `readOnly` (whose iOS keyboard behavior only a handset can
   answer). Record the ask in
   [`docs/pending-manual-tests.md`](../../pending-manual-tests.md) as part
   of this prompt: on a real iPhone, pause mid-word → keyboard stays up,
   no layout jump, draft still editable, send refused; resume → typing
   continues without re-tapping.
5. **Demo parity:** the demo teacher's "Pause all chats" drives the same
   student component through the demo engines — verify the demo student
   chat behaves identically (`/activity/join/1234?fast=10` while the demo
   host pauses; the shared component makes this free, just confirm).

**Edge cases:** pause landing exactly at send-tap — the server refuses the
racing send silently; doc 05's pending state (if landed) marks it, and
resume lets retry work. Resume while the student left the field: nothing
to restore — only never _steal_ focus. Desktop is unaffected by the
chrome-collapse chain (it's `max-sm`) but gets the same no-blur lock.

**Tests:** none — focus/keyboard behavior; browser + handset verify.

**Done when:** `pnpm typecheck` green; browser pass (`verify:up --scale
10`, phone width): with a draft mid-word, teacher pauses → banner appears,
keyboard stays, layout doesn't jump, send is refused; resume → typing
continues without re-tapping. Demo pass per step 5. Handset ask logged in
[`docs/pending-manual-tests.md`](../../pending-manual-tests.md). Decision
entry + DECISIONS.md line in this commit. `pnpm format`,
one commit to `main`, push, tick this box, flip doc + README state to
Complete.
