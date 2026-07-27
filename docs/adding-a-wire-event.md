# Adding a wire event

A new socket event touches seven files, in one order, on both sides of the
wire. Miss a step and the failure is quiet: an unhandled Socket.IO event is
dropped with no error, and a projector that leaks a field ships a student's
real name to their peers. This is the checklist, with `chat:peer-connection`
(feature 8's peer-drop relay) as the worked example.

The load-bearing rule underneath all of it: the **student wire carries
characterIds only** — never a peer's name, never a studentId. Step 3 is what
keeps that true, and it is not optional.

## 1. Types — `shared/src/socket.ts`

Add the event and its payload to the socket contract. Both sides import from
here, so the payload shape is defined once.

```ts
"chat:peer-connection": (payload: {
  chatId: string;
  characterId: string;
  state: "dropped" | "returned";
  secondsLeft: number | null;
}) => void;
```

If the event rides along on an existing payload (the way a drop's remaining
grace also lands in `chat:started`'s `reconnectingPeers` backlog on resume),
add that field here too — resume backlogs are authoritative, because every
live fan-out skips disconnected seats.

## 2. Projector — `server/src/store/projections.ts`

Write a `to<Event>` function that maps stored state to the wire payload as a
**field-by-field literal, never a spread**. A spread is how a private field
(a studentId, a real name) leaks the day someone adds one to the stored
shape.

```ts
export function toPeerConnection(chat, studentId, state, secondsLeft) {
  return { chatId: chat.id, characterId: /* the seat's dealt id */, state, secondsLeft };
}
```

## 3. Allowlist pin — `server/src/store/projections.test.ts` (mandatory)

Pin the projector's output keys with an exact-key assertion, so a future
field can't silently join the payload. This is the test that enforces the
characterIds-only invariant; keep it exact rather than loosening it.

```ts
expect(Object.keys(toPeerConnection(...))).toEqual([
  "chatId", "characterId", "state", "secondsLeft",
]);
```

## 4. Emit — `server/src/live/handlers/*` (via `lobbyContext.ts`)

The broadcast helper lives in `lobbyContext.ts` (it holds `io` and the
member-iteration rules); the owning handler calls it. `sendPeerConnection`
fans out to the OTHER chat members only — never the affected seat, never the
teacher room — and each caller supplies the trigger:

- the "returned" emit fires from `handlers/studentSession.ts` when a resumed
  seat rejoins its chat;
- the "dropped" emit fires from the disconnect broadcast timer, past the 4s
  gate, seeding `secondsLeft` from `LOBBY_GRACE_SECONDS`.

## 5. Client registration — `useLobbyPresence.ts` (student) / `useHostActivityLive.ts` (teacher)

Register the listener and forward the payload to a callback prop. The hook
stays a thin relay: it latest-refs the callback and calls it, so the page
reacts where reacting with setState is the subscription pattern the hooks
lint asks for.

```ts
socket.on("chat:peer-connection", (payload) => {
  onPeerConnectionRef.current?.(payload);
});
```

## 6. Reducer + one wiring line

- **Student:** add a pure reducer to `pages/student/join/liveMatchState.ts`
  and wire it in `join/useActiveMatch.ts` as a one-liner over `setMatch`. The
  reducer owns the state transition (and its test); the hook owns the timers
  and refs beside it. `chat:peer-connection` split into `applyPeerDropped`
  and `applyPeerReturned` — the returned path's guard (no offline entry ⇒ no
  flash) is what keeps sub-4s blips and duplicate-tab takeovers invisible.

```ts
onPeerConnection: (payload) => {
  if (payload.state === "dropped") {
    setMatch((prev) => applyPeerDropped(prev, payload));
    return;
  }
  setMatch((prev) => applyPeerReturned(prev, payload));
  // ...the flash timer the reducer can't hold
},
```

- **Teacher:** fold the change into the live engine's state update in
  `useHostActivityLive.ts` instead.

## 7. Behavior test — `lobby.test.ts`

Add a real-socket test in the style already there: it drives actual clients
and asserts who receives the event and who does not (the peer-drop test pins
that the relay reaches the other members but never the affected seat or the
teacher room). Run it at a compressed `timeScale` so the broadcast gate and
grace window don't cost real seconds.

## The deploy race

`shared/` is in both deploy triggers, so one push races two pipelines and a
client that already knows the new event meets a server that doesn't (or the
reverse) — and the unhandled event is dropped silently. Poll `/healthz` for
the new server commit before testing, and split a client-ahead-of-server
window into separate pushes. See AGENTS.md → Working Rules.

## Changing an existing field's type

Adding an event is safe because an unknown event is dropped silently. Changing
what an existing field _contains_ is not: the old client doesn't ignore the new
value, it renders it. `rematchNotice: string` → `railNotice: RailNotice` (the
Hebrew plan's prompts 4 and 6) is the worked example, and the reason it needed
two pushes rather than one.

**The ordering dance does not apply here.** The rule above — ship the server
first, then the client — works only when a commit can be server-only.
`shared/` is in both deploy triggers, so any commit touching the wire contract
deploys both sides at once. There is no ordering that gives you a safe window;
the only tool left is making both shapes valid at the same time.

**What one push would have done.** A teacher's dashboard is mounted under a
root `PageErrorBoundary`. An old client handed an object where it expects a
string renders it as a React child, React throws, and the boundary swallows the
_whole page_ — not the notice, the dashboard — mid-lesson. That is the failure
mode to weigh: not "the notice looks wrong for five minutes" but "thirty
students are waiting while the teacher stares at an error page."

**The recipe. Two pushes, additive then subtractive.**

1. **Additive.** Add the new field _beside_ the old one; keep the old one
   populated. The server builds the old value from the new one, so there is one
   source of truth and they cannot disagree — `legacyNoticeText` in
   `lobbyContext.ts` was that adapter, mapping `RailNotice` back to the English
   sentence. Move the client to the new field in the same push. Mark the old
   field `@deprecated` at its declaration, in `docs/api.md`, and at the adapter,
   each naming the commit or prompt that deletes it. Every reader of the new
   field tolerates its absence (`?? null`) — that is what covers the new-client
   / old-server order.

   Both orders now degrade rather than break: old client + new server reads the
   string that is still there; new client + old server gets no notice for a few
   minutes.

2. **Confirm it is actually live on _both_ sides.** `/healthz` reports the
   server commit. It says nothing about the client, and Vercel's Ignored Build
   Step can cancel a client build while both dashboards read green — this
   happened, and the newest **Ready** build was sixteen hours stale. Check that
   the latest production deployment is **Ready** (not Canceled) for the SHA you
   expect, then grep the served bundle for the new field. Grep the _lazy chunk_,
   not `index-*.js`: a page's code rides its own chunk, so the entry bundle
   comes back clean and reads as a false negative.
   ([operations.md](operations.md) → Recovering a skipped client build.)

3. **Subtractive.** Only then delete the old field, the adapter, and any helper
   that existed to feed it. Deleting on the strength of "I pushed it" rather
   than "I grepped it" is how step 2's stale-build hazard turns into the
   mid-lesson error page step 1 spent a whole deploy avoiding.

**Do the same for a field you are removing outright**, minus the adapter: stop
reading it, confirm live, then stop sending it. And for a field you are
_adding_ to an existing payload, the deprecation half is unnecessary — an old
client ignores a key it doesn't destructure — but the `?? null` on the new
reader is still what carries the new-client / old-server minutes.
