import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DoorOpen, LogOut } from "lucide-react";

import { ChatFrame } from "@/components/chat/ChatFrame";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { Conversation } from "@/components/chat/Conversation";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { selfFirstCharacterColors } from "@/lib/characterColor";
import type { ChatRoomState } from "@/types/chat";

import { ChatEndedSection } from "./ChatEndedSection";

export interface ChatboxProps {
  /** The room, exactly as the engine reports it. */
  chat: ChatRoomState;
  /** Teacher's "reveal names" setting (mocked in the demo). */
  revealNames: boolean;
  onSend: (text: string) => void;
  /** A keystroke happened in the composer — live rooms turn it into
   *  chat:typing heartbeats. Demo callers pass nothing, so the demo
   *  engines never see it. */
  onTyping?: () => void;
  /** Re-send one of the student's own lines whose echo never arrived. Live
   *  rooms only: the demo echoes locally, so nothing there can fail. */
  onRetryMessage?: (messageId: string) => void;
  /** Seconds until rate-limit-held messages go out (null: nothing waiting). */
  holdSeconds?: number | null;
  onEndChat: () => void;
  onLeaveChat: () => void;
  onBackToLobby: () => void;
  /**
   * Optional external control of the exit confirm dialog — the join
   * flow's back-swipe guard opens it from outside. Pass both or neither;
   * when absent the dialog manages itself.
   */
  endConfirmOpen?: boolean;
  onEndConfirmOpenChange?: (open: boolean) => void;
  /**
   * Override the ended screen's names-stay-secret line (shown when
   * revealNames is off). Live rooms pass a neutral one: the reveal doesn't
   * exist yet, so the default's "your teacher hasn't revealed them" would
   * promise a feature that isn't there.
   */
  endedSecretLine?: string;
  /** The whole activity ended, not just this chat — the ended screen swaps
   *  its rematch CTA for one that closes out. */
  activityEnded?: boolean;
  /** Sending drops focus on phones, closing the keyboard — the demo's way of
   *  handing back the steering panel its own keyboard hides. */
  releaseKeyboardOnSend?: boolean;
}

/**
 * The student chatbox shell. Presentational: it's driven entirely by props —
 * the room state as one plain-data object (ChatRoomState) plus the actions
 * its parent mediates — so the same component can later be fed by a real
 * data source. Follows the shared layout: header → conversation → bottom
 * section (message input, or the chat-ended panel once the chat is over).
 */
