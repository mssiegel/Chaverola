import { useTranslation } from "react-i18next";

import { participantsById } from "@/lib/participants";
import { cn } from "@/lib/utils";
import type { ChatMessage, Participant } from "@/types/chat";

interface ConversationLinesProps {
  participants: Participant[];
  messages: ChatMessage[];
  /** Distinct color (CSS var) per character id in this room. */
  characterColors: Map<string, string>;
  /** Student view: marks this participant's lines with "(you)". */
  selfId?: string;
  /** Teacher view: prefix each line with the sender's real name. */
  showRealNames?: boolean;
  /** Student view: re-send a line whose echo never arrived. Without it a
   *  failed line still says so, it just can't offer the retry. */
  onRetryMessage?: (messageId: string) => void;
}

/**
 * The message lines themselves, shared by the student and teacher chatboxes.
 * Follows the shared chatbox conventions: `characterName: message` on one line
 * (the teacher view prepends `(realName) `), 0px between consecutive lines from
 * the same speaker and +4px when the speaker changes — a smooth, game-like
 * flow. Text size/leading is inherited so each view can set its own density.
 *
 * Up to three scripts can meet on one line — a Hebrew character, a Latin real
 * name, a message in either — separated by neutrals that belong to nobody. The
 * container keeps the UI's direction, so the "(you)" tag and the retry button
 * always sit at the same inline end; each authored field then isolates itself
 * in its own `<bdi>`, PARENTHESES INCLUDED, since those are exactly the
 * neutrals that would otherwise swap ends. One fix covers the student chatbox
 * and the teacher's chat card.
 */
export function ConversationLines({
  participants,
  messages,
  characterColors,
  selfId,
  showRealNames = false,
  onRetryMessage,
}: ConversationLinesProps) {
  const { t } = useTranslation("chat");
  const byId = participantsById(participants);

  return (
    <div className="flex flex-col">
      {messages.map((message, index) => {
        // System notices (e.g. a peer got dropped) sit centered between the
        // spoken lines and belong to no participant.
        if (message.kind === "notice") {
          return (
            <div
              key={message.id}
              className="my-2 text-center text-xs font-medium text-muted-foreground"
            >
              {message.text}
            </div>
          );
        }

        const sender = byId.get(message.senderId);
        if (!sender) return null;

        const prev = messages[index - 1];
        const speakerChanged = !prev || prev.senderId !== message.senderId;
        const marginTop = index === 0 ? 0 : speakerChanged ? 4 : 0;
        const isSelf = selfId != null && message.senderId === selfId;

        // The student's own unconfirmed send: dimmed while it's in flight,
        // and honest once the echo has clearly missed.
        const pending = message.delivery === "pending";
        const failed = message.delivery === "failed";

        return (
          <div
            key={message.id}
            style={{ marginTop }}
            className={cn(
              "[overflow-wrap:anywhere]",
              (pending || failed) && "opacity-60"
            )}
          >
            {showRealNames && (
              <>
                <bdi className="text-muted-foreground">
                  ({sender.realName})
                </bdi>{" "}
              </>
            )}
            <span
              className="font-semibold"
              style={{ color: characterColors.get(sender.character.id) }}
            >
              <bdi>{sender.character.name}</bdi>
              {isSelf && (
                <span className="ms-1 align-middle text-[11px] font-medium text-muted-foreground">
                  {t("header.you")}
                </span>
              )}
              <span className="text-foreground">: </span>
            </span>
            <bdi className="text-foreground/90">{message.text}</bdi>
            {/* Its own line under the message, not an inline tail: a thumb
                needs a real target, and 11px of underlined text between
                words is not one. */}
            {failed &&
              (onRetryMessage ? (
                <button
                  type="button"
                  // Same guard as the composer's emoji button, and here it
                  // is load-bearing: focusing this button blurs the
                  // textarea, the phone's world chrome un-collapses, and the
                  // whole feed slides ~72px down between press and release
                  // — so the release lands on another line and the tap never
                  // becomes a click. Keeping the caret put keeps the button
                  // still (and keeps the keyboard up for the next message).
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onRetryMessage(message.id)}
                  className="mt-0.5 flex items-center gap-1 rounded-md px-1 py-1.5 text-xs font-medium text-destructive underline underline-offset-2"
                >
                  {t("line.retry")}
                </button>
              ) : (
                <span className="mt-0.5 flex items-center gap-1 px-1 py-1.5 text-xs font-medium text-destructive">
                  {t("line.failed")}
                </span>
              ))}
          </div>
        );
      })}
    </div>
  );
}
