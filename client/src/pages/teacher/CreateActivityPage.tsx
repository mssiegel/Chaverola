import { useTranslation } from "react-i18next";

// Side-effect import: registers the `teacher` namespace into this page chunk.
import "@/i18n/ns/teacher";
// …and `chat`, for the emoji picker each character row opens.
import "@/i18n/ns/chat";

import { BrandGlow } from "@/components/layout/BrandGlow";
import { ActivitySetupForm } from "@/components/Teacher/ActivitySetup";
import { Badge } from "@/components/ui/badge";
import { usePageMeta } from "@/lib/usePageMeta";

/**
 * `/activity/create` — the teacher sets up an activity on one scrolling form
 * and hosts it. See DECISIONS.md → "Teacher activity setup" for the rules
 * behind the form's shape and behavior. The Host action lives in a docked
 * bottom bar at every breakpoint, so the page carries extra bottom padding
 * for it.
 */
export function CreateActivityPage() {
  const { t } = useTranslation("teacher");
  usePageMeta(t("setup.meta.title"), t("setup.meta.description"));

  return (
    <div className="relative isolate">
      <BrandGlow />

      <div className="mx-auto w-full max-w-2xl px-4 pt-8 pb-36 sm:pt-10 lg:max-w-5xl">
        <header className="mb-6 sm:mb-8">
          <Badge>{t("setup.badge")}</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
            {t("setup.title")}
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {t("setup.body")}
          </p>
        </header>
        <ActivitySetupForm />
      </div>
    </div>
  );
}
