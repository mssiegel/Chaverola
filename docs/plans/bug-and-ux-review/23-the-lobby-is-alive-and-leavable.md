# 23 — The lobby is alive and leavable

State: **Complete**

**The problem.** The waiting lobby is the product's longest dead moment, and
it has two honesty gaps and a missing door:

- **Static forever:** [`WaitingLobby.tsx`](../../../client/src/components/Student/WaitingLobby.tsx)
  shows the same heading, the same pill, the same three dots at second 5
  and at minute 5. Kids compare screens and conclude it's broken — then
  refresh or back out.
- **Silently inert without a teacher:** auto-match runs only while a
  teacher socket is connected
  ([`autoMatch.ts`](../../../server/src/live/autoMatch.ts) arms on the 0→1st,
  releases on the last — a recorded invariant), and manual pairing
  obviously needs the teacher too. When the teacher's laptop sleeps,
  every student's lobby keeps chirping "Waiting for your match" for a
  matchmaker that is not running. Nothing on any student screen reflects
  it.
- **No way out:** the decision "Ending your own chat keeps your seat…"
  ([`chat-behavior.md`](../../decisions/chat-behavior.md)) states "**Leaving
  the activity is a lobby act.** …a student who is really done ends the
  chat, then leaves from the lobby" — but the lobby renders no leave
  control. The only exit is browser back (degraded until doc
  [08](08-back-means-back.md) lands).

**Decisions in play.**

- "Auto-match runs only while a teacher socket is connected — a closed
  laptop holding pairing is the product, not a bug" (AGENTS.md invariant,
  founder call) — **fully stands**. Prompt 2 tells students the truth
  about it; it does not change matching.
- "The real lobby still says Waiting for your match until matching ships"
  ([`student-join.md`](../../decisions/student-join.md)) — the pill's copy
  stays the baseline; new states layer on the existing pill-swap pattern
  (reconnecting/paused already swap it).
- "The student wire carries characterIds only" — prompt 2's new field is a
  boolean about the _teacher_, no student data; it still gets the
  mandatory allowlist pin in `projections.test.ts`.
- Record both changes as decisions entries when their prompts land
  ([`student-join.md`](../../decisions/student-join.md) + DECISIONS.md).

**Prompt order.** Independent. 1 is client-only; 2 is a wire change
(follow [docs/adding-a-wire-event.md](../../adding-a-wire-event.md)).

- [x] Prompt 1 — A door and a pulse
- [x] Prompt 2 — The lobby knows when the teacher's away

---

## Prompt 1 — A door and a pulse

**Goal:** a student who's done can leave from the lobby with one clear
control, and a student who waits sees the screen acknowledge time passing.

1. **The leave control:** a quiet "I'm done — leave the activity" affordance
   under the info card in
   [`WaitingLobby.tsx`](../../../client/src/components/Student/WaitingLobby.tsx)
   (link-weight, not a competing CTA — leaving is the rare path). Confirm
   through the shared
   [`confirm-dialog`](../../../client/src/components/ui/confirm-dialog.tsx)
   ("leave the activity? your teacher will see you've left" energy — copy
   through the humanizer). On confirm: drive the **existing** teardown path
   — sign out and let the page land on code entry (the same flow browser
   back takes; `useLobbyPresence`'s cleanup emits the flush-protected
   `lobby:leave` — do NOT hand-roll a second emit; the `LEAVE_FLUSH_MS`
   machinery is a pinned prod lesson). Wire the handler up through
   [`JoinActivityPage.tsx`](../../../client/src/pages/student/JoinActivityPage.tsx)
   (which owns `signOut`).
