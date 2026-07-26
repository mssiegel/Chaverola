# 31 — The host page stops re-downloading the class

State: **Not started**

**The problem.** Every seat-level event re-sends the teacher **every
message of every chat that has ever existed** in the activity:

- [`lobbyContext.ts:131-166`](../../../server/src/live/lobbyContext.ts) —
  `chatsPayload` maps ALL `record.chats` (active _and_ ended; chats never
  expire from the record) through `toChatSnapshot`, whose projection
  includes the full `messages` array
  ([`projections.ts`](../../../server/src/store/projections.ts),
  `toChatSnapshot`). `broadcastState` emits it on every student connect,
  disconnect tick, `lobby:leave`, `chat:leave`, **every "Back to the
  lobby" tap**, grace expiry, and every teacher command.
- Client-side,
  [`useHostActivityLive.ts:187-202`](../../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
  replaces the whole `chats` state array on each snapshot.

In a 30-student class doing 3-4 rounds, that's 45-60 accumulated chats ×
up to 200 lines each — order of 100 KB+ per broadcast — and at the end of
each round ~30 students tap "Back to the lobby" within seconds, each tap
re-shipping the entire class history to one laptop on school wifi and
rebuilding every card's state. The dashboard gets laggier the deeper into
the lesson — exactly backwards.

**The design.** Keep snapshots-over-deltas (the recorded rationale — "a
missed emit can never wedge a card" — is right); stop carrying **ended**
chats' transcripts on seat-level broadcasts. Ended transcripts are
immutable; the teacher already has them. Seat-triggered snapshots send
ended chats with `messages` omitted; full snapshots (teacher connect, and
any chat-status transition) keep carrying everything, so a missed slim
emit still heals at the next full one.

**Deploy order is load-bearing (the deploy race, AGENTS.md → Working
Rules):** an old client receiving a slim snapshot would blank its ended
cards. Prompt 1 (client tolerates absent `messages`) must be **deployed
and confirmed on Vercel** before Prompt 2 (server sends slim) pushes.
Client-ahead is harmless in the other direction.

**Decisions in play.**

- "Message lines are the one delta on the teacher wire"
  ([`teacher-live.md`](../../decisions/teacher-live.md)) — untouched; live
  chats keep their full snapshot + `chat:transcript-line` delta behavior.
- "The homepage's 'full transcript' claim stands: the 200-line cap is per
  chat" — untouched; nothing here drops stored lines.
- Record when done: entry atop
  [`teacher-live.md`](../../decisions/teacher-live.md) + DECISIONS.md line
  ("Seat events stop re-shipping ended transcripts; full snapshots heal").

- [ ] Prompt 1 — The client keeps what it knows
- [ ] Prompt 2 — The server stops repeating itself

---

## Prompt 1 — The client keeps what it knows

**Goal:** the host page treats a chat snapshot whose `messages` is absent
as "unchanged transcript" — merging instead of replacing — while today's
always-full server keeps working byte-identically.

1. In [`shared/src/socket.ts`](../../../shared/src/socket.ts), make the chat
   snapshot's `messages` optional (`messages?: …`) with a comment naming
   the contract: absent = "no change since your last full snapshot; ended
   transcript held client-side". This is a **compatible loosening** — the
   server still always sends it until Prompt 2.
2. In [`useHostActivityLive.ts`](../../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
   (:187-202), replace the wholesale `setChats(payload.chats…)` with a
   merge: for each incoming chat, if `messages` is present use it; if
   absent, keep the previous state's messages for that chat id (empty
   array if genuinely never seen — a race the next full snapshot heals).
   Keep every other field from the incoming snapshot (status, pause,
   reconnecting ids — those must stay live).
3. Check [`useHostActivityDemo.ts`](../../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)
   / [`hostWorld.ts`](../../../client/src/components/Teacher/HostActivity/hostWorld.ts)
   compile against the loosened type (the demo always has messages — no
   behavior change; the live engine imports only types from hostWorld,
   invariant untouched).
4. This touches `shared/` → one push, both pipelines deploy, behavior
   identical on both sides; poll `/healthz` + confirm Vercel **Ready**
   (not canceled) for the SHA — Prompt 2 depends on this build being
   live.

**Edge cases:** a second host device connecting mid-class gets the full
connect snapshot before any slim one (connect flow emits directly) — but
don't rely on ordering: the never-seen-chat branch must render an empty
transcript without crashing, and the next full snapshot fills it. The
merge must not resurrect chats the payload no longer contains (removal
follows the payload's id set, as today).

**Tests:** if the merge extracts as a pure helper (payload + prev →
next), one client test is in-policy and cheap — do that extraction; this
is exactly the kind of logic the deliberately-small suite exists for.

**Done when:** `pnpm typecheck` + `pnpm test` green; `verify:smoke`
passes; a manual host-page session shows identical behavior to today
(server unchanged). Push, `/healthz` + Vercel Ready confirmed. `pnpm
format`, one commit to `main`, tick this box.

---

## Prompt 2 — The server stops repeating itself

**Goal:** seat-level broadcasts shrink to active-chat transcripts plus
ended-chat headers; chat-status transitions and teacher connects still
carry everything; the teacher's dashboard stays byte-identical to the eye.

**Precondition: Prompt 1 is deployed to production (Vercel Ready).** If it
isn't, stop and run it first.

1. In [`lobbyContext.ts`](../../../server/src/live/lobbyContext.ts), give
   `chatsPayload`/`broadcastState` a mode: **full** (default) vs **slim**
   (ended chats projected without `messages` — add the variant in
   [`projections.ts`](../../../server/src/store/projections.ts) as an
   explicit field-by-field literal, never a spread; extend the
   projection-privacy allowlist tests for the new shape).
2. Classify call sites: seat lifecycle (connect/resume, disconnect ticks,
   grace expiry, `lobby:leave`, `lobby:back`, `chat:leave` where no chat
   ends) → **slim**. Anything that changes a chat's status or lines
   (chat start, end, end-all, pause/resume, removal that ends a chat,
   teacher commands) and the teacher-connect snapshot → **full**. When in
   doubt, full — slim is an optimization, not a correctness rule.
3. Keep the wedge-proof property stated in the code comment: any slim
   emit's staleness heals at the next full snapshot; update the
   `broadcastState` docblock to name the new rule.
4. Decision entry + DECISIONS.md line (see top). `docs/api.md`: update the
   `chats:snapshot` payload description (optional `messages` and when).

**Edge cases:** the 200-line cap trims **active** chats — active chats
always ship full in every mode, so the cap's behavior is unchanged. The
transcript email reads the store, not the wire — unaffected. Demo: zero
network by construction — unaffected.

**Tests:** extend the projection allowlist test for the slim variant
(mandatory — it's a projection change). The server suite's existing
socket-driving tests must stay green; add one assertion that a
`lobby:back` broadcast omits ended messages only if it drops in cheaply.

**Done when:** `pnpm typecheck` + `pnpm --filter @chaverola/server test`
green; `verify:smoke` passes; a scratch driver (or browser session with
devtools) shows a `lobby:back` tap emitting a `chats:snapshot` without
ended-chat `messages` while the cards on screen keep their transcripts;
teacher refresh still restores everything. Push (server change — poll
`/healthz` for the new commit). `pnpm format`, one commit to `main`, tick
this box, flip doc + README state to Complete (with Prompt 1).
