# 05 — A sent message never just vanishes

State: **Complete**

**The problem.** Sending is fire-and-forget with no feedback of any kind. The
composer clears the box the instant Send is tapped
([`MessageComposer.tsx:128-141`](../../../client/src/components/chat/MessageComposer.tsx)),
the emit has no ack
([`useLobbyPresence.ts:404-406`](../../../client/src/pages/student/useLobbyPresence.ts)
— its own docblock: "the echoed `chat:line` is the delivery receipt"), and
every server-side rejection is a silent `return`
([`studentChat.ts:48-67`](../../../server/src/live/handlers/studentChat.ts)):

- the **10-messages-per-10s sliding window** (:56-58) — an excited kid firing
  one-word lines ("wait" / "no" / "lol") hits this in normal play; message 11
  is gone forever, and nothing anywhere says a limit exists;
- a send racing a **pause** (:63) or a **just-ended chat** (:64-65);
- an `appendLine` refusal (:66-67).

On classroom wifi even the happy path feels broken: the text vanishes from
the box and reappears only a round-trip later. The homepage demo echoes
instantly ([`useChatDemo.ts`](../../../client/src/components/chat/useChatDemo.ts)
appends locally), so the real product feels _worse_ than the demo.

**The design (no wire change).** The audit sketched a `clientTag` on
`chat:send`; authoring found a smaller path — everything here is client-side
plus one shared-constants move, so there is **no deploy race**:

- **Local echo:** append the line optimistically with a synthetic id
  (`pending-…`), rendered slightly muted. Reconcile when the echoed
  `chat:line` arrives: replace the oldest pending line whose `characterId`
  is self and whose text matches (the existing merge-by-id in
  [`liveMatchState.ts` `applyChatLine`](../../../client/src/pages/student/join/liveMatchState.ts)
  already dedupes server ids; pending replacement is a new branch beside it).
- **Failure surfacing:** a pending line with no echo after ~5s flips to a
  "didn't send — tap to retry" state instead of silently disappearing. A late
  echo after the flip reconciles it anyway.
- **Rate-limit honesty:** move `CHAT_SEND_WINDOW_MS` / `CHAT_SEND_WINDOW_LIMIT`
  from [`studentChat.ts:21-22`](../../../server/src/live/handlers/studentChat.ts)
  into [`shared/src/constants.ts`](../../../shared/src/constants.ts) so the
  composer can enforce the same window locally with friendly feedback
  _before_ the server silently drops — the server keeps its own check as the
  belt (same values, one source).

