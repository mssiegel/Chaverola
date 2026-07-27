import { useTranslation } from "react-i18next";
import { Handshake, Pause, Play, Users, UserX, WifiOff } from "lucide-react";

import { DemoControlsPanel, EventButton } from "@/components/demo/DemoControls";
import type { ActivityChatScenarioKey } from "@/mockData";

/**
 * The lobby's demo steering: what a real teacher does from the host page —
 * matching this student into a chat (1:1 or a group of 3, so the group drop
 * behavior is demoable too) and removing them from the activity — plus a
 * wifi blip, so the reconnecting pill is demoable too. Permanent demo
 * furniture; on a real activity a backend pushes these instead. If the
 * visitor presses nothing, the auto-match fallback above pairs them anyway.
 */
export function LobbyDemoControls({
  onTeacherRemove,
  onMatch,
  classPaused,
  onClassPausedChange,
  wifiBlipActive,
  onWifiBlip,
}: {
  onTeacherRemove: () => void;
  onMatch: (scenarioKey: ActivityChatScenarioKey) => void;
  classPaused: boolean;
  onClassPausedChange: (paused: boolean) => void;
  wifiBlipActive: boolean;
  onWifiBlip: () => void;
}) {
  const { t } = useTranslation("student");
  return (
    <DemoControlsPanel onWorld caption={t("demo.lobbyCaption")}>
      <div className="grid grid-cols-2 gap-2">
        {/* Pairing stays enabled while paused on purpose: a teacher can
            still hand-pick matches mid-announcement, and the chat that
            opens is born frozen. */}
        <EventButton
          onWorld
          onClick={() => onMatch("duo")}
          icon={<Handshake className="size-4" />}
        >
          {t("demo.pairDuo")}
        </EventButton>
        <EventButton
          onWorld
          onClick={() => onMatch("group")}
          icon={<Users className="size-4" />}
        >
          {t("demo.pairGroup")}
        </EventButton>
        <EventButton
          onWorld
          onClick={() => onClassPausedChange(true)}
          disabled={classPaused}
          icon={<Pause className="size-4" />}
        >
          {t("demo.pause")}
        </EventButton>
        <EventButton
          onWorld
          onClick={() => onClassPausedChange(false)}
          disabled={!classPaused}
          // No flip-rtl: Play is a transport control, and those point the
          // same way on every remote in the world.
          icon={<Play className="size-4" />}
        >
          {t("demo.resume")}
        </EventButton>
        <EventButton
          onWorld
          onClick={onWifiBlip}
          disabled={wifiBlipActive}
          icon={<WifiOff className="size-4" />}
        >
          {t("demo.wifiBlip")}
        </EventButton>
        <EventButton
          onWorld
          onClick={onTeacherRemove}
          icon={<UserX className="size-4" />}
        >
          {t("demo.removeMe")}
        </EventButton>
      </div>
    </DemoControlsPanel>
  );
}
