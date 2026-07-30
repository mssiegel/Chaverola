import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { StageCard } from "./StageCard";

/**
 * The screen for an activity that died under a seated student — a deploy or
 * restart wiped the in-memory store, or the 12h TTL reaped it. Honest about
 * what happened instead of blaming the student's code, but in the game's
 * voice: this is the whole class's goodbye at the bell, not an incident
 * report, so the copy says "something cut the activity short" and names no
 * servers. The sign-out is deferred to the CTA (the session is the evidence
 * this screen exists).
 */
export function ActivityGoneCard({
  onEnterNewCode,
}: {
  onEnterNewCode: () => void;
}) {
  const { t } = useTranslation("student");
  return (
    <StageCard>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">
          {t("gone.title")}
        </h1>
        <p className="text-muted-foreground">{t("gone.body")}</p>
      </div>
      <Button
        variant="brand"
        size="lg"
        onClick={onEnterNewCode}
        className="w-full"
      >
        {t("gone.cta")}
        {/* flip-rtl: "onwards", so it follows the reading direction. */}
        <ArrowRight className="flip-rtl size-4" />
      </Button>
    </StageCard>
  );
}