2. **The pulse:** time-based copy variance under the pill — after ~45-60s,
   the body line rotates to a calmer acknowledgment ("Still lining
   everyone up — hang tight"), and again for the long tail. Use plain
   `setInterval` real time (this is a real surface — never `scaledMs`);
   two or three variants, no countdown, no percentages (nothing to
   promise). Copy through the humanizer.
3. **Demo parity:** the demo lobby auto-pairs ~20s in, so variance rarely
   shows — fine. The leave control WILL show in the demo lobby; make sure
   its confirm + exit works against the demo flow (client-simulated,
   no socket) — likely just the same signOut path; verify.
4. Decision entry: "The lobby has a leave door and acknowledges a long
   wait" ([`student-join.md`](../../decisions/student-join.md)) +
   DECISIONS.md line.

**Edge cases:** leave while a match lands (chat:started racing the
confirm): the confirm's action re-checks — if a match arrived, close the
dialog and let the chat open (the chat's own exit takes over; never leave
a matched seat via the lobby door). Removed/ended states already unmount
the lobby. Paused lobby keeps the paused pill; the leave door stays
available.

**Tests:** none — component behavior; the leave wire path is already
pinned server-side.

**Done when:** `pnpm typecheck` green; browser pass (`verify:up --scale
10`, phone width): student leaves from the lobby → teacher's queue drops
them (row gone), student lands on code entry signed out; wait 60s+ →
copy rotates. Demo lobby leave works. Decision entry in this commit.
`pnpm format`, one commit to `main`, push, tick this box; if Prompt 2
already landed, flip doc + README state to Complete.

---

## Prompt 2 — The lobby knows when the teacher's away

**Goal:** while no teacher device is connected, waiting students see an
honest, calm variant ("Your teacher's screen is away — matching picks
back up when they return") instead of dots promising a matchmaker that
isn't running.

1. **Wire (all seven touch points —
   [docs/adding-a-wire-event.md](../../adding-a-wire-event.md) is the HOWTO):**
   a `teacherPresent: boolean` for students. Shape: include it in the
   student's `lobby:welcome` payload (for joiners while the teacher is
   away) and add an `activity:teacher-presence { present }` broadcast to
   student seats on the 0↔1 teacher-socket transitions — the exact
   moments [`autoMatch.ts`](../../../server/src/live/autoMatch.ts) already
   arms/releases on (hook the same call sites in
   [`teacher.ts`](../../../server/src/live/handlers/teacher.ts) /
   [`lobby.ts`](../../../server/src/live/lobby.ts) rather than inventing a
   second refcount). Projection stays a field-by-field literal; **add the
   allowlist pin in
   [`projections.test.ts`](../../../server/src/store/projections.test.ts)
   (mandatory)** — the boolean carries no student data.
2. **Client:** register in
   [`useLobbyPresence.ts`](../../../client/src/pages/student/useLobbyPresence.ts),
   reduce into lobby state (a pure reducer beside the others in
   [`liveMatchState.ts`](../../../client/src/pages/student/join/liveMatchState.ts)
   if that's where it fits, else hook state), thread to `WaitingLobby` and
   swap the pill/body copy when `teacherPresent === false`. Precedence:
   reconnecting > paused > teacher-away > waiting (an away claim through a
   dead socket is a claim the screen can't back up — same principle as the
   existing comment at `WaitingLobby.tsx:43-44`). Copy through the
   humanizer; keep it blame-free.
3. **Deploy race:** `shared/` changes in this slice. Client-ahead is
   harmless-ish (never receives the event → shows the old lobby;
   `teacherPresent` defaults true) — make the client default
   **present=true** when the field/event is absent so the old-server
   window shows today's behavior, then a single push is acceptable; still
   poll `/healthz` and confirm Vercel Ready. If you can't make the
   default safe, split server-first and wait between pushes.
4. **Demo parity:** the demo lobby has no teacher socket — it must keep
   `teacherPresent: true` structurally (the demo never shows the away
   state unless a steering event is added; don't add one — the demo's
   job is the happy path. Note it here).
5. Decision entry: "The lobby says so when no teacher device is
   connected" ([`student-join.md`](../../decisions/student-join.md)) +
   DECISIONS.md line, noting the auto-match invariant deliberately
   unchanged.

**Edge cases:** teacher refresh = last-socket-drop then reconnect within
seconds — debounce the away broadcast (~3-5s server-side, or client-side
before rendering the swap) so a refresh doesn't flash the banner across
thirty phones. The transcript-fallback timer also keys off last-teacher-
disconnect — unrelated; don't touch. Students mid-chat: the field is
lobby-surface only; chats don't render it.

**Tests:** the projection pin (mandatory). The server suite drives real
sockets — one assertion that the broadcast fires on last-disconnect fits
the existing shape if cheap; otherwise scratch-driver it.

**Done when:** `pnpm typecheck` + `pnpm test` green (pin included);
browser pass (`verify:up --scale 10`): two students waiting, close the
teacher tab → after the debounce both lobbies swap to the away variant;
reopen → they swap back within a second or two; join a third student
while away → they arrive already seeing it. `/healthz` + Vercel Ready
after the push. Decision entry in this commit. `pnpm format`, one commit
to `main` (split-push only if the safe default couldn't hold), push, tick
this box; if Prompt 1 already landed, flip doc + README state to
Complete.
