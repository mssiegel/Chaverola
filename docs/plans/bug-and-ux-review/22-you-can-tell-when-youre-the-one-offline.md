# 22 — You can tell when you're the one offline

State: **Complete**

**The problem.** When a student's own connection drops mid-chat, everyone
else is told and they aren't. The server fires `chat:peer-connection` to the
partners (who get the amber countdown banner) and flips the teacher's "lost
connection" tag — but the dropped student's own chat looks completely
normal: header, transcript, composer all live. They type into a dead socket
(sends silently vanish — doc 05's pending state will at least surface that)
until, two minutes later, the screen jumps to "📶 You lost connection".

The lobby handles this exact case with an amber "Reconnecting you…" pill —
the chat, where it matters far more, has nothing:
[`JoinActivityPage.tsx:255+`](../../../client/src/pages/student/JoinActivityPage.tsx)
derives `lobbyConnection` from the presence hook and hands it **only** to
`WaitingLobby`; the `LiveChatStage` render (:315-343) gets `isPaused` but no
connection state, and
[`LiveChatStage.tsx:96-113`](../../../client/src/components/Student/LiveChatStage.tsx)
has no own-connection input at all. The banner slot already exists:
[`Conversation.tsx:90-101`](../../../client/src/components/chat/Conversation.tsx)
stacks `ChatPausedBanner` and `PeerReconnectBanner` in a sticky header.

**Decisions in play.**

- "Students see a partner's drop and return, on the teacher's own 4s gate"
  ([`chat-behavior.md`](../../decisions/chat-behavior.md)) built the _peer_
  half deliberately; no entry says the self half shouldn't exist.
- "A disconnected peer gets 2 minutes to come back, and the student watches
  the clock" — the self banner should NOT show a grace countdown (the
  student can't see the server's clock while offline, and a wrong number is
  worse than none); reconnecting copy only.
- The chatbox shell is **shared** (student, hero, teacher cards — one change
  ripples to all three). Keep the self state an **optional** addition that
  the other two surfaces never set.
- Record the decision when done: entry atop
  [`chat-behavior.md`](../../decisions/chat-behavior.md) + DECISIONS.md line
  ("Your own drop shows in the chat, without a countdown").

- [x] Prompt — The chat wears the lobby's reconnecting pill

---

## Prompt — The chat wears the lobby's reconnecting pill

**Goal:** within a few seconds of the socket dropping, the student's chat
shows a calm amber "Reconnecting you…" banner (and clears it on resume);
the composer stays usable for drafting but the student is never left
believing a dead room is live.

1. **Thread the state:** `presence` already lives in `useActiveMatch`'s
   return (via [`useLobbyPresence.ts`](../../../client/src/pages/student/useLobbyPresence.ts)
   — `"connected" | "reconnecting" | …`). In
   [`JoinActivityPage.tsx`](../../../client/src/pages/student/JoinActivityPage.tsx),
   pass a `selfConnection` (map presence → `"connected" | "reconnecting"`)
   into the `LiveChatStage` render (:315-343), demo default `"connected"`
   except step 4.
2. **Render it:** add the field to `ChatRoomState`
   ([`types/chat.ts`](../../../client/src/types/chat.ts)) as **optional**
   (absent = connected — hero and teacher cards never set it, so their
   behavior is byte-identical). In
   [`Conversation.tsx`](../../../client/src/components/chat/Conversation.tsx),
   render a self-reconnect banner in the existing sticky stack (:90-101).
   Reuse the lobby pill's visual language (amber, spinner — see
   [`WaitingLobby.tsx`](../../../client/src/components/Student/WaitingLobby.tsx))
   — likely a small shared piece or a variant of `PeerReconnectBanner`
   rather than a third bespoke banner; no countdown (see decisions note).
   Precedence when stacked: pause banner, then self-reconnect, then peer
   banner — self-reconnect suppresses the peer banner while active (you
   can't trust peer state through a dead socket).
3. **Composer stance — settled (founder, 2026-07-26): buffer and flush.**
   Don't disable the composer and don't block Send: socket.io queues sends
   and delivers them on reconnect — today's behavior, kept deliberately.
   The banner (plus doc 05's pending state, once landed) is the honesty
   layer. No soft-block.
4. **Demo parity:** the student demo already has a wifi-blip control wired
   to the LOBBY pill (`demoWifiBlip` via `useDemoLobby`,
   [`JoinActivityPage.tsx:204-205`](../../../client/src/pages/student/JoinActivityPage.tsx)).
   Wire the same blip into the chat stage's new `selfConnection` so the
   demo shows the banner — check whether the blip control renders during
   the demo chat stage; if it's lobby-only today, extend the demo controls
   ([`ChatDemoControls.tsx`](../../../client/src/components/demo/ChatDemoControls.tsx))
   with the blip event there.
5. **Copy:** short, calm, game-voiced ("Reconnecting you…" is already
   good); humanizer pass on anything new.

**Edge cases:** the 📶 self-timeout ending after the full grace is untouched
(feature 9's replay). A sub-second blip: socket.io's reconnect can beat the
banner — debounce showing it by ~1-2s so a blink doesn't flash amber.
StrictMode double-mount must not flash it on load (presence starts
`"connected"`). The banner must not cover the newest lines (it's sticky in
the scroll area — same geometry as the peer banner, already solved).

**Tests:** none beyond existing reducer tests — presence is socket-lifecycle
state, not a pure reducer; the no-DOM policy can't reach the banner.

**Done when:** `pnpm typecheck` green; browser pass (`verify:up --scale 10`,
two students): kill the dev server (or drop one student's context) → within
a couple of seconds the dropped student's chat shows the banner while the
partner sees the peer countdown; restart → banner clears on both. Phone
width. Demo blip shows the banner in the demo chat. Decision entry +
DECISIONS.md line in this commit. `pnpm format`, one commit to `main`,
push, tick this box, flip doc + README state to Complete.
