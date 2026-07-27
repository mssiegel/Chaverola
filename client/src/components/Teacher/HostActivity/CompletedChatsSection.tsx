import { useTranslation } from "react-i18next";
import { Archive } from "lucide-react";

import { ChatCard } from "@/components/Teacher/ChatCard";
import type { HostedActivity } from "@/types/activity";

import { CollapsibleSection } from "./CollapsibleSection";
import { EmptyState } from "./EmptyState";
import type { HostedChat } from "./hostWorld";

interface CompletedChatsSectionProps {
  chats: HostedChat[];
  activity: HostedActivity;
}

/**
 * Wrapped-up chats stay on the page in the muted card variant (no End chat
 * button, expand/minimize kept). This is where the teacher rereads what was
 * said — the full transcript rides every card.
 */
export function CompletedChatsSection({
  chats,
  activity,
}: CompletedChatsSectionProps) {
  const { t } = useTranslation("teacher");
  return (
    <CollapsibleSection
      title={t("completed.title")}
      icon={Archive}
      accent="sky"
      count={chats.length}
      collapsedHint={
        chats.length === 0
          ? t("completed.hint.none")
          : t("completed.hint.count", { count: chats.length })
      }
    >
      {chats.length === 0 ? (
        <EmptyState className="py-6">
          <p className="text-sm text-muted-foreground">
            {t("completed.empty")}
          </p>
        </EmptyState>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {chats.map((chat) => (
            <ChatCard
              key={chat.id}
              // Frozen at chat start — an ended chat's labels are history,
              // never re-resolved against the roster (feature 18).
              participants={chat.participants}
              messages={chat.messages}
              isEnded
              // A real empty state: a chat can end before its first message
              // (the below-2 rule), and the blank box needs to say so.
              emptyHint={t("completed.emptyHint")}
              inactiveParticipantIds={new Set(chat.inactiveStudentIds)}
              roster={activity.characters}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
