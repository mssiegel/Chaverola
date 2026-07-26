import type { ChatSnapshot, ChatTranscriptLine } from "@chaverola/shared";

import type { ChatMessage } from "@/types/chat";

import type { HostedChat } from "./hostWorld";

/*
  Server truth → the host page's chat cards. Pure, so the merge below is
  testable on its own; `useHostActivityLive.ts` is the only caller. Types only
  from hostWorld.ts — same tripwire as the live engine.
*/

/** One transcript line → the card's message shape. `senderId` is the STUDENT
 *  id — what toHostedChat keys participants by — and `ChatSnapshot.participants`
 *  is everyone ever in the room, so a removed student's lines still resolve
 *  instead of silently disappearing from the card. */
export function toTranscriptMessage(line: ChatTranscriptLine): ChatMessage {
  return {
    id: line.id,
    senderId: line.studentId,
    text: line.text,
  };
}

/** One snapshot → the chat shape the dashboard renders. The wire's `character`
 *  is the chat's frozen snapshot (captured at chat start), and the cards render
 *  it as-is — a roster edit never relabels a card. */
function toHostedChat(snapshot: ChatSnapshot): HostedChat {
  return {
    id: snapshot.id,
    participants: snapshot.participants.map((p) => ({
      id: p.id,
      realName: p.name,
      character: p.character,
    })),
    inactiveStudentIds: snapshot.inactiveStudentIds,
    messages: (snapshot.messages ?? []).map(toTranscriptMessage),
    status: snapshot.status,
    endReason: snapshot.endReason,
    reconnectingStudentIds: snapshot.reconnectingStudentIds,
  };
}

/**
 * A chats:snapshot folded onto what the page already shows.
 *
 * A chat whose `messages` is absent keeps the transcript we're already holding
 * — that's the wire's "unchanged since your last full snapshot", which is how
 * ended chats stop riding every seat-level broadcast. Every other field comes
 * from the incoming snapshot: status, endReason and reconnecting ids have to
 * stay live.
 *
 * This maps the payload rather than unioning with `prev`, so a chat the payload
 * no longer lists disappears, exactly as the old wholesale replace did.
 */
export function mergeHostedChats(
  prev: readonly HostedChat[],
  incoming: readonly ChatSnapshot[]
): HostedChat[] {
  return incoming.map((snapshot) => {
    const chat = toHostedChat(snapshot);
    if (snapshot.messages !== undefined) return chat;
    // A chat we've never seen arriving without its lines shouldn't crash or
    // vanish — render it empty; the next full snapshot fills it in.
    const held = prev.find((c) => c.id === snapshot.id);
    return { ...chat, messages: held?.messages ?? [] };
  });
}