If pending-reconciliation proves fragile in practice, the fallback is the
`clientTag` echo (additive `chat:send` field the server reflects on the
sender's own `chat:line`) — a wire change with the full deploy-race drill;
don't reach for it first.

**Decisions in play.**

- "The server never inspects what students write"
  ([`chat-behavior.md`](../../decisions/chat-behavior.md)) notes in passing that
  every rejection is a silent no-op — that was a rationale for skipping a
  content filter, not a decision that sends need no feedback. This doc
  changes the client, not the server's silence.
- "Live socket timers never pass through `scaledMs`" — the 5s echo timeout is
  live-wire timing; hardcode real ms.
- Record the new behavior: entry atop
  [`chat-behavior.md`](../../decisions/chat-behavior.md) + DECISIONS.md line
  ("A sent message shows as pending until its echo, and says so if it never
  lands"), in whichever prompt finishes the visible behavior.

**Prompt order.** Independent; either first. Prompt 1 alone = instant local
echo with honest failure (the big win). Prompt 2 alone = pre-empted rate
limit with friendly copy.

- [x] Prompt 1 — Local echo with an honest failure state
- [x] Prompt 2 — The rate limit stops being a secret

---

## Prompt 1 — Local echo with an honest failure state

**Goal:** a student's message appears in the feed the moment they hit send,
marked subtly until the server confirms it; if the server never does, the
line says so and offers a retry — nothing ever just disappears.

1. **Reducers first** ([`liveMatchState.ts`](../../../client/src/pages/student/join/liveMatchState.ts)):
   extend the live match's message shape with an optional
   `delivery?: "pending" | "failed"` (absent = delivered; the shared wire
   types in `@chaverola/shared` are untouched — this is client state, so keep
   the field on the client-side message type, e.g. via a wrapper or an
   intersection type in [`stageTypes.ts`](../../../client/src/pages/student/join/stageTypes.ts)).
   Add pure helpers: `appendPendingLine`, `resolvePendingLine` (called from
   `applyChatLine` when the incoming line is self's — match oldest pending
   with equal text; fall through to today's append when nothing matches),
   and `failPendingLine(id)`. Chat-ended/paused states leave pending lines
   alone (the timeout will fail them honestly).
2. **Hook wiring** ([`useActiveMatch.ts`](../../../client/src/pages/student/join/useActiveMatch.ts)):
   `sendChatMessage` goes through a wrapper that appends the pending line,
   arms its ~5s timer (one per pending id; cleared on resolve/unmount), and
   emits. Retry = re-append as a fresh pending send. Respect the React
   Compiler rules (no refs written during render; timers in effects or
   event handlers).
3. **Render** ([`ConversationLines.tsx`](../../../client/src/components/chat/ConversationLines.tsx)):
   pending = reduced opacity; failed = the line plus a small "didn't send —
   tap to retry" affordance. This component is shared by the hero and the
   teacher cards — neither ever sets `delivery`, so nothing changes for
   them; keep the prop optional and the default path byte-identical.
4. **Composer:** no change to clear-on-send — the echo now appears instantly,
   which is the point.
5. **Copy** (the failed-line affordance, any tooltip): product voice, through
   the humanizer.
6. **Demo parity:** the demo already echoes locally with zero latency —
   pending never shows there. Nothing to do; note it.

**Edge cases:** identical texts back-to-back — oldest-first matching keeps
FIFO order; a dropped A followed by an accepted B with different text
resolves B and fails A (correct). Resume replay (`chat:started` backlog)
runs through `applyChatStarted`'s merge — pending lines survive it;
re-verify with a test. The 200-line cap trims oldest server lines, never
pending ones. Paused sends: the composer is disabled while paused, so
pending-during-pause only happens on the race — the timeout handles it.

**Tests:** yes — this is exactly the pure-reducer seam the client policy
tests ([`liveMatchState.test.ts`](../../../client/src/pages/student/join/liveMatchState.test.ts)):
append-pending → echo resolves oldest text match; echo with no pending
appends normally; fail flips state; resume replay keeps pending lines.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass
(`verify:up --scale 10`, two students, phone width): a send appears
instantly and un-mutes on echo; kill the server mid-chat and send → the line
flips to failed with retry; restart, retry delivers. `pnpm format`, one
commit to `main`, push, tick this box; add the decision entry if Prompt 2
already landed, and flip doc + README state to Complete.

---

## Prompt 2 — The rate limit stops being a secret

**Goal:** a student who out-types the send window gets a friendly local
"slow down" instead of a silently eaten message.

1. Move `CHAT_SEND_WINDOW_MS` / `CHAT_SEND_WINDOW_LIMIT` to
   [`shared/src/constants.ts`](../../../shared/src/constants.ts); import in
   [`studentChat.ts`](../../../server/src/live/handlers/studentChat.ts)
   (behavior unchanged). This touches `shared/` — a **compatible** change
   (constants only, no event shapes), so a single push is safe; still poll
   `/healthz` and confirm Vercel Ready per the standing deploy checks.
2. Client: track send timestamps beside the composer's send path (the same
   sliding window, same constants). When the next send would exceed the
   window, hold it locally: disable send briefly and show a small, friendly
   note in the composer area ("give it a sec" energy — humanizer pass) with
   the wait. Prefer holding-and-auto-sending the typed message over
   discarding it; never let it vanish.
3. Keep the server check untouched (the belt for hostile clients).
4. **Demo parity:** the demo has no rate limit and shouldn't grow one; note
   it.

**Edge cases:** clock skew between client and server windows — the client
window being equal-or-stricter means the server limiter should now never
fire for honest clients; if a send still slips through to a server drop,
Prompt 1's pending-timeout catches it. Multiple tabs share no state — each
tab's window is per-socket on the server anyway.

**Tests:** if the window logic lands as a pure helper in `client/src/lib/`,
one small test fits policy; UI behavior stays browser-verified.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass: hammer 11
quick sends — the 11th holds with the note and then delivers; server log
shows no drops. `pnpm format`, one commit to `main`, push, tick this box;
add the decision entry if Prompt 1 already landed, and flip doc + README
state to Complete.
