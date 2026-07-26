# Bug & UX review — fix-plan docs

The July 2026 UX/bug audit (three code-audit agents plus a driven browser pass
over the demos and a full real activity) produced a findings list; the founder
picked the items in the table below. Each doc here tackles **one** finding end
to end, in the house prompt-doc style (see
[feature-13](../feature-13-settings-commit-reliability.md) for the shape): a
doc too big for one session is split into **independent prompts**, and every
prompt leaves the app working and green on its own.

## How to run these

- **One prompt per session**, like every plan doc in this repo. Read the whole
  doc before starting its next unticked prompt — the context at the top is part
  of the prompt.
- Prompts are independent: run them in the listed order, but the app builds,
  verifies, and ships after each one.
- **When you finish a prompt, tick its checkbox in the doc.** When the last box
  in a doc is ticked, flip the doc's `State:` line to **Complete** and update
  the State cell in the table below — both edits in the same commit as the
  work.
- Fixes get no AGENTS.md status row (recorded decision: "The status table is
  what a teacher gained; fixes get no row"). This table is the one home for
  tracking this work.

## The docs

| Doc                                                                                                     | What a user gains                                                                         | State       |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------- |
| [02 — End activity ends with the reveal](02-end-activity-ends-with-the-reveal.md)                       | Students get a real ending (reveal included) at the bell, not a dead chat then a wipe     | In progress |
| [03 — The transcript send never strands](03-transcript-send-never-strands.md)                           | The teacher's wrap-up always settles — success or a failure they can act on               | Not started |
| [05 — A sent message never just vanishes](05-a-sent-message-never-just-vanishes.md)                     | Students see their message land — or see that it didn't                                   | Not started |
| [06 — The queue counts who can actually pair](06-the-queue-counts-who-can-actually-pair.md)             | The waiting count and Pair everyone tell the truth about sleeping phones                  | Not started |
| [07 — A wifi blip keeps your tick](07-a-wifi-blip-keeps-your-tick.md)                                   | A selected student who blinks offline stays selected                                      | Not started |
| [08 — Back means back](08-back-means-back.md)                                                           | The back button works on the first press, even after four rounds                          | Not started |
| [10 — A blip at refresh keeps your seat](10-a-blip-at-refresh-keeps-your-seat.md)                       | A refresh during a wifi hiccup retries instead of dumping a student on the code screen    | Not started |
| [22 — You can tell when you're the one offline](22-you-can-tell-when-youre-the-one-offline.md)          | A student whose own wifi drops sees it, instead of typing into the void                   | Not started |
| [23 — The lobby is alive and leavable](23-the-lobby-is-alive-and-leavable.md)                           | Waiting students get progress, honesty about a missing teacher, and a way out             | Not started |
| [24 — Removal lands gently](24-removal-lands-gently.md)                                                 | A removed student gets an explanation they can read, not a keyboard in the face           | Not started |
| [25 — The composer clears the home bar](25-the-composer-clears-the-home-bar.md)                         | The send button stops sharing pixels with the iPhone home indicator                       | Not started |
| [26 — Scrolling up means you get to read](26-scrolling-up-means-you-get-to-read.md)                     | Re-reading the chat stops getting yanked to the bottom on every new line                  | Not started |
| [27 — Pause doesn't slam the keyboard](27-pause-doesnt-slam-the-keyboard.md)                            | A pause mid-typing stops closing the keyboard and jumping the layout                      | Not started |
| [28 — Endings talk like the game](28-endings-talk-like-the-game.md)                                     | The two ops-voice endings ("server restarted", "signed out") speak the product's language | Not started |
| [31 — The host page stops re-downloading the class](31-the-host-page-stops-re-downloading-the-class.md) | The teacher dashboard stays fast in round three                                           | Not started |
| [32 — Students download the student app](32-students-download-the-student-app.md)                       | 30 phones on one AP stop pulling the teacher dashboard to type four digits                | Not started |
| [35 — The 404 serves a kid holding a code](35-the-404-serves-a-kid-holding-a-code.md)                   | A lost student finds the join flow from the dead end                                      | Not started |

## Conventions every doc assumes

- Verify at the cheapest gate (AGENTS.md): `pnpm typecheck` always; `pnpm test`
  when `client/src/lib/`, `hostWorld.ts`, or `server/src/` logic changes; the
  browser (`verify` skill, `pnpm verify:up --scale 10`) only for rendered UI,
  at desktop and phone widths.
- `pnpm format` before every commit; **one commit straight to `main`** per
  prompt (repo convention), pushed on its own.
- Wire-touching prompts carry the deploy-race drill explicitly (AGENTS.md →
  Working Rules): where a client-ahead-of-server window hurts, split server and
  client into separate pushes and poll `/healthz` between; always confirm
  Vercel is Ready for the expected SHA.
- Any user-facing copy you write gets the **humanizer** pass before it ships.
- A product-behavior change records its decision: entry atop the matching
  `docs/decisions/<area>.md` file plus its one line in `DECISIONS.md`, inside
  the prompt that makes the change.
- Demo parity (Working Rules): a user-facing change states its demo-engine
  work, or the doc records why the demo can't show it.
