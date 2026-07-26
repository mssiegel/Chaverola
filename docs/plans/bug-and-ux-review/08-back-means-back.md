# 08 — Back means back

State: **Not started**

**The problem.** The back-guard leaks one swallowed history entry per chat.
[`useBackGuard.ts:22-33`](../../client/src/lib/useBackGuard.ts) pushes a
sentinel copy of the current entry every time `active` flips true, and
nothing ever consumes it. `LiveChatStage` is keyed by `chatId`
([`JoinActivityPage.tsx:315`](../../client/src/pages/student/JoinActivityPage.tsx))
and arms the guard on every mount
([`LiveChatStage.tsx:118`](../../client/src/components/Student/LiveChatStage.tsx))
— so after four rounds of chatting, a student backing out of the lobby
presses back five or six times, each press appearing to do nothing. Browser
back is also the flow's designed escape (redo a wrong name, leave the
activity — see doc [23](23-the-lobby-is-alive-and-leavable.md)), so the
degradation hits a real path, not an edge.

The guard's own docblock documents **one** leftover sentinel as "a small
wart" — it didn't anticipate the per-chat accumulation.

**Decisions in play.**

- "Back during a live chat asks before ending it"
  ([`student-join.md`](../decisions/student-join.md)) — fully stands; the
  guard's behavior _while armed_ doesn't change.
- "Landing on code entry signs the student out" — the escape this doc
  repairs; unchanged.

- [ ] Prompt — One sentinel, ever

---

## Prompt — One sentinel, ever

**Goal:** however many chats a student went through, leaving costs at most
the one already-documented swallowed back — and if the cleanup proves safe
across browsers, zero.

1. **Floor (must land):** cap the sentinel at one. In
   [`useBackGuard.ts`](../../client/src/lib/useBackGuard.ts), track
   "sentinel already behind us" in module state (or stamp a marker into the
   cloned `history.state` — e.g. `{ ...history.state, __chaverolaGuard:
true }` — and check it before pushing). Re-arming (chat 2, 3, 4…) with
   the sentinel still behind pushes nothing; the popstate handler's
   re-push on interception stays exactly as is. Preserve the
   react-router-state cloning (:24-26) — the comment explains why.
2. **Stretch (attempt, keep only if verified):** consume the sentinel on
   disarm. In the effect cleanup, when the guard armed-and-pushed and the
   user never popped: remove the popstate listener first, then
   `history.back()` to eat the sentinel. Verify with real browsers (Chrome
   - one more) that: (a) the silent back doesn't race a real navigation
     the user just made — the ended-screen → lobby swap is same-URL, so no
     navigation should be in flight; (b) React Router doesn't react to the
     pop (same URL, its own state restored); (c) StrictMode's double
     arm/disarm in dev doesn't over-pop. If any of it is flaky, ship the
     floor alone and update the docblock's wart note to "capped at one".
3. Update the docblock — it's the only documentation of this behavior;
   keep its honesty (whichever endstate ships).
4. **Demo parity:** the demo chat stage uses the same guard
   ([`ChatStage.tsx`](../../client/src/components/Student/ChatStage.tsx))
   — free; verify the demo's multi-round flow (end chat via demo controls,
   re-pair, repeat) accumulates nothing.

**Edge cases:** a student who DID press back mid-chat consumed the sentinel
into the re-push cycle — the marker check keeps the accounting straight
because the re-push clones the marked state. Arriving with a marked entry
already behind (refresh mid-chat) — the marker survives the reload in
`history.state`; treat it as present and push nothing. Locale switch or
any real navigation invalidates "behind us" — acceptable: the next arm
re-checks and at worst pushes one.

**Tests:** none — history API behavior; browser-verified. (A pure marker
helper doesn't warrant a test file.)

**Done when:** `pnpm typecheck` green; browser pass (`verify:up
--scale 10`): run three full rounds (pair → chat → end → back to lobby ×3),
then press back once from the lobby — the first press lands on the name
step (or costs exactly the one documented swallow, floor version); the
mid-chat back still opens the confirm. Same sweep on the demo. `pnpm
format`, one commit to `main`, push, tick this box, flip doc + README
state to Complete.
