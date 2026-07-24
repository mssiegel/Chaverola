# Pending manual tests

Manual tests that were **asked for and not performed**, because at the time
the founder couldn't run them — no cellular service in the room, no second
device to hand, wrong time of day. Each one is written down here so it can be
picked up later instead of quietly disappearing.

## What goes in this file

Only tests that were requested and blocked. That's the whole rule.

- **In:** a test an agent asked the founder to run, that couldn't be run then,
  for a practical reason.
- **Out:** tests that were run — whatever the result. A test that ran and
  passed needs no entry; a test that ran and found a bug belongs in
  DECISIONS.md and the feature's plan, not here.
- **Out:** things nobody has got round to asking for. This is a record of
  unmet asks, not a wishlist of good ideas. A general "what should we test"
  list would grow without bound and stop being read.

**When you run one, delete its entry** and record the outcome wherever that
feature's verification lives (the plan's pass record, DECISIONS.md if it
changed a decision). An empty file is the goal state, not a sign of neglect.

**For agents:** when you ask the founder to run something manual and they
can't, add it here before the session ends, with enough detail that it can be
run cold months later — the exact steps, what should happen, what it would
mean if it doesn't, and what coverage exists in the meantime. Don't assume
the next reader has the conversation you had.

---

## Feature 14 — the two-device settings wake, with a real phone as the sleeper

_Asked 2026-07-24; blocked because the founder's laptop was running on the
phone's hotspot — airplane mode on the phone would have severed both devices._

**Steps** (2 minutes, on production chaverola.com):

1. On a laptop, create a real activity and land on the host page. Open the
   same host URL in the phone's browser — one teacher, two devices.
2. Put the phone in **airplane mode**.
3. On the laptop, turn **Match students 1:1 automatically** off (rail or
   panel switch — either).
4. Airplane mode off, phone tab back to the foreground. The amber
   "Reconnecting to your class…" banner should appear and clear within a few
   seconds.
5. **Look, don't touch:** the phone's auto-match switch must now read **off**
   on its own.
6. On the phone, flip any **other** switch (e.g. "Reveal names when a chat
   ends"), then check the laptop: auto-match must **stay off**.

**What it would mean if it fails:** step 5 showing on means the reconnect
fold isn't firing on a real handset's radio cycle (the fix rides the first
`chats:snapshot` after each socket connect — see the 2026-07-24 entry in
`docs/decisions/teacher-live.md`). Step 6 flipping auto-match back on for the
laptop means the stale full-replace bug survived on real hardware — the exact
regression feature 14 closed.

**Coverage in the meantime:** the same two-tab sequence passed headless
against production on 2026-07-24 (feature 14's pass record;
`tools/verify/scratch/f14-settings-wake.mjs`, 14/15 with the one FAIL being a
deliberately over-strict determinism check on the separately documented
offline-edit corner). What headless can't imitate is a real radio dropping
and re-associating, which is why this entry exists.

_Older batch cleared. The last set — five real-handset tests accumulated across
features 3–9 — ran in one sitting on 2026-07-23 and every entry was deleted:
outcomes live in the feature-3, feature-4, feature-5, and feature-8 plans'
pass records, and the one bug found (the survivor of a student's leave
blamed the teacher) in DECISIONS.md → chat-behavior, fixed the same day._
