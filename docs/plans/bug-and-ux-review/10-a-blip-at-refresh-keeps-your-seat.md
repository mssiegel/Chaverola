# 10 — A blip at refresh keeps your seat

State: **Not started**

**The problem.** A seated student who refreshes (or whose tab is restored)
during a wifi hiccup is dumped onto what looks like being kicked out, while
their seat quietly burns down:

- The lookup runs **once** per code and never retries:
  [`useActivityLookup.ts:63-81`](../../client/src/lib/useActivityLookup.ts)
  settles `unreachable` and stays there.
- `unreachable` isn't `loading` and yields no `activity`, so the stage
  machine falls through to `"code"`
  ([`JoinActivityPage.tsx:189-201`](../../client/src/pages/student/JoinActivityPage.tsx))
  — the signed-in student sees the code-entry gate with a red error, which
  reads as "you're out". (The session is correctly kept — the sign-out
  effect at :217-221 spares unreachable — but nothing _uses_ that care.)
- With no `activity`, `seated` is false, so `useLobbyPresence` never
  connects — no seat hold — while the server's 120s grace runs out. If the
  student doesn't notice the prefilled code and tap Continue in time, they
  lose their queue spot, or end their partner's chat.
- Worse, a fetch that connects and then stalls never settles at all:
  [`api.ts:64-86`](../../client/src/lib/api.ts) passes no `AbortSignal`, so
  the captive-portal / overloaded-AP case is an **infinite** LoadingCard.

The recorded decision promises the opposite: "when it answers again the
student lands right back in their lobby — same name, no re-entry"
([`student-join.md`](../decisions/student-join.md)).

**Decisions in play.**

- **"The create-activity submit has no client-side timeout"** (AGENTS.md
  invariant — create isn't idempotent). This doc touches **only the
  idempotent GETs**; do not let a shared timeout leak into
  `createActivity`.
- "Real codes resolve over the API, and only a resolved miss signs anyone
  out" — stands; retrying strengthens it.
- Record when done: amend-note on that entry + DECISIONS.md line ("An
  unreachable lookup retries itself; a signed-in student waits it out on a
  reconnecting screen, never the code gate").

- [ ] Prompt — Timeouts, retries, and an honest holding screen

---

## Prompt — Timeouts, retries, and an honest holding screen

**Goal:** a stalled lookup settles within seconds; an unreachable one
retries by itself with backoff; and a signed-in student rides it out on a
calm "reconnecting you" screen that lands them back in their lobby the
moment the server answers — never on the code gate.

1. **Bound the GETs** ([`api.ts`](../../client/src/lib/api.ts)): pass
   `AbortSignal.timeout(~8000)` on the GET helpers (`getActivity`, the
   hosted-activity GET). An abort rejects the fetch → the existing `catch`
   already maps it to `unreachable` — verify `AbortError` lands there and
   note it. **`createActivity` gets nothing** (see invariant). The
   teacher-side host lookup inherits the timeout for free — confirm
   [`useHostedActivityLookup.ts`](../../client/src/lib/useHostedActivityLookup.ts)
   handles `unreachable` (it has its own retry screen already).
2. **Retry in the hook**
   ([`useActivityLookup.ts`](../../client/src/lib/useActivityLookup.ts)):
   when a lookup settles `unreachable`, schedule a refetch with capped
   backoff (~2s → 5s → 10s, then every 10s) while the hook is mounted for
   that code. Cancel on unmount/code change (the `cancelled` flag pattern
   is already there; add the timer to it). A retry that succeeds settles
   `found` — the page re-derives, `seated` flips true, and the presence
   hook resumes the seat through its normal machinery. Mind StrictMode's
   double-fire (the verify README's known gotcha): timers live in the
   effect and die with it.
3. **The holding screen**
   ([`JoinActivityPage.tsx`](../../client/src/pages/student/JoinActivityPage.tsx)):
   split the `!activity` fallthrough — `unreachable` **with a signed-in
   session** renders a reconnecting-style card (amber pill language from
   the lobby, "We can't reach Chaverola — retrying…", plus the manual
   try-now button wired to the same refetch), not the code gate. Without a
   session, today's code-gate + unreachable copy stands. New copy →
   humanizer.
4. **Demo parity:** the demo resolves synchronously offline and can never
   be unreachable — nothing to show; note it.

**Edge cases:** the retry resolving `not-found` (activity actually died
mid-blip) → the normal resolved-miss path signs out to the code gate —
correct and unchanged. Retry racing the student typing a different code on
the gate (non-signed case): the hook keys retries to the mounted code;
navigation cancels. The handed-off-map fast path (:65) is untouched. Rate
limit answering 429 → maps to `unreachable` (existing design) → backoff is
exactly right for it.

**Tests:** the backoff schedule as a pure helper in `lib/` (delay sequence,
cap) gets a small test — in policy. Hook wiring stays browser-verified.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass
(`verify:up --scale 10`): join, then kill the server and refresh → the
signed-in student sees the reconnecting card (not the code gate); restart
the server → within a backoff step they're back in their lobby, same name,
seat intact (partner unaffected). Fresh visitor with the server down still
gets the code gate + unreachable copy. Stall case: block the port (or
suspend the server process) → the lookup settles unreachable in ~8s instead
of spinning forever. Decision note + DECISIONS.md line in this commit.
`pnpm format`, one commit to `main`, push, tick this box, flip doc +
README state to Complete.
