import { useTranslation } from "react-i18next";

import { LocaleLink } from "@/components/layout/LocaleLink";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/lib/usePageMeta";

/** Friendly catch-all. */
export function NotFoundPage() {
  const { t } = useTranslation();
  usePageMeta(t("notFound.pageTitle"), t("notFound.body"));

  return (
    <PlaceholderPage
      eyebrow={t("notFound.eyebrow")}
      title={t("notFound.title")}
      description={t("notFound.body")}
    >
      {/* Join leads: whoever mistyped a path most likely has a code in hand. */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <LocaleLink to="/activity/join">{t("nav.joinLong")}</LocaleLink>
        </Button>
        <Button asChild size="lg" variant="outline">
          <LocaleLink to="/">{t("notFound.backHome")}</LocaleLink>
        </Button>
      </div>
    </PlaceholderPage>
  );
}
