import { Trans, useTranslation } from "react-i18next";
import { LogOut, MessagesSquare, Pause, Play, UsersRound } from "lucide-react";

import { ChatCard } from "@/components/Teacher/ChatCard";
import { Button } from "@/components/ui/button";
import type { HostedActivity } from "@/types/activity";
import type { Participant } from "@/types/chat";

import { CollapsibleSection } from "./CollapsibleSection";
import { EmptyState } from "./EmptyState";
import type { HostedChat } from "./hostWorld";

interface ChatsInProgressSectionProps {
  chats: HostedChat[];
  activity: HostedActivity;
  studentsChattingCount: number;
  waitingCount: number;
  onEndChat: (chatId: string) => void;
  onRequestEndAll: () => void;
  /** The activity-wide pause; pausing confirms, resuming is one tap. */
  paused: boolean;
  onRequestPauseAll: () => void;
  onResumeAll: () => void;
  onRequestRemoveParticipant: (
    chat: HostedChat,
    participant: Participant
  ) => void;
  onPairEveryone: () => void;
}

/**
 * The live chats, one teacher chat card each — last 5 lines, expandable,
 * per-chat end with its own confirmation, and a per-participant remove control
 * (quiet exit; see DECISIONS.md). "End all chats" is the round-closer and
 * confirms first.
 */
export function ChatsInProgressSection({
  chats,
  activity,
  studentsChattingCount,
  waitingCount,
  onEndChat,
  onRequestEndAll,
  paused,
  onRequestPauseAll,
  onResumeAll,
  onRequestRemoveParticipant,
  onPairEveryone,
}: ChatsInProgressSectionProps) {
  const { t } = useTranslation("teacher");
  return (
    <CollapsibleSection
      title={t("chats.title")}
      icon={MessagesSquare}
      accent="coral"
      count={chats.length}
      collapsedHint={
        chats.length === 0
          ? t("chats.hint.none")
          : paused
            ? t("chats.hint.paused", { count: studentsChattingCount })
            : t("chats.hint.active", { count: studentsChattingCount })
      }
    >
      {chats.length === 0 ? (
        // A paused room can empty out chat by chat (per-chat ends don't
        // clear the pause), so Resume must stay reachable here too.
        paused ? (
          <EmptyState className="py-8">
            <p className="font-semibold text-foreground">
              {t("chats.empty.paused.title")}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {t("chats.empty.paused.body")}
            </p>
            <Button className="mt-4" onClick={onResumeAll}>
              {/* No flip-rtl on Play: it's a transport control, and those
                  keep their shape in every language. */}
              <Play aria-hidden />
              {t("chats.resume")}
            </Button>
          </EmptyState>
        ) : (
          <EmptyState className="py-8">
            <p className="font-semibold text-foreground">
              {t("chats.empty.none.title")}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {t("chats.empty.none.body")}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={onPairEveryone}
              disabled={waitingCount < 2}
            >
              <UsersRound aria-hidden />
              {t("pairing.pairEveryone")}
            </Button>
          </EmptyState>
        )
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {/* <Trans> because the bold count sits mid-sentence and where
                in the sentence it lands is a word-order decision — Hebrew
                spells out one and two instead of printing a digit. */}
            <p className="text-sm text-muted-foreground">
              <Trans
                t={t}
                i18nKey="chats.chatting"
                count={studentsChattingCount}
                components={{
                  1: <span className="font-semibold text-foreground" />,
                }}
              />
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {paused ? (
                <Button size="sm" onClick={onResumeAll}>
                  <Play aria-hidden />
                  {t("chats.resume")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRequestPauseAll}
                  className="border-amber-400/60 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                >
                  <Pause aria-hidden />
                  {t("chats.pauseAll")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onRequestEndAll}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {/* flip-rtl: a door-and-arrow glyph reads as "out this way". */}
                <LogOut aria-hidden className="flip-rtl" />
                {t("chats.endAll")}
              </Button>
            </div>
          </div>
          {paused && (
            <div
              role="status"
              className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
            >
              <Pause aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{t("chats.pausedNotice")}</span>
            </div>
          )}
          <div className="grid items-start gap-4 md:grid-cols-2">
            {chats.map((chat) => (
              <ChatCard
                key={chat.id}
                // The chat's own frozen cast — labels were captured when
                // the chat started, so a roster edit never relabels a
                // running card (feature 18).
                participants={chat.participants}
                messages={chat.messages}
                isEnded={false}
                isPaused={paused}
                onEndChat={() => onEndChat(chat.id)}
                // A real empty state, not a feature notice: transcripts are
                // live, so a silent card just hasn't had its first message.
                // Unconditional — on a freshly paired demo chat it shows for
                // a beat until the first scripted line, and it's just as
                // true there.
                emptyHint={t("chats.emptyHint")}
                inactiveParticipantIds={new Set(chat.inactiveStudentIds)}
                reconnectingParticipantIds={
                  new Set(chat.reconnectingStudentIds ?? [])
                }
                roster={activity.characters}
                onRemoveParticipant={(participant) =>
                  onRequestRemoveParticipant(chat, participant)
                }
              />
            ))}
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}
