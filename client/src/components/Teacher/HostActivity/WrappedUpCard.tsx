import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Loader2 } from "lucide-react";

import { LocaleLink } from "@/components/layout/LocaleLink";
import { Button } from "@/components/ui/button";

import type { HostEnded } from "./hostEngine";

/**
 * The screen a teacher lands on after ending the activity. It replaces the live
 * dashboard (the class is over) and reports the transcript email's fate — sent,
 * failed, or nothing to send — with the completed chats still readable beneath
 * it (rendered by the dashboard) so a failed send is never a dead end. Same
 * centered tile + title + body shape as the student's ChatEndedSection.
 *
 * The tiles stay in code: they're art, not copy, and no locale should be able
 * to change which emoji reports a failed send.
 */
function wrappedCopy(
  t: TFunction<"teacher">,
  ended: HostEnded,
  demo: boolean
): { tile: string; title: string; body: string } {
  const { to, state } = ended;

  // The demo never sends anything, whatever a demo teacher typed into the
  // email field. Its card says so plainly and never names an address, so it
  // can't read as a real send.
  if (demo) {
    return {
      tile: "🎬",
      title: t("wrapped.demo.title"),
      body: t("wrapped.demo.body"),
    };
  }

  if (state === "sending") {
    return {
      tile: "",
      title: t("wrapped.sending.title"),
      body: t("wrapped.sending.body", { to }),
    };
  }

  if (state === "unconfirmed") {
    return {
      tile: "📮",
      title: t("wrapped.unconfirmed.title"),
      body: t("wrapped.unconfirmed.body", { to }),
    };
  }

  if (state === "sent") {
    return {
      tile: "📬",
      title: t("wrapped.sent.title", { to }),
      body: t("wrapped.sent.body"),
    };
  }

  if (state === "failed") {
    return {
      tile: "⚠️",
      title: t("wrapped.failed.title"),
      body: t("wrapped.failed.body", { to }),
    };
  }

  // "empty": nothing was sent — no address, or no chat had a message.
  return {
    tile: "📭",
    title: t("wrapped.empty.title"),
    body: to ? t("wrapped.empty.noMessages") : t("wrapped.empty.noEmail"),
  };
}

export function WrappedUpCard({
  ended,
  demo = false,
}: {
  ended: HostEnded;
  demo?: boolean;
}) {
  const { t } = useTranslation("teacher");
  const copy = wrappedCopy(t, ended, demo);
  const sending = ended.state === "sending";

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-brand-grape-soft/60 to-card px-4 py-8 text-center shadow-sm">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-3xl">
          {sending ? (
            <Loader2
              aria-hidden
              className="size-7 animate-spin text-brand-grape motion-reduce:animate-none"
            />
          ) : (
            <span aria-hidden>{copy.tile}</span>
          )}
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            {copy.title}
          </h2>
          <p className="text-sm text-muted-foreground">{copy.body}</p>
        </div>

        {!sending && (
          <Button asChild size="lg" className="mt-1">
            <LocaleLink to="/activity/create">
              {t("host.newActivity")}
            </LocaleLink>
          </Button>
        )}
      </div>
    </div>
  );
}
