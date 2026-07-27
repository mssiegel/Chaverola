# Capacity alerts — an email before we run out of room

> **Status: deferred, 2026-07-27. Not built, and deliberately so.** We haven't
> launched to classrooms, the user count is tiny, and the box we'd be watching
> has roughly 8× headroom at the scale we're planning for. Alerting on a limit
> nothing is approaching is instrumentation for its own sake. Founder call.
>
> This doc exists because the _research_ is the expensive part and it's already
> done. The design below is executable from cold when a trigger fires; see
> **When to pick this up**.

The question that started it: how do we get an email when the Render instance
hits 80% of capacity, so we know to upgrade before teachers feel it?

The capacity estimate itself is settled and shipped (`bd57e2b`, which also
bounded inbound socket payloads at 32 KB). At 20–30 concurrent classes —
~930 sockets — the Starter instance sits at roughly 210 MB RSS of 512 and idles
on CPU. What an estimate can't do is notice when reality drifts from it: a
memory leak, a jump in adoption, or a limit we never measured.

## Why Render can't just do this for us

This is the finding worth writing down, because it's the reason the answer isn't
a checkbox and re-deriving it later would be pure waste.

- **Render has no metric alerts.** Its email and Slack notifications fire on
  _events_ — a build fails, a deploy fails, a service becomes unhealthy — and
  never on a CPU or memory threshold. It's a long-standing open feature request,
  not something hiding in a submenu.
- **The sanctioned workaround costs money.** Render can stream service metrics
  to an OpenTelemetry provider (Grafana, New Relic, Honeycomb) where you'd
  define thresholds — but metrics streaming requires a **Pro workspace plan**,
  plus a second vendor account, to answer one yes/no question.

Hence a watch that lives in our own process. It also turns out to see more than
Render's dashboard ever could — see the third gauge below.

## Capacity is three numbers, and they don't share a fix

The most useful thing this research produced. "80% of capacity" sounds like one
threshold; it's three, and they call for different responses.

| Signal                      | 80% on Starter       | What it actually means                           |
| --------------------------- | -------------------- | ------------------------------------------------ |
| **RSS** vs container limit  | 410 MB of 512 MB     | A leak, or real growth → **upgrade to Standard** |
| **CPU** vs 0.5 cores        | 0.40 cores sustained | Real load → **upgrade to Standard**              |
| **Open fds** vs `ulimit -n` | e.g. 819 of 1024     | **Not an upgrade** — fix the start command       |

Watching memory alone would have been the obvious build, and it would have been
close to useless: baseline RSS is 155–218 MB and 30 classes adds only ~33 MB, so
the gauge would read flat for years. Reassuring right up until something else
binds first.

**The third row is why.** One websocket is one file descriptor, so ~930 sockets
at 30 classes sits at **91% of a 1024 soft limit** — and a dead socket keeps its
fd for up to 45 s (`pingInterval` 25 + `pingTimeout` 20) while its replacement is
already open. The failure mode is `EMFILE` on accept, which in the logs reads as
students randomly failing to join, not as a capacity problem. Render's dashboard
cannot show this number at all, and the fix isn't a bigger instance — it's a
one-line change to the start command.

## The design

One module, `server/src/capacityWatch.ts`. No endpoint, no dashboard, no new
dependency.

**Limits, resolved once at boot and logged immediately.** That log line is the
day-one payoff: it prints the real fd ceiling on every deploy.

- **Memory** — `process.constrainedMemory()`, a supported Node API that reads
  the cgroup limit, falling back to a 512 MB constant when it returns `0` (as it
  does off-container; verified on Windows). Self-adjusting, so upgrading the
  instance needs no code change.
- **File descriptors** — parse the `Max open files` soft column out of
  `/proc/self/limits`. Linux-only, wrapped in try/catch so a dev machine skips
  the gauge instead of crashing.
- **CPU** — a documented `INSTANCE_CPU_CORES = 0.5` constant. Deliberately _not_
  parsed out of `/sys/fs/cgroup/cpu.max`: hand-rolling cgroup parsing to save a
  one-line edit on the day we upgrade is a bad trade.

