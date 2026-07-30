import { useTranslation } from "react-i18next";
import { Pause } from "lucide-react";

import { ChatBanner } from "./ChatBanner";

/**
 * The pill that sits over a frozen conversation while the teacher has the
 * whole class paused. Deliberately not a takeover: the transcript stays
 * readable while the student's attention goes to the front of the room.
 */
export function ChatPausedBanner() {
  const { t } = useTranslation("chat");
  return (
    <ChatBanner icon={<Pause className="size-4" />}>{t("paused")}</ChatBanner>
  );
}
