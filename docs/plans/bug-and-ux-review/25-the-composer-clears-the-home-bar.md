# 25 — The composer clears the home bar

State: **Not started**

**The problem.** The student world reserves no safe-area insets, so on
notched/home-indicator iPhones the send button — the most-tapped control in
the product — sits in the home-indicator strip, hard to hit and competing
with the system swipe. The evidence:

- `env(safe-area-inset-*)` appears exactly **once** in the client, on the
  teacher's setup dock
  ([`ActivitySetup/index.tsx:252`](../../client/src/components/Teacher/ActivitySetup/index.tsx))
  — that's the in-repo pattern to follow.
- The student world's column ends at `pb-2 sm:pb-8`
  ([`StudentWorldLayout.tsx:74`](../../client/src/components/layout/StudentWorldLayout.tsx)),
  and the phone chat stretches flush to the bottom
  ([`LiveChatStage.tsx:186`](../../client/src/components/Student/LiveChatStage.tsx))
  with the composer as the last thing in the document.
- **The insets are currently guaranteed to be zero anyway:** the viewport
  meta ([`client/index.html:9-12`](../../client/index.html)) has no
  `viewport-fit=cover`, and without it iOS reports every
  `safe-area-inset-*` as 0. Any fix starts there.

**Decisions in play.**

- "On phones the chat fills the screen and hugs the keyboard; desktop
  keeps the fixed card" ([`chat-behavior.md`](../decisions/chat-behavior.md))
  — stands; it deliberately rejected `visualViewport` JS and named an
  iPhone gap as the known follow-up. **This doc is only the safe-area
  slice of that gap** — insets, not keyboard mechanics.
- "Send real features to a real phone" (AGENTS.md) — this change is
  _about_ device chrome. **Founder call (2026-07-26): no handset will be
  available when this runs** — recording the ask in
  [`docs/pending-manual-tests.md`](../pending-manual-tests.md) is part of
  the prompt itself, not a fallback; the check runs later from that file.

- [ ] Prompt — viewport-fit=cover plus insets where the world touches the edges

---

## Prompt — viewport-fit=cover plus insets where the world touches the edges

**Goal:** on a home-indicator iPhone, the composer (keyboard closed) sits
clear of the indicator strip; the top corner pills clear the notch; and
nothing changes on devices without insets (env() falls back to 0).

1. Add `viewport-fit=cover` to the viewport meta in
   [`client/index.html`](../../client/index.html) (append to the existing
   content — keep `interactive-widget=resizes-content` and its comment).
   Note: with `cover`, the page extends under the chrome — the inset
   paddings below are what keep content out of it; land them in the same
   commit.
2. Bottom: in
   [`StudentWorldLayout.tsx`](../../client/src/components/layout/StudentWorldLayout.tsx),
   the column's `pb-2` becomes a computed pad —
   `pb-[max(0.5rem,env(safe-area-inset-bottom))]` (Tailwind arbitrary
   value; the setup dock's idiom). The chat card's composer inherits the
   clearance from the column; verify the `-mx-2` stretched card doesn't
   bypass it.
3. Top: the fixed corner bar (:56, `top-0 … pt-4`) gets
   `pt-[max(1rem,env(safe-area-inset-top))]`; check the `pt-20` /
   `pt-2` collapse pair (:74) still lines up under it.
4. Keyboard interplay: when the keyboard is up, the OS hides the home
   indicator area — the inset pad must not double-space the composer.
   `env(safe-area-inset-bottom)` reads 0 with the keyboard open on iOS in
   practice, but **that's a handset question — fold it into the logged
   ask** — and if it turns out not to, scope the pad with the existing
   `group-has-[textarea:focus]` collapse the layout already uses.
5. Sweep the other student-world screens at phone width (join gate,
   lobby, ended, gone cards) — they share the layout, so the column pad
   covers them; just look.
6. Landscape left/right insets: add `env(safe-area-inset-left/right)` to
   the world's horizontal padding only if it's a one-liner; landscape
   phones are not a primary surface — note whichever call you make.
7. **Demo parity:** same components — free; the demo student flow is a
   fine handset test surface (`/activity/join/1234` needs no server).

**Edge cases:** Android gesture-nav insets ride the same `env()` vars where
the browser reports them — the `max()` floor keeps today's spacing
otherwise. Desktop unaffected (`env()` = 0). `viewport-fit=cover` affects
every route, including the navbar'd teacher pages — glance at the navbar
and the setup dock (which already pads) on the handset too.

**Tests:** none — device chrome; the handset IS the verification.

**Done when:** `pnpm typecheck` green; browser pass at phone width for
regressions (insets are 0 there — everything must look identical); the
handset ask recorded in
[`docs/pending-manual-tests.md`](../pending-manual-tests.md) with these
exact checks (founder, 2026-07-26 — the logged ask IS this prompt's
handset leg): composer clear of the home-indicator strip with keyboard
closed, no double-gap with it open, corner pills clear of the notch,
teacher setup dock still right. `pnpm format`, one commit to `main`,
push, tick this box, flip doc + README state to Complete.
