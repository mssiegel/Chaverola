import { useEffect, useState } from "react";

import { HOST_KEY_PATTERN } from "@chaverola/shared";
import { getHostedActivity } from "@/lib/api";
import type { HostedActivity } from "@/types/activity";

/**
 * Resolving the host page's URL key to the teacher's full activity. Same
 * split as the student lookup: `not-found` is a normal screen (a stale link
 * from an activity that already expired), `unreachable` means try again —
 * and only the host side gets a retry, because a teacher stuck on this
 * screen mid-class needs a way back in that isn't a full reload.
 */
export type HostedActivityLookup =
  | { state: "loading" }
  | { state: "found"; activity: HostedActivity }
  | { state: "not-found" }
  | { state: "unreachable" };

/**
 * Cross-route hand-off from the create submit, which already holds the
 * activity the server just minted — without it, landing on the host page
 * would flash a loading screen refetching data we got milliseconds ago.
 * An entry serves exactly one mount: every render of that mount reads it
 * (safe at render time ONLY on a fresh mount — see useActivityLookup's map
 * for the React Compiler caveat that rules out same-URL hand-offs this
 * way), and the mount's cleanup deletes it. So create → host stays
 * fetch-free, and any later remount of the same key (Back to create,
 * Forward again) refetches server truth instead of serving the create-time
 * copy forever (feature 16).
 */
const handedOff = new Map<string, HostedActivity>();

export function primeHostedActivityLookup(
  hostKey: string,
  activity: HostedActivity
): void {
  handedOff.set(hostKey, activity);
}

/**
 * Look up the activity behind a host key via `GET /activities/host/:hostKey`
 * (which also refreshes the activity's TTL — an open host page keeps its
 * class alive across refreshes). A param that can't be a real key — a stale
 * 4-digit link, garbage, the demo's `1234` (the page renders the demo before
 * consulting this) — settles as `not-found` with no network trip; the server
 * would 404 it anyway. `retry` refetches after an `unreachable` answer.
 */
export function useHostedActivityLookup(hostKey: string | undefined): {
  lookup: HostedActivityLookup;
  retry: () => void;
} {
  const [settled, setSettled] = useState<{
    key: string;
    attempt: number;
    lookup: HostedActivityLookup;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (hostKey === undefined || !HOST_KEY_PATTERN.test(hostKey)) return;
    // The hand-off is CLAIMED for this mount and released on the way out —
    // never consumed on the way in. All the effect owes it is declining to
    // fetch (same shape as useActivityLookup's effect); the render below is
    // what serves it, and deleting the entry mid-mount would be exactly the
    // later write the compiler is free not to observe. Releasing it in
    // cleanup still keeps an entry to one mount, which is what makes a
    // later remount of the same key (Back to create, Forward again) refetch
    // server truth. Cleanup also runs when `attempt` moves, so a retry can
    // never be answered by the create-time copy. Dev-only wart: StrictMode's
    // release-and-remount finds the map empty and fetches once — one extra
    // GET, not a loop.
    if (attempt === 0 && handedOff.has(hostKey)) {
      return () => {
        handedOff.delete(hostKey);
      };
    }
    let cancelled = false;
    void getHostedActivity(hostKey).then((result) => {
      if (cancelled) return;
      setSettled({
        key: hostKey,
        attempt,
        lookup: result.ok
          ? { state: "found", activity: result.data.activity }
          : result.kind === "not_found"
            ? { state: "not-found" }
            : { state: "unreachable" },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hostKey, attempt]);

  const retry = () => setAttempt((n) => n + 1);

  if (hostKey === undefined || !HOST_KEY_PATTERN.test(hostKey)) {
    return { lookup: { state: "not-found" }, retry };
  }
  // Settled state outranks the hand-off map, same as the student lookup. On a
  // primed mount the two never actually collide — a claimed hand-off means no
  // fetch ran, so nothing settles — and a retry leaves `attempt` past 0, which
  // takes the map out of the running entirely: server truth is all that's left.
  if (
    settled !== null &&
    settled.key === hostKey &&
    settled.attempt === attempt
  ) {
    return { lookup: settled.lookup, retry };
  }
  // Read on EVERY render of a primed mount, not just the first — the entry is
  // alive for all of them, which is the point of releasing it in cleanup.
  if (attempt === 0) {
    const primed = handedOff.get(hostKey);
    if (primed !== undefined) {
      return { lookup: { state: "found", activity: primed }, retry };
    }
  }
  return { lookup: { state: "loading" }, retry };
}
