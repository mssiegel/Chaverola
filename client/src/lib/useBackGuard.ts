import { useEffect } from "react";

import { isRecord } from "./storage";
import { useLatestRef } from "./useLatestRef";

/** Marks the sentinel entry so re-arming can tell one is already behind us. */
const SENTINEL_MARK = "__chaverolaBackGuard";

/** True when the entry we're sitting on is a sentinel this guard pushed. */
function sentinelIsCurrent() {
  const state: unknown = window.history.state;
  return isRecord(state) && state[SENTINEL_MARK] === true;
}

function pushSentinel() {
  // Clone the current entry's state: react-router keeps its own bookkeeping
  // (entry key/index) in history.state, and a null state would confuse it.
  window.history.pushState(
    { ...window.history.state, [SENTINEL_MARK]: true },
    "",
    window.location.href
  );
}

/**
 * Intercepts browser back while `active`: the pop is swallowed by re-pushing
 * the current entry, and `onBack` runs instead. The join flow uses this so a
 * stray back-swipe during a live chat opens the end-chat confirmation rather
 * than silently landing on code entry and killing the chat (see DECISIONS.md
 * → "Back during a live chat asks before ending it").
 *
 * Arming pushes a sentinel copy of the current entry so the first back has
 * somewhere to land that isn't a real navigation. The sentinel is stamped, and
 * arming while sitting on a stamped entry pushes nothing — so a student who
 * chats four rounds (each pairing remounts the stage and re-arms) still leaves
 * exactly one behind, not four. That one costs a swallowed back on the way out
 * of the lobby, which is the price of the guard: the ended screen's designed
 * exit is its own button anyway.
 */
export function useBackGuard(active: boolean, onBack: () => void) {
  const onBackRef = useLatestRef(onBack);

  useEffect(() => {
    if (!active) return;
    if (!sentinelIsCurrent()) pushSentinel();
    const handlePopState = () => {
      // Re-push through the same helper: the entry we just popped onto is the
      // unmarked real one, and a bare clone would launder the mark away.
      pushSentinel();
      onBackRef.current();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [active, onBackRef]);
}
