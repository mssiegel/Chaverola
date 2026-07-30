import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { ChatBanner } from "./ChatBanner";

/**
 * The pill that says the drop is yours, not your partner's. Deliberately
 * without a countdown: the server's grace clock is on the far side of the
 * connection we just lost, and a wrong number is worse than no number (see
 * docs/decisions/chat-behavior.md). Copy matches the lobby's pill — one
 * sentence for the same event, wherever the student is standing.
 */
export function SelfReconnectBanner() {
  const { t } = useTranslation("chat");
  return (
    <ChatBanner
      icon={
        <Loader2
          aria-hidden
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      }
    >
      {t("self.reconnecting")}
    </ChatBanner>
  );
}
