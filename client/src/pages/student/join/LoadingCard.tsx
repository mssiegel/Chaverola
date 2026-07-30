import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { StageCard } from "./StageCard";

/**
 * The URL names a code whose lookup is still in flight (a lobby refresh, a
 * shared link). Its own stage on purpose: rendering the code gate here would
 * fire the page's sign-out effect mid-lookup.
 */
export function LoadingCard() {
  const { t } = useTranslation("student");
  return (
    <StageCard role="status" className="items-center gap-4 py-10">
      <Loader2
        aria-hidden
        className="size-8 animate-spin text-brand-grape motion-reduce:animate-none"
      />
      <p className="text-lg font-semibold text-foreground">
        {t("gate.finding")}
      </p>
    </StageCard>
  );
}
