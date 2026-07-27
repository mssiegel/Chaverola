import { Component } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { i18n } from "@/i18n";

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

    // getFixedT, not useTranslation: this is a class OUTSIDE BrowserRouter and
    // outside any provider, and it's the floor under the whole app — it must
    // never itself throw. `common` is the one namespace loaded at init, so
    // it's the only one this component may read. If i18next somehow never
    // initialized, t() hands back the key: ugly, not a white screen.
    //
    // <html dir> is a DOM mutation, not React state, so it survives the crash
    // that unmounted LocaleEffects — this fallback still renders RTL under /he.
    const t = i18n.getFixedT(null, "common");

    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <PlaceholderPage title={t("error.title")} description={t("error.body")}>
          <Button size="lg" onClick={() => window.location.reload()}>
            {t("error.retry")}
          </Button>
        </PlaceholderPage>
      </div>
    );
  }
}
