import { useTranslation } from "react-i18next";
import { Pause } from "lucide-react";

/**
 * The pill that sits over a frozen conversation while the teacher has the
 * whole class paused. Same shape as PeerReconnectBanner — chat chrome, not a
 * message — and deliberately not a takeover: the transcript stays readable
 * while the student's attention goes to the front of the room.
 */
export function ChatPausedBanner() {
  const { t } = useTranslation("chat");
  return (
    <div
      className="mx-auto flex w-fit max-w-full animate-in items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 shadow-sm fade-in slide-in-from-top-2"
      role="status"
    >
      <Pause className="size-4" />
      <span className="min-w-0 text-center">{t("paused")}</span>
    </div>
  );
}
