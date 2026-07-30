import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { MAX_STUDENTS_PER_ACTIVITY } from "@chaverola/shared";

import { Button } from "@/components/ui/button";

import { StageCard } from "./StageCard";

/**
 * The seat-cap screen: the student signed in, but every seat is taken.
 * Names the cap so the wall makes sense, offers a retry (someone leaving
 * frees a seat — socket.io doesn't auto-retry a middleware rejection, so
 * the button is the only way back in) and a quiet way out.
 */
export function ActivityFullCard({
  retrying,
  onRetry,
  onUseAnotherCode,
}: {
  retrying: boolean;
  onRetry: () => void;
  onUseAnotherCode: () => void;
}) {
  const { t } = useTranslation("student");
  return (
    <StageCard>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">
          {t("full.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("full.body", { max: MAX_STUDENTS_PER_ACTIVITY })}
        </p>
      </div>
      <div className="flex w-full flex-col items-center gap-3">
        <Button
          variant="brand"
          size="lg"
          onClick={onRetry}
          disabled={retrying}
          className="w-full"
        >
          {retrying ? (
            <>
              {t("full.checking")}
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            </>
          ) : (
            t("full.retry")
          )}
        </Button>
        <button
          type="button"
          onClick={onUseAnotherCode}
          className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          {t("full.otherCode")}
        </button>
      </div>
    </StageCard>
  );
}
