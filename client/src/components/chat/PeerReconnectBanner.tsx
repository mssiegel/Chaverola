import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Wifi, WifiOff } from "lucide-react";

import { LOBBY_GRACE_SECONDS } from "@chaverola/shared";

import { formatSecondsAsClock } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { PeerConnectionState } from "@/types/chat";

interface PeerReconnectBannerProps {
  peerState: PeerConnectionState;
  /** Character name of the peer whose connection changed. */
  peerName: string | null;
  /**
   * Seconds the disconnected peer has left to come back, or null when no
   * reconnect window is running. Shown as a live m:ss countdown.
   */
  reconnectSecondsLeft?: number | null;
}

/**
 * A slide-in banner that surfaces peer connection changes: while a peer is
 * out it counts down their reconnect window live, and their return gets a
 * brief green flash. Hidden while everyone is connected.
 */
export function PeerReconnectBanner({
  peerState,
  peerName,
  reconnectSecondsLeft = null,
}: PeerReconnectBannerProps) {
  const { t } = useTranslation("chat");
  if (peerState === "connected") return null;

  const name = peerName ?? t("peer.fallback");

  const config: Record<
    Exclude<PeerConnectionState, "connected">,
    { icon: ReactNode; text: ReactNode; className: string }
  > = {
    disconnected: {
      icon: <WifiOff className="size-4" />,
      text:
        reconnectSecondsLeft === null ? (
          t("peer.lost", { name })
        ) : (
          <>
            {t("peer.lost", { name })}{" "}
            {/* The ticking clock stays out of the live region so screen
                readers hear the announcement once, not sixty times a minute.
                <Trans> rather than a prefix plus a suffix because Hebrew puts
                words on BOTH sides of the clock; the <bdi> keeps "1:43" from
                laying out as "43:1" on an RTL line. */}
            <span aria-hidden>
              <Trans
                t={t}
                i18nKey="peer.clock"
                values={{ clock: formatSecondsAsClock(reconnectSecondsLeft) }}
                components={{ 1: <bdi className="tabular-nums" /> }}
              />
            </span>
            <span className="sr-only">
              {t("peer.srWindow", { minutes: LOBBY_GRACE_SECONDS / 60 })}
            </span>
          </>
        ),
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    reconnected: {
      icon: <Wifi className="size-4" />,
      text: t("peer.back", { name }),
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  };
  const { icon, text, className } = config[peerState];

  return (
    <div
      className={cn(
        "mx-auto flex w-fit max-w-full animate-in items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm fade-in slide-in-from-top-2",
        className
      )}
      role="status"
    >
      {icon}
      {/* Wraps rather than truncates: clipping would eat the countdown on
          narrow phones ("Caesar's ghost 👻 lost connection… 2:00 to co…"). */}
      <span className="min-w-0 text-center">{text}</span>
    </div>
  );
}
