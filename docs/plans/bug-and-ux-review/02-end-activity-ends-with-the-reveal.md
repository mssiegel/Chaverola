# 02 — End activity ends with the reveal

State: **Complete**

**The problem.** "End activity" is the normal end of every real lesson, and it
gives every student still in a chat the worst ending in the product. The
handler
([`teacher.ts:366-390`](../../server/src/live/handlers/teacher.ts)) flips
every chat to ended with a bare `endChat(current, chat.id)` loop (line 378)
and **deliberately skips `settleMembershipChange`** (comment at 374-377), so
no student ever receives `chat:ended` — no wrap-up screen, no name reveal.
Then it awaits the transcript send (a real SMTP round trip), and only then
calls `removeActivity`, whose teardown emits `activity:ended`. Net effect on
a student's phone:

1. During the await, the chat looks alive but is dead — sends silently no-op
   (`findActiveChatOf` misses an ended chat), typing stops, nothing explains
   why.
2. Then the whole screen is replaced mid-sentence by the "This activity is
   over" card
   ([`ActivityGoneCard.tsx`](../../client/src/pages/student/join/ActivityGoneCard.tsx)):
   no "And… scene!", no "you were really chatting with…". The reveal — the
   product's emotional payoff — never happens for the ending the entire class
   experiences at once.

On the client, the gone latch outranks everything:
[`JoinActivityPage.tsx:202`](../../client/src/pages/student/JoinActivityPage.tsx)
(`stage = activityGone ? "activity-gone" : baseStage`), so even if the server
did send `chat:ended` first, the gone card would stomp the reveal seconds
later.

**Decisions in play.**

- "The live name reveal fires at chat-end, per the teacher's setting"
  ([`chat-behavior.md`](../decisions/chat-behavior.md)) — its own text says
  every ending reveals. End-activity currently contradicts it; this doc makes
  it true.
- "End activity is the terminal wrap-up, and it emails the class transcript" +
  "Ending removes the activity right away"
  ([`teacher-live.md`](../decisions/teacher-live.md)) — both stand. Removal
  still happens immediately after the send; what changes is that students get
  their ending first, and their screens don't discard it just because the
  activity died.
- The teacher's confirm copy
  ([`confirmCopy.ts`](../../client/src/components/Teacher/HostActivity/confirmCopy.ts))
  says students "see the activity is over" — after this doc they see their
  ended chat (reveal included), then the activity-over card when they tap
  onward. Update the confirm copy only if it reads as wrong afterwards.
- Record the outcome as a decision: entry atop
  [`chat-behavior.md`](../decisions/chat-behavior.md) (+ its DECISIONS.md
  line) in whichever prompt lands second — "End activity ends every chat with
  the full ended-screen treatment; the activity-over card waits for the
  student's tap."

**Relationship to doc 03.** Both prompts of
[03 — the transcript send never strands](03-transcript-send-never-strands.md)
edit the same `activity:end` handler. Either doc can ship first; whoever runs
second rebases on what's there. Keep the diffs separate — don't fold 03's
try/catch into this doc's prompt.

**Prompt order.** Either order leaves the app working. Prompt 1 first is the
better interim state (students get the reveal for the seconds until removal
lands); Prompt 2 first is a visual no-op until Prompt 1 ships. No wire shape
changes in either — `chat:ended` and `activity:ended` already exist, so there
is no deploy race in either direction.

- [x] Prompt 1 — The server settles every chat before it tears down
- [x] Prompt 2 — The ended screen outlives the activity

---

## Prompt 1 — The server settles every chat before it tears down

**Goal:** when a teacher ends the activity, every student in a chat receives
the same `chat:ended` they'd get from "End all chats" — reason `teacher`,
reveal included when the setting is on — before the transcript send starts
and before removal.

1. In [`teacher.ts`](../../server/src/live/handlers/teacher.ts) `activity:end`
   (line 366), replace the bare loop at :378 with the `chats:end-all` body's
   idiom (:237-247): `endChat(current, chat.id)` and, when it returns a
   result, `settleMembershipChange(current, result)` — snapshot
   `[...current.chats]` before iterating if `endChat` mutates the array
   ordering (check; the end-all handler will tell you). `clearAutoMatch`
   stays first, exactly where it is.
