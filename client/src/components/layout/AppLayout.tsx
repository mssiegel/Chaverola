import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";
// Straight from shared, not via `@/mockData` — the layout is eager, and the
// barrel would bring the demo fixtures with it. Same constant either way.
import { DEMO_JOIN_CODE } from "@chaverola/shared";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { localePrefix } from "@/lib/locale";
import { useHeroCtaPassed } from "@/lib/useHeroCtaPassed";
import { cn } from "@/lib/utils";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { LocaleLink } from "./LocaleLink";
import { PageSpinner } from "./PageSpinner";

/**
 * App shell: navbar (logo home, language switcher, the student Join CTA)
 * over the routed page content. The Join CTA renders only on the homepage
 * (the only page with the hero CTA) — elsewhere it's just noise. The
 * student join flow doesn't use this shell at all; see StudentWorldLayout.
 * On the teacher's live host route the logo (the home link) is removed
 * entirely so it can't be clicked by accident mid-activity; the demo host
 * page keeps it.
 *
 * On phones, the homepage navbar swaps modes as you scroll: while the hero's
 * own Join button is on screen the bar shows just the brand; once you scroll
 * past it, the wordmark slides away and a "Join Activity" button slides in —
 * see DECISIONS.md. From `sm` up the bar is static.
 */
export function AppLayout() {
  const { t } = useTranslation();
  const heroCtaPassed = useHeroCtaPassed();
  // null = no hero CTA, i.e. not the homepage → no navbar Join CTA at all.
  const onHomepage = heroCtaPassed !== null;

  // Hosting a live activity: the brand link disappears so a stray click can't
  // yank the teacher off their running activity — see DECISIONS.md → "The
  // brand home link disappears mid-chat and while hosting". The demo host
  // page is exempt: nothing real is at stake there, so it keeps the brand
  // as a way back to the homepage.
  const { pathname } = useLocation();
  const basePath = pathname.slice(localePrefix(pathname).length);
  const hostingLiveActivity =
    basePath.startsWith("/activity/host/") &&
    basePath !== `/activity/host/${DEMO_JOIN_CODE}`;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* The top pad is the notch inset (0 everywhere else). index.html's
          viewport-fit=cover runs the document under the status bar, and this
          bar is `sticky top-0` — without the pad the logo and the language
          switcher would sit behind it. Padding the header rather than the page
          means the bar's own blur extends behind the status bar, which is what
          we want; the cost is that anything pinned below it (DemoBanner's
          teacher variant) has to carry the same inset in its offset. */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:h-16">
          {!hostingLiveActivity && (
            <LocaleLink
              to="/"
              className="rounded-lg transition-opacity hover:opacity-80"
              aria-label={t("brand.home")}
            >
              <Logo
                size={30}
                wordmarkClassName={cn(
                  "max-w-32 overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none",
                  // Explicit rtl: variants rather than -scale-x-100: this one
                  // wraps the wordmark, and mirroring would reverse the text.
                  heroCtaPassed === true &&
                    "max-sm:max-w-0 max-sm:-translate-x-2 max-sm:opacity-0 rtl:max-sm:translate-x-2"
                )}
              />
            </LocaleLink>
          )}

          {/* `ms-auto` keeps this end-pinned when the brand link is hidden. */}
          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            {onHomepage && (
              <>
                {/* From `sm` up: always there, full label, no swap. */}
                <Button asChild size="sm" className="max-sm:hidden">
                  <LocaleLink to="/activity/join">
                    {t("nav.joinLong")}
                  </LocaleLink>
                </Button>
                {/* Phones: hidden while the hero's own Join CTA is on screen. */}
                <div
                  inert={heroCtaPassed !== true}
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none sm:hidden",
                    heroCtaPassed
                      ? // translate-x-0 is direction-neutral; the offscreen
                        // resting spot is not, so it gets an rtl: twin.
                        "visible max-w-36 translate-x-0 opacity-100"
                      : "invisible max-w-0 translate-x-4 opacity-0 rtl:-translate-x-4"
                  )}
                >
                  <Button asChild size="sm">
                    <LocaleLink to="/activity/join">
                      {t("nav.joinShort")}
                    </LocaleLink>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      {/* Inside the shell, not around it: pages load as their own chunks now,
          and the navbar has no reason to blink while one arrives. */}
      <main className="flex flex-1 flex-col">
        <Suspense fallback={<PageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
