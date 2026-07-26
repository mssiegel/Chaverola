# 03 — The transcript send never strands the teacher

State: **Not started**

**The problem.** After tapping End activity, the teacher's wrap-up card shows
"Sending your transcripts… This only takes a moment" — and that state has no
timeout, no error path it can't miss, and no exit:

- The nodemailer transport is created with **no timeout overrides**
  ([`mailer.ts:49-52`](../../server/src/email/mailer.ts)) — nodemailer's
  defaults are ~2 min to connect and up to 10 min on a stalled socket. The
  `activity:end` handler
  ([`teacher.ts:366-390`](../../server/src/live/handlers/teacher.ts)) awaits
  that send before emitting `activity:end-result`, so the card can sit on the
  spinner for minutes.
- `formatTranscriptEmail(record)` runs **outside** the try/catch, after the
  record was already marked `"sending"`
  ([`sendTranscript.ts:44-46`](../../server/src/email/sendTranscript.ts)). A
  throw there — or anywhere else in the handler — leaves the record stuck in
  `"sending"` forever, which makes every future End a silent no-op
  (`teacher.ts:369`), never removes the activity, and (the handler being
  async with no guard, and [`index.ts`](../../server/src/index.ts) registering
  no `unhandledRejection` handler) can take the whole process down — wiping
  every live class on the instance.
- Client-side, `sending` is optimistic
  ([`useHostActivityLive.ts:317-338`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts))
  and only `activity:end-result` settles it. While it shows, the one CTA is
  hidden ([`WrappedUpCard.tsx:97-101`](../../client/src/components/Teacher/HostActivity/WrappedUpCard.tsx))
  and the navbar has no brand link on host routes — the page has literally
  zero ways out, and a refresh lands on not-found because the activity is
  already gone.

**Scope cut (founder call, 2026-07-26):** the second-host-device race — a
device that taps End while another device's send is in flight hits the
`"sending"` guard at :369 and never gets an emit — stays unfixed. In 99% of
classes there is one host device. Prompt 1 records this as a decision so
nobody "fixes" it casually.

**Decisions in play.**

- "Ending removes the activity right away; the wrapped-up screen is local to
  the tab" ([`teacher-live.md`](../decisions/teacher-live.md)) — stands.
  Removal timing doesn't change; what changes is that the result emit becomes
  unconditional and the client stops trusting it blindly.
- "The transcript mailer: Gmail SMTP behind one module, log-only without
  credentials" ([`backend-api.md`](../decisions/backend-api.md)) — stands;
  timeouts live inside that one module.
- "End activity is the terminal wrap-up, and it emails the class transcript"
  — stands.

**Relationship to doc 02.** Both prompts of
[02 — End activity ends with the reveal](02-end-activity-ends-with-the-reveal.md)
edit the same handler. Either doc first; rebase on what's there.

**Prompt order.** Independent. Prompt 1 is server-only, Prompt 2 client-only —
no wire shape changes (the `activity:end-result` payload is unchanged), so no
deploy race either way.

- [ ] Prompt 1 — The send is bounded and the handler can't die mid-End
- [ ] Prompt 2 — The sending card stops holding the teacher hostage

---

## Prompt 1 — The send is bounded and the handler can't die mid-End

**Goal:** an End activity always produces exactly one `activity:end-result`
to the pressing socket within a bounded time, and always reaches
`removeActivity` — whatever the SMTP weather.