**Sample every 5 minutes, evaluate every hour.** An hourly email is plenty, but
an hourly _instantaneous_ reading would measure capacity at 12 arbitrary moments
a day and miss exactly what it's watching for — CPU averaged over an hour smooths
a spike into nothing, and a reading taken between two classes sees near-zero
sockets. So a cheap sample (`process.memoryUsage.rss()`, a `process.cpuUsage()`
delta, one `readdirSync` on `/proc/self/fd`) keeps a running max, and the hourly
tick evaluates that **peak**. Twelve samples an hour, microseconds each.

**Hysteresis, not a bare threshold.** Trip at **80%**, re-arm only after falling
back under **65%**. Each gauge latches independently, so a sustained condition
emails **once** rather than every hour, and a restart re-arms it. The consequence
is deliberate: if memory parks at 85% you get exactly one email until the service
restarts. You've been told; a daily repeat is how alerts become noise.

**Delivery reuses the existing [`Mailer`](../../server/src/email/mailer.ts)** —
the same Gmail transport that sends transcripts, so log mode in dev writes a
`warn` instead of sending. The send is wrapped in try/catch: a failing alert
email must never be able to take down the server. Recipient is a new optional
`ALERT_EMAIL` falling back to `config.smtp.user`, so production needs no new env
var.

The email names which gauge tripped, its numbers, the matching action from the
table above, and the scale it happened at (live sockets, activity count) — so
"tripped at 40 classes" and "tripped at 3 classes" don't read the same.

**Supporting edits**, all small: `startCapacityWatch(...)` in
[index.ts](../../server/src/index.ts) after `startSweep()`, an `alertEmail` field
in [config.ts](../../server/src/config.ts), and an exported `activityCount()`
from [activityStore.ts](../../server/src/store/activityStore.ts) for email
context. The watch is called only from `index.ts` and its timer is `.unref()`d,
matching `startSweep` exactly, so vitest and supertest never start a timer.

**Tests:** one file covering the pure trip/latch function only — not the
sampling, which can't run on Windows and isn't worth mocking. The latch is the
part that fails invisibly: a bug either emails every hour forever or never emails
at all, and both look fine locally.

## When to pick this up

Any one of these:

- Real classrooms are live and sustained peaks pass **~15 concurrent classes** —
  half the headroom we sized for.
- A teacher reports students failing to join, or a laggy host page.
- Render's logs show a restart we can't account for.
- Ahead of any push to a materially larger cohort — a district pilot, a
  conference demo.

## Worth doing now, and unrelated to the above

**Turn on Render's built-in notifications** — Dashboard → workspace Settings →
Notifications, email on failure events. Free, two minutes, needs none of this
plan.

It isn't redundant with the watch, either. An in-process monitor structurally
cannot tell you the process died — a crashed server sends no email. Render's
"service became unhealthy" notification is the dead-man's switch; the capacity
watch would be the early warning. Neither covers the other's case, and the free
one is the one we don't have.

## The still-open `ulimit` question

Independent of this plan and far cheaper than it. We never established the
container's `nofile` soft limit, and it's the single number that decides whether
30 concurrent classes is comfortable or at 91% of a ceiling.

```sh
render ssh srv-d9ducu3bc2fs73esrr8g
ulimit -Sn; ulimit -Hn
```

Blocked by the agent permission classifier when it was attempted on 2026-07-27,
so it needs a human at a terminal — or five throwaway lines reading
`/proc/self/limits` at boot, which is most of what the memory gauge above would
do anyway.

- **Soft ≥ 4096** — nothing to do; the capacity question closes outright.
- **Soft = 1024** — still not code. Render runs the start command through
  `/bin/sh -c`, so change it in the dashboard to
  `ulimit -n 65535 && pnpm --filter @chaverola/server start`, provided the hard
  limit allows it (the same command says).

## Deliberately not in scope, whenever this is built

- **No `/statsz` endpoint, no metrics dashboard, no OTel exporter.** The ask is
  an alert, and an alert is a comparison plus an email. A dashboard is a
  different product.
- **No event-loop-lag gauge.** It's the metric a teacher actually feels, but
  sustained CPU is a good enough proxy at this scale and costs nothing to read.
- **No fix for the O(N²) teacher broadcast.**
  [`broadcastState`](../../server/src/live/lobbyContext.ts) emits full class
  state to the teacher on every seat or chat change. Worst case at 30 classes is
  a ~2 s host-page lag spike if every class ends a round on the same bell —
  annoying, not breaking. The CPU gauge is what would tell us it had stopped
  being theoretical.
