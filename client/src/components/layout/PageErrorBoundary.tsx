import { Component } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { PlaceholderPage } from "./PlaceholderPage";

/**
 * The floor under the whole app.
 *
 * Pages ship as separate chunks, so one of them can now fail to arrive —
 * a dead spot in the wifi, or a deploy that rotated the filenames under a tab
 * that has been open since first period. `lazyPage` tries to recover from
 * both on its own; this is what a student sees when it can't, and the only
 * alternative is a white screen.
 *
 * The button reloads rather than re-rendering, because a failed `lazy()`
 * import stays failed: React holds on to the rejected promise, so asking the
 * same component to render again just hands back the same error. Fetching the
 * page afresh is the one move that works.
 *
 * A class because error boundaries have no hook equivalent. It also catches
 * ordinary render crashes anywhere in the tree, which until now took the
 * whole screen with them.
 */
export class PageErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <PlaceholderPage
          title="That didn't load 🫠"
          description="Something got stuck on the way here. Another go usually does it."
        >
          <Button size="lg" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </PlaceholderPage>
      </div>
    );
  }
}