export function Chatbox({
  chat,
  revealNames,
  onSend,
  onTyping,
  onRetryMessage,
  holdSeconds,
  onEndChat,
  onLeaveChat,
  onBackToLobby,
  endConfirmOpen,
  onEndConfirmOpenChange,
  endedSecretLine,
  activityEnded,
  releaseKeyboardOnSend,
}: ChatboxProps) {
  // `common` alongside `student`: the 1:1 exit asks the same question the
  // teacher's card does, so it reuses `common`'s endChat.* rather than
  // keeping a second copy of the sentence.
  const { t } = useTranslation(["student", "common"]);
  const {
    self,
    peers,
    participants,
    messages,
    typingPeerId,
    peerState,
    offlinePeerId,
    reconnectSecondsLeft,
    isEnded,
    isPaused,
    selfConnection,
    endReason,
    endedByPeerId,
  } = chat;
  const [internalConfirmOpen, setInternalConfirmOpen] = useState(false);
  const confirmOpen = endConfirmOpen ?? internalConfirmOpen;
  const setConfirmOpen = onEndConfirmOpenChange ?? setInternalConfirmOpen;

  // Color per speaker, assigned by order — "you" are always green. Shared by
  // the feed + the end-of-chat reveal.
  const characterColors = selfFirstCharacterColors(self, participants);

  // The reveal lists everyone the student actually chatted with, including a
  // group member who got dropped along the way — their lines are still in the
  // transcript, so their mystery deserves an answer too.
  const everPeers = participants.filter((p) => p.id !== self.id);

  // With 3+ people still in the room your exit is Leave — the chat goes on
  // without you. With 2, ending is the only exit: a chat without partners is
  // dead air (see DECISIONS.md). Derived live from the room, so the header
  // button and an already-open dialog swap together as a group dwindles.
  const isGroupExit = peers.length > 1;

  // flip-rtl on both: a door glyph and a log-out arrow each read as "out
  // this way", so they follow the reading direction.
  const exitConfirm = isGroupExit
    ? {
        title: t("exit.leaveTitle"),
        description: t("exit.leaveBody"),
        confirmLabel: (
          <>
            <DoorOpen className="flip-rtl size-4" />
            {t("exit.leave")}
          </>
        ),
      }
    : {
        title: t("common:endChat.title"),
        description: t("exit.endBody"),
        confirmLabel: (
          <>
            <LogOut className="flip-rtl size-4" />
            {t("common:endChat.confirm")}
          </>
        ),
      };

  const handleConfirmExit = () => {
    setConfirmOpen(false);
    // Decided at confirm time from the room's current size — never stale.
    if (isGroupExit) onLeaveChat();
    else onEndChat();
  };

  return (
    // flex-1, not h-full: on phones the stage wrapper's height comes from
    // flex growth, which a percentage can't resolve against — the frame
    // must stretch as a flex item of the wrapper's column.
    <ChatFrame className="min-h-0 flex-1">
      <ChatHeader
        self={self}
        peers={peers}
        characterColors={characterColors}
        actions={
          !isEnded && (
            <div className="flex shrink-0 items-center gap-2">
              {/* On narrow widths the pill compresses to icon + "End". */}
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                aria-label={isGroupExit ? t("exit.leave") : t("exit.end")}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25 active:scale-[0.98]"
              >
                {/* flip-rtl: both glyphs mean "out this way". */}
                {isGroupExit ? (
                  <>
                    <DoorOpen className="flip-rtl size-4" />
                    <span>{t("exit.leave")}</span>
                  </>
                ) : (
                  <>
                    <LogOut className="flip-rtl size-4" />
                    <span className="max-sm:hidden">{t("exit.end")}</span>
                    <span aria-hidden className="sm:hidden">
                      {t("exit.endShort")}
                    </span>
                  </>
                )}
              </button>
            </div>
          )
        }
      />

      {/* Conversation */}
      <Conversation
        participants={participants}
        selfId={self.id}
        messages={messages}
        typingPeerId={isEnded ? null : typingPeerId}
        peerState={isEnded ? "connected" : peerState}
        offlinePeerId={offlinePeerId}
        reconnectSecondsLeft={reconnectSecondsLeft}
        // The ended screen supersedes the pause banner: isEnded wins.
        isPaused={isPaused && !isEnded}
        selfConnection={isEnded ? "connected" : selfConnection}
        characterColors={characterColors}
        onRetryMessage={onRetryMessage}
      />

      {/* Bottom section */}
      {isEnded ? (
        <ChatEndedSection
          peers={everPeers}
          revealNames={revealNames}
          characterColors={characterColors}
          endReason={endReason}
          endedByPeerId={endedByPeerId}
          endedInGroup={peers.length > 1}
          secretLine={endedSecretLine}
          activityEnded={activityEnded}
          onBackToLobby={onBackToLobby}
        />
      ) : (
        <MessageComposer
          onSend={onSend}
          onTyping={onTyping}
          selfCharacterLabel={self.character.name}
          locked={isPaused}
          holdSeconds={holdSeconds}
          releaseKeyboardOnSend={releaseKeyboardOnSend}
        />
      )}

      {/* Gated on !isEnded so a chat ending underneath the dialog (timer, a
          peer ending it) snaps it shut over the ended screen. */}
      <ConfirmDialog
        open={confirmOpen && !isEnded}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmExit}
        title={exitConfirm.title}
        description={exitConfirm.description}
        confirmLabel={exitConfirm.confirmLabel}
        cancelLabel={t("exit.keepChatting")}
      />
    </ChatFrame>
  );
}
