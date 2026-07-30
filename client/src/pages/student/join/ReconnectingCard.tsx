import { useTranslation } from "react-i18next";
import { Loader2, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

import { StageCard } from "./StageCard";

/**
 * A student who already has a seat, on a refresh (or a tab restore) the
 * server didn't answer. The code gate would be a lie here — they're still
 * signed in, and their seat is held by the server's grace window — so they
 * wait it out on this screen instead, while the lookup retries behind it.
 * The amber pill is the lobby's, on purpose: same trouble, same signal.
 */
export function ReconnectingCard({
  studentName,
  onTryNow,
}: {
  studentName: string;
  onTryNow: () => void;
}) {
  const { t } = useTranslation("student");
  return (
    <StageCard className="items-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">
          {t("reconnecting.title", { name: studentName })}
        </h1>
        <p className="text-muted-foreground">{t("reconnecting.body")}</p>
      </div>

      <StatusPill tone="amber" aria-live="polite">
        <Loader2
          aria-hidden
          className="size-4 animate-spin motion-reduce:animate-none"
        />
        {t("reconnecting.pill")}
      </StatusPill>

      <Button size="lg" variant="outline" onClick={onTryNow} className="w-full">
        {/* No flip-rtl: a cycle glyph turns the same way in every language. */}
        <RotateCw aria-hidden className="size-4" />
        {t("reconnecting.tryNow")}
      </Button>
    </StageCard>
  );
}
