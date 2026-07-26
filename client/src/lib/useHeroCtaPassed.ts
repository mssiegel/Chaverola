import { useLayoutEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { localePrefix } from "./locale";

/** id of the hero's primary Join CTA. The navbar watches this element. */
export const HERO_JOIN_CTA_ID = "hero-join-cta";

/**
 * The sticky navbar covers the top of the viewport, so the CTA visually
 * disappears when it slides under the bar, not at y=0. 64px = navbar height
 * at `sm` (it's 56px below that; triggering 8px early there is invisible).
 */
const NAVBAR_HEIGHT = 64;

/**
 * Whether the visitor has scrolled past the hero's Join CTA.
 *
 * - `null` — the current page has no hero CTA (any page but the homepage).
 * - `false` — the CTA is still on screen.
 * - `true` — the CTA has scrolled up under the navbar.
 *
 * Drives the mobile navbar swap (brand ↔ Join Activity button) — see
 * DECISIONS.md → "Mobile navbar swaps the wordmark for Join Activity".
 */
export function useHeroCtaPassed(): boolean | null {
  const { pathname } = useLocation();
  const [passed, setPassed] = useState<boolean | null>(null);

  // Reset during render on navigation (not in the effect) so pages without a
  // hero CTA never briefly keep the previous page's value.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setPassed(null);
  }

  // The homepage is its own chunk, so its hero can land a beat after this
  // effect runs — on the first visit the effect fires while the page is still
  // downloading and there is no CTA in the document yet. Only the homepage
  // ever has one, so only the homepage waits for it; a body-wide observer
  // left running on the host dashboard would be watching a busy tree for an
  // element that is never coming.
  const barePath = pathname.slice(localePrefix(pathname).length) || "/";
  const couldHaveHeroCta = barePath === "/";

  // Layout effect so the first paint already knows whether a hero CTA
  // exists — no one-frame flash of the wrong navbar mode.
  useLayoutEffect(() => {
    let intersection: IntersectionObserver | undefined;
    let waiting: MutationObserver | undefined;

    const watch = (el: Element) => {
      const hasPassed = (rect: DOMRect) => rect.bottom <= NAVBAR_HEIGHT;
      // Measure-before-paint: the observer below only reports asynchronously,
      // so without this synchronous read the first frame after navigating to
      // the homepage shows the wrong navbar mode.
      setPassed(hasPassed(el.getBoundingClientRect()));

      intersection = new IntersectionObserver(
        ([entry]) => {
          if (entry) setPassed(hasPassed(entry.boundingClientRect));
        },
        { rootMargin: `-${NAVBAR_HEIGHT}px 0px 0px 0px` }
      );
      intersection.observe(el);
    };

    const el = document.getElementById(HERO_JOIN_CTA_ID);
    if (el) {
      watch(el);
    } else if (couldHaveHeroCta) {
      waiting = new MutationObserver(() => {
        const late = document.getElementById(HERO_JOIN_CTA_ID);
        if (!late) return;
        waiting?.disconnect();
        watch(late);
      });
      waiting.observe(document.body, { childList: true, subtree: true });
    }
    // else: no CTA on this page; state is already null

    return () => {
      intersection?.disconnect();
      waiting?.disconnect();
    };
  }, [pathname, couldHaveHeroCta]);

  return passed;
}
