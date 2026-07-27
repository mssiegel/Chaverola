import { useEffect, useRef, useState } from "react";

import { getActivity } from "@/lib/api";
import { useDemoContent } from "@/lib/demoContent";
import { lookupRetryDelayMs } from "@/lib/lookupRetry";
import { DEMO_JOIN_CODE } from "@/mockData";
import type { Activity } from "@/types/activity";

/**
 * Resolving the join code in the URL to an activity. `not-found` and
 * `unreachable` are distinct on purpose: a wrong code means "recheck it",
 * an unreachable server means "not your fault, try again" — and only the
 * first may sign a student out. A non-2xx that isn't a 404 (a 5xx, a rate
 * limit) reads as `unreachable` too: for a student the situation is the
 * same — the activity may well exist, try again shortly.
 */
export type ActivityLookup =
  | { state: "idle" } // no code in the URL
  | { state: "loading" }
  | { state: "found"; activity: Activity }
  | { state: "not-found" }
  | { state: "unreachable" };

/**
 * Hand-off from the code-entry submit (which already fetched the activity)
 * to the lookup this hook runs after NAVIGATING to /activity/join/:code —
 * without it the code→name swap would flash a loading screen and burn a
 * second lookup on a fresh fetch of data we got milliseconds ago. Only for
 * the cross-route case: the target route's fresh mount reads the map on its
 * first render, before anything can be memoized against it. Same-URL
 * hand-offs must use `deliver` instead — the React Compiler may cache a
 * render-time `handedOff.get(...)` and never observe a later write (it
 * did, during Prompt 5's verification). Entries are only written from a
 * fetch that just succeeded, so staleness is bounded by SPA-session length
 * (a page refresh starts empty and refetches). Unlike the host-side map,
 * entries are never consumed, and a remount CAN re-serve one in-session
 * (home, then Back/Forward into /activity/join/:code, remounts across
 * layouts) — the hazard feature 16 fixed host-side; accepted here for now.
 */
const handedOff = new Map<string, Activity>();

export function primeActivityLookup(activity: Activity): void {
  handedOff.set(activity.joinCode, activity);
}

/**
 * Look up the activity behind a join code. The demo code resolves
 * synchronously with zero network — the demo works offline forever. Real
 * codes go through `GET /activities/:joinCode`.
 *
 * An unreachable answer isn't the end: the lookup retries itself on a capped
 * backoff for as long as the hook is mounted for that code, so a student who
 * refreshes through a wifi blip is put back in their lobby the moment the
 * server answers — no tap required. `retryNow` is the impatient student's
 * version of the same thing.
 *
 * `deliver` hands the hook an activity a caller fetched itself (the
 * code-entry submit, when the code is already in the URL so no navigation
 * will remount anything) — it goes through hook state, the only channel a
 * render is guaranteed to observe.
 */
export function useActivityLookup(joinCode: string | undefined): {
  lookup: ActivityLookup;
  deliver: (activity: Activity) => void;
  retryNow: () => void;
} {
  // Cast in the language on screen: `1234` is whatever locale you're reading
  // it in, so the demo activity follows the URL rather than the other way
  // round (JoinActivityPage's locale inheritance skips the demo entirely).
  const demo = useDemoContent();
  const [settled, setSettled] = useState<{
    joinCode: string;
    lookup: ActivityLookup;
  } | null>(null);
  // The running lookup loop's handles. Republished by the effect on every
  // run and dropped on cleanup, so callers outside the effect (the holding
  // screen's button, `deliver`) can reach the timer that's actually live.
  const loopRef = useRef<{ retryNow: () => void; stop: () => void } | null>(
    null
  );

  useEffect(() => {
    if (joinCode === undefined || joinCode === DEMO_JOIN_CODE) return;
    if (handedOff.has(joinCode)) return;
    let stopped = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = (retriesSoFar: number) => {
      // One fetch at a time: a tapped retry mid-flight would fork the
      // backoff ladder and leave a timer nobody owns.
      if (stopped || inFlight) return;
      inFlight = true;
      void getActivity(joinCode).then((result) => {
        inFlight = false;
        if (stopped) return;
        const lookup: ActivityLookup = result.ok
          ? { state: "found", activity: result.data.activity }
          : result.kind === "not_found"
            ? { state: "not-found" }
            : { state: "unreachable" };
        setSettled({ joinCode, lookup });
        // Only "we couldn't reach the server" keeps the loop alive. Found
        // and not-found are answers, and the page acts on them.
        if (lookup.state === "unreachable") {
          timer = setTimeout(
            () => run(retriesSoFar + 1),
            lookupRetryDelayMs(retriesSoFar)
          );
        }
      });
    };

    const stop = () => {
      stopped = true;
      clearTimeout(timer);
    };
    // Timers live in the effect and die with it, so an unmount, a code
    // change, and StrictMode's double-fire all cancel cleanly.
    loopRef.current = {
      // A tap restarts the ladder at its shortest wait — the student is
      // telling us the wifi is back.
      retryNow: () => {
        clearTimeout(timer);
        run(0);
      },
      stop,
    };
    run(0);

    return () => {
      stop();
      loopRef.current = null;
    };
  }, [joinCode]);

  const deliver = (activity: Activity) => {
    // The caller has the activity in hand, so the loop has nothing left to
    // look for — and stopping it matters: a retry landing a moment later
    // would overwrite a good answer with an unreachable one.
    loopRef.current?.stop();
    setSettled({
      joinCode: activity.joinCode,
      lookup: { state: "found", activity },
    });
  };

  const retryNow = () => loopRef.current?.retryNow();

  if (joinCode === undefined) {
    return { lookup: { state: "idle" }, deliver, retryNow };
  }
  if (joinCode === DEMO_JOIN_CODE) {
    return {
      lookup: { state: "found", activity: demo.activity },
      deliver,
      retryNow,
    };
  }
  // Settled state outranks the hand-off map: a fresh mount reads the map
  // reliably, but later renders may see a memoized (stale) `get`, so state
  // is the source of truth once it exists.
  if (settled !== null && settled.joinCode === joinCode) {
    return { lookup: settled.lookup, deliver, retryNow };
  }
  const primed = handedOff.get(joinCode);
  if (primed !== undefined) {
    return {
      lookup: { state: "found", activity: primed },
      deliver,
      retryNow,
    };
  }
  return { lookup: { state: "loading" }, deliver, retryNow };
}
