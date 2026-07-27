import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  DoorOpen,
  FastForward,
  LogOut,
  MessageCirclePlus,
  Unplug,
  Wifi,
  WifiOff,
} from "lucide-react";

import type { ChatDemo } from "@/components/chat/useChatDemo";
import { cn } from "@/lib/utils";

import { DemoControlsPanel, DemoToggle, EventButton } from "./DemoControls";

interface ChatDemoControlsProps {
  chat: ChatDemo;
  /** True when the panel sits on the purple student world. */
  onWorld?: boolean;
  revealNames: boolean;
  onRevealNamesChange: (value: boolean) => void;
  /** The demo's pretend blip in the student's OWN wifi, and its trigger. */
  selfBlipActive: boolean;
  onSelfBlip: () => void;
  /** Extra EventButtons after the built-in ones (pass them the same onWorld). */
  extraEvents?: ReactNode;
}

/**
 * The demo steering panel for a student-seat chat: the things that happen to a
 * real student on their own (connection drops, a peer ending the chat, the
 * teacher's name reveal) as visitor-friendly buttons. Used by the join flow's
 * chatting stage, which adds its own extras. Demo seats only — a real chat is
 * driven by the server and has no panel.
 *
 * `student`, not `common`, despite living under `demo/`: only the join flow
 * mounts this one. Its sibling `DemoControls` panel IS shared, which is why
 * that one's strings are in `common`.
 */
export function ChatDemoControls({
  chat,
  onWorld = false,
  revealNames,
  onRevealNamesChange,
  selfBlipActive,
  onSelfBlip,
  extraEvents,
}: ChatDemoControlsProps) {
  const { t } = useTranslation("student");
  const peerConnected = chat.peerState === "connected";

  return (
    <DemoControlsPanel onWorld={onWorld} caption={t("demo.chatCaption")}>
      <div className="space-y-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          {/* text-balance: on a phone this label wraps, and without it the
              last word sits alone on the second line. */}
          <span
            className={cn(
              "text-sm font-medium text-balance",
              onWorld ? "text-white/90" : "text-foreground"
            )}
          >
            {t("demo.reveal")}
          </span>
          <DemoToggle checked={revealNames} onChange={onRevealNamesChange} />
        </label>

        <div>
          <p
            className={cn(
              "mb-1.5 text-xs font-medium",
              onWorld ? "text-white/80" : "text-muted-foreground"
            )}
          >
            {t("demo.makeSomethingHappen")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <EventButton
              onWorld={onWorld}
              onClick={chat.disconnectPeer}
              disabled={!peerConnected || chat.isEnded}
              icon={<WifiOff className="size-4" />}
            >
              {t("demo.peerDrops")}
            </EventButton>
            <EventButton
              onWorld={onWorld}
              onClick={chat.reconnectPeer}
              disabled={peerConnected || chat.isEnded}
              icon={<Wifi className="size-4" />}
            >
              {t("demo.peerReturns")}
            </EventButton>
            <EventButton
              onWorld={onWorld}
              onClick={chat.skipReconnectWait}
              disabled={chat.reconnectSecondsLeft === null || chat.isEnded}
              // No flip-rtl: FastForward is a transport control.
              icon={<FastForward className="size-4" />}
            >
              {t("demo.skipWait")}
            </EventButton>
            <EventButton
              onWorld={onWorld}
              onClick={chat.nudgePeer}
              disabled={!peerConnected || chat.isEnded}
              icon={<MessageCirclePlus className="size-4" />}
            >
              {t("demo.makeThemTalk")}
            </EventButton>
            <EventButton
              onWorld={onWorld}
              onClick={chat.peerEndsChat}
              disabled={!peerConnected || chat.isEnded}
              // flip-rtl: a log-out arrow reads as "out this way".
              icon={<LogOut className="flip-rtl size-4" />}
            >
              {t("demo.peerEndsChat")}
            </EventButton>
            {/* Leaving is a group move — in a 1:1 a partner exiting ends the
                chat instead, so this stays disabled there. */}
            <EventButton
              onWorld={onWorld}
              onClick={chat.peerLeavesChat}
              disabled={chat.peers.length < 2 || chat.isEnded}
              icon={<DoorOpen className="flip-rtl size-4" />}
            >
              {t("demo.peerLeavesChat")}
            </EventButton>
            {/* The blip you come back from, next to the drop you don't. */}
            <EventButton
              onWorld={onWorld}
              onClick={onSelfBlip}
              disabled={selfBlipActive || chat.isEnded}
              icon={<WifiOff className="size-4" />}
            >
              {t("demo.wifiBlip")}
            </EventButton>
            <EventButton
              onWorld={onWorld}
              onClick={() => chat.endChat("self-timeout")}
              disabled={chat.isEnded}
              icon={<Unplug className="size-4" />}
            >
              {t("demo.youDropOff")}
            </EventButton>
            {extraEvents}
          </div>
        </div>
      </div>
    </DemoControlsPanel>
  );
}
