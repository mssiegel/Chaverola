import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

/**
 * The pill that says the drop is yours, not your partner's. Same chrome as
 * ChatPausedBanner and PeerReconnectBanner, and deliberately without a
 * countdown: the server's grace clock is on the far side of the connection
 * we just lost, and a wrong number is worse than no number (see
 * docs/decisions/chat-behavior.md). Copy matches the lobby's pill — one
 * sentence for the same event, wherever the student is standing.
 */
export function SelfReconnectBanner() {
  const { t } = useTranslation("chat");
  return (
    <div
      className="mx-auto flex w-fit max-w-full animate-in items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 shadow-sm fade-in slide-in-from-top-2"
      role="status"
    >
      <Loader2
        aria-hidden
        className="size-4 animate-spin motion-reduce:animate-none"
      />
      <span className="min-w-0 text-center">{t("self.reconnecting")}</span>
    </div>
  );
}
