import { getByJoinCode } from "../store/activityStore";
import type { LobbyContext } from "./lobbyContext";
import { timing } from "./timing";

/*
  Telling waiting students when no teacher device is connected (feature 23
  prompt 2).

  The fact itself is the auto-match refcount in autoMatch.ts — arm and
  release already return their 0↔1 transitions, and this module only decides
  when a transition is worth putting on thirty phones. It does not hold a
  count of its own: two sources of "is a teacher here" is how the lobby and
  the matchmaker end up disagreeing.

  Coming back is immediate. Going away waits out a debounce, because the
  commonest way an activity loses its last teacher socket is a teacher
  pressing refresh — a second or two later they're back, and a lobby that
  flashed "your teacher's away" in between taught every student in the room
  to distrust the screen. The window is the same one the "lost connection"
  surfaces already gate on (timing.broadcastDelayMs, 4s unscaled, and scaled
  along with everything else in a dev run): same product judgment, that a
  blip is not news.

  A refresh inside the window is therefore silent on both edges — the pending
  away is cancelled and the return says nothing, because the students were
  never told anything changed.
*/

/** joinCode → the pending away broadcast. At most one per activity. */
const awayTimers = new Map<string, NodeJS.Timeout>();

function cancelPendingAway(joinCode: string): boolean {
  const timer = awayTimers.get(joinCode);
  if (!timer) return false;
  clearTimeout(timer);
  awayTimers.delete(joinCode);
  return true;
}

/** A teacher socket connected. `wasFirst` is armAutoMatch's 0→1. */
export function onTeacherConnected(
  ctx: LobbyContext,
  joinCode: string,
  wasFirst: boolean
): void {
  // A refresh: the students never heard the away, so they get no return
  // either. Cancelling is the whole fix.
  if (cancelPendingAway(joinCode)) return;
  if (!wasFirst) return; // a second host device changes nothing
  const record = getByJoinCode(joinCode); // never refreshes the TTL
  if (!record) return;
  ctx.log.info({ joinCode }, "teacher present — lobbies back to waiting");
  ctx.sendTeacherPresence(record, true);
}

/** A teacher socket dropped. `wasLast` is releaseAutoMatch's 1→0. */
export function onTeacherDisconnected(
  ctx: LobbyContext,
  joinCode: string,
  wasLast: boolean
): void {
  if (!wasLast) return;
  cancelPendingAway(joinCode);
  const timer = setTimeout(() => {
    awayTimers.delete(joinCode);
    const record = getByJoinCode(joinCode);
    if (!record) return;
    // Settled at fire time, not arm time: a reconnect inside the window
    // already cancelled us, so reaching here means they're really gone.
    ctx.log.info({ joinCode }, "no teacher device — lobbies say so");
    ctx.sendTeacherPresence(record, false);
  }, timing.broadcastDelayMs);
  timer.unref();
  awayTimers.set(joinCode, timer);
}

/** Activity removal: the students are being told the activity is over, which
 *  outranks anything this timer had to say. */
export function cancelTeacherPresence(joinCode: string): void {
  cancelPendingAway(joinCode);
}
