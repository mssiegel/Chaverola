import { lazy } from "react";
import type { ComponentType } from "react";

import { readSessionJson, writeSessionJson } from "./storage";

/**
 * Set once we've already reloaded to recover a chunk, so a genuinely dead
 * network can't put the tab in a reload loop.
 */
const RELOAD_KEY = "chaverola:chunk-reload";

function alreadyReloaded(): boolean {
  return (
    readSessionJson(RELOAD_KEY, (parsed) => (parsed === true ? true : null)) ===
    true
  );
}

/**
 * `lazy()` for a route page, with the two recoveries a split build needs.
 *
 * Splitting pages buys a student a much smaller download, but it also invents
 * a failure that couldn't happen when everything shipped in one file: the
 * chunk itself can fail to arrive. Two real causes, handled in order.
 *
 * 1. A blip mid-navigation — ask once more. Cheap, though not a cure-all: a
 *    browser keeps the failed module in its map, so the second `import()` of
 *    the same specifier often re-rejects without touching the network.
 * 2. A deploy rotated the chunk hashes under a tab that's been open a while,
 *    so the file it's asking for is genuinely gone. `index.html` knows the new
 *    names, so a reload actually fixes this one — and it's the case a student
 *    mid-lesson would otherwise be stuck on.
 *
 * If both miss, the rejection reaches PageErrorBoundary, which is the floor:
 * a student sees a way out instead of a white screen.
 */
export function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return lazy(() =>
    load()
      .catch(() => load())
      .catch((error: unknown) => {
        if (!alreadyReloaded()) {
          writeSessionJson(RELOAD_KEY, true);
          window.location.reload();
        }
        throw error;
      })
  );
}