1. **Bound the transport** in
   [`mailer.ts`](../../server/src/email/mailer.ts): pass explicit
   `connectionTimeout`, `greetingTimeout`, and `socketTimeout` to
   `createTransport`. Pick values so the worst-case End wait is classroom-
   tolerable (~15-30s total; e.g. 10s / 10s / 20s). Keep them in one
   commented constant block — the reasoning ("a teacher is standing in front
   of a class watching a spinner") matters more than the numbers.
2. **Move the format inside the guard** in
   [`sendTranscript.ts`](../../server/src/email/sendTranscript.ts): compose
   `formatTranscriptEmail(record)` inside the try (or its own try) so a
   formatting throw lands in the `"failed"` branch like a send failure —
   never a permanent `"sending"`.
3. **Guard the handler** in
   [`teacher.ts`](../../server/src/live/handlers/teacher.ts): wrap the
   `activity:end` body after the `"sending"` guard in try/catch. On catch:
   `log.error`, emit `activity:end-result` with
   `{ email: current.teacherEmail ? { to: current.teacherEmail, state: "failed" } : null }`,
   and still run `removeActivity(current)` (a teardown failure should not
   zombify the class — best-effort it in a nested try). The existing happy
   path emits exactly once; make sure the catch path can't double-emit.
4. **Record the scope cut** (this prompt touches the file): entry atop
   [`teacher-live.md`](../decisions/teacher-live.md) + its line in
   [`DECISIONS.md`](../../DECISIONS.md) — "End activity answers the device
   that pressed it; a second host device pressing End mid-send gets no
   answer (accepted, founder 2026-07-26)". Do not change the :369 guard.
5. Docs: [`docs/api.md`](../api.md) only if it documents end-result timing
   (check; likely no change — the payload shape is untouched).

**Edge cases:** log-mode mailer (dev, or prod without creds) resolves
instantly — timeouts are dormant there. A failed send still removes the
activity (today's behavior — the failure card tells the teacher to copy
chats before closing; that stays). `sendTranscriptEmail` returning `null`
(no email / silent class) is not an error — untouched.

**Tests:** the server policy is safety-invariants-only. "End always settles
and always removes" is arguably one — if a test fits the existing suite's
socket-driving shape cheaply (fault-inject by passing a mailer whose `send`
rejects), add ONE; otherwise verify by scratch driver and move on.

**Done when:** `pnpm typecheck` + `pnpm --filter @chaverola/server test`
green; scratch driver proves a normal End emits exactly one result and the
activity 404s afterward; a temporary local fault injection (mailer that
rejects; not committed) proves the failed path emits `failed` and still
removes. `pnpm format`, one commit to `main`, push, tick this box. If second
to land, flip doc + README state to Complete.

---

## Prompt 2 — The sending card stops holding the teacher hostage

**Goal:** if the result hasn't arrived after a bounded wait, the wrap-up card
stops claiming "this only takes a moment", shows the teacher their chats are
safe below, and gives them their exit — while still settling normally if the
result arrives late.

1. In [`useHostActivityLive.ts`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts),
   when `endActivity` sets the optimistic `{ state: "sending" }` (:334-337),
   arm a one-shot timer (~25s — sized to Prompt 1's server budget plus
   headroom; works standalone too). If `activity:end-result` hasn't settled
   the state by then, transition to a new `HostEnded` state (e.g.
   `"unconfirmed"`) carrying the same `to`. A late result still overwrites
   it (the existing `:170` listener already does). Clear the timer on
   result, unmount, and the effect's cleanup.
2. In [`WrappedUpCard.tsx`](../../client/src/components/Teacher/HostActivity/WrappedUpCard.tsx)
   / [`hostEngine.ts`](../../client/src/components/Teacher/HostActivity/hostEngine.ts)
   (the `HostEnded` type), render the new state: honest copy in the product's
   voice — we haven't heard back about the email; the chats are below, copy
   anything you want to keep; checking the inbox later is reasonable — and
   **show the "Set up a new activity" CTA** (the `!sending` gate at :97
   already unhides it for any non-sending state). Run the copy through the
   humanizer.
3. Don't touch the navbar rule ("The brand home link disappears … while
   hosting") — the card's CTA is the sanctioned exit.
4. **Demo parity:** the demo's wrapped card never sends (its own branch at
   `WrappedUpCard.tsx:24-30`) — no demo work; note it and move on.

**Edge cases:** state resets on unmount already (`setEnded(null)` in the
mount-effect cleanup, `useHostActivityLive.ts:267`); make the timer follow.
`endActivity` with no email goes straight to `"empty"` — timer only arms for
`"sending"`. A result arriving 1ms after the flip: card updates to
sent/failed — fine, no flicker worth engineering around.

**Tests:** none — a timer plus a copy branch inside a component; no-DOM
policy. The hook's logic tests (if any exist for `hostEngine`) don't cover
socket timing.

**Done when:** `pnpm typecheck` green; browser pass: on a real local activity,
temporarily suppress the server's emit (comment it out locally, not
committed) → End activity → after ~25s the card flips to the unconfirmed
copy with the CTA visible and the completed chats readable below; restore the
emit → normal End still shows "Sent to …". Desktop width is enough (host
page), but glance at phone. `pnpm format`, one commit to `main`, push, tick
this box. If second to land, flip doc + README state to Complete.