2. Rewrite the comment at :374-377 — its "settling here would flash a second
   ended screen first" concern is what Prompt 2 retires. If Prompt 2 hasn't
   shipped yet, say so honestly in the comment ("the client may still replace
   this with the gone card until doc 02 prompt 2 lands").
3. Do NOT touch the send-once guard (:369), the await, the emit, or
   `removeActivity` — doc 03 owns the failure paths.
4. Server suite: `pnpm --filter @chaverola/server test`. The end-all test
   (["chats:end-all closes every active chat at once"](../../server/src/live/lobby.test.ts))
   is the shape to imitate **only if** an invariant is genuinely at stake;
   policy is safety-invariants-only ("Server tests cover only the safety
   invariants"). The reveal-on-end-activity leg rides the existing
   `toChatEnded` pins — a new test is likely unnecessary.

**Edge cases:** chats already ended return `undefined` from `endChat` and are
skipped (pinned by
[`matching.test.ts:322-325`](../../server/src/live/matching.test.ts)). A
student who dropped mid-chat gets the ended chat replayed on resume — but
resume dies with the activity at removal; that window is unchanged from
today. The emits from `settleMembershipChange` land before removal's
`activity:ended` because both are synchronous, ordered writes on the same
sockets.

**Done when:** `pnpm typecheck` + server tests green; a scratch driver
(`tools/verify/scratch/`, importing `../lib.mjs`) with a teacher + two chatting
students asserts each student socket receives `chat:ended` (with `reveal`
when `revealNames` is on) **before** `activity:ended` on End activity.
`pnpm format`, one commit to `main`, push, tick this box. If this is the
second prompt to land, add the decision entry (see top) in this commit and
flip the doc + README state to Complete.

---

## Prompt 2 — The ended screen outlives the activity

**Goal:** a student on the chat-ended screen (reveal on screen) keeps it when
`activity:ended` lands; the "This activity is over" card waits for their tap.

1. In [`JoinActivityPage.tsx`](../../client/src/pages/student/JoinActivityPage.tsx),
   narrow the override at :202: when `baseStage` is `"ended"`, let it win —
   `activityGone` stays latched (the `goneCode` state, :156-158) but only
   takes the screen once the student leaves the ended stage. The ended screen
   renders from `chatEnded` state and needs no socket, so it survives the
   disconnect that removal causes.
2. The ended screen's CTA ("Back to the lobby",
   [`ChatEndedSection.tsx`](../../client/src/components/Student/Chatbox/ChatEndedSection.tsx))
   currently calls `backToLobby`/`returnToLobby`. With the activity gone,
   returning to a lobby that no longer exists is wrong — when `goneCode` is
   latched, the tap should land on the activity-gone stage instead (likely
   free: clearing `chatEnded` drops `baseStage` out of `"ended"`, and the
   :202 override takes over — verify, don't assume; make sure no
   `lobby:back` emit fires at a dead socket in a way that throws).
   Check whether the CTA label should change in the gone case ("See what's
   next" vs "Back to the lobby" — it isn't a lobby anymore). Any new label is
   user-facing copy: humanizer pass, and it's a small enough call to make
   without the founder.
3. Presence: `useLobbyPresence` treats `activity:ended` as terminal
   ([`useLobbyPresence.ts`](../../client/src/pages/student/useLobbyPresence.ts))
   — confirm the ended screen doesn't flash a "Reconnecting…" pill when the
   socket drops at removal (the terminal latch should already cover it; fix
   here if not).
4. **Demo parity:** the student demo's teacher-ends-chat event already shows
   the reveal flow. The demo has no "activity ends" event today — check
   [`ChatDemoControls`](../../client/src/components/demo/ChatDemoControls.tsx)
   / [`useChatDemo.ts`](../../client/src/components/chat/useChatDemo.ts); if
   adding an "activity wraps up" demo beat is cheap, add it; if not, record in
   this doc's State note that the demo shows the reveal-on-end but not the
   end-activity sequencing (acceptable — the sequencing is a live-wire
   behavior).

**Edge cases:** a student in the LOBBY when End activity fires still goes
straight to the gone card (nothing ended for them — correct). A student who
already tapped back to the lobby before removal: same. A student mid-chat
whose `chat:ended` was lost (dropped socket at the wrong instant) falls back
to today's behavior — gone card directly; acceptable, don't engineer for it.
Refresh on the ended screen after removal: the lookup 404s → gone card; the
reveal is lost on refresh — that's audit bug 1, deliberately not in this
doc's scope.

**Tests:** none — stage-precedence inside a page component; the no-DOM client
policy can't reach it, and the failure is loud (wrong screen).

**Done when:** `pnpm typecheck` green; browser pass (`pnpm verify:up
--scale 10`, teacher + two students, phone width on the students): End
activity → both students keep their ended screens with the reveal, tap →
activity-over card; a third student sitting in the lobby jumps straight to
the activity-over card. Demo pass per step 4. `pnpm format`, one commit to
`main`, push, tick this box. If this is the second prompt to land, add the
decision entry (see top) in this commit and flip the doc + README state to
Complete.
