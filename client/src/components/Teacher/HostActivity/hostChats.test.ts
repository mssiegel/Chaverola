import { describe, expect, it } from "vitest";

import type { ChatSnapshot, ChatTranscriptLine } from "@chaverola/shared";

import { mergeHostedChats } from "./hostChats";
import type { HostedChat } from "./hostWorld";

function line(id: string, text: string): ChatTranscriptLine {
  return {
    id,
    studentId: "student-1",
    name: "Noa",
    characterId: "caesar",
    text,
    sentAt: 0,
  };
}

/** A snapshot with the transcript present; omit `messages` for the slim shape
 *  a seat-level broadcast sends once the server stops repeating itself. */
function snapshot(
  id: string,
  overrides: Partial<ChatSnapshot> = {}
): ChatSnapshot {
  return {
    id,
    participants: [
      {
        id: "student-1",
        name: "Noa",
        character: { id: "caesar", name: "Caesar" },
      },
      {
        id: "student-2",
        name: "Ari",
        character: { id: "brutus", name: "Brutus" },
      },
    ],
    inactiveStudentIds: [],
    reconnectingStudentIds: [],
    messages: [line("m1", "Et tu?")],
    status: "active",
    endReason: null,
    ...overrides,
  };
}

describe("mergeHostedChats", () => {
  it("takes the payload's transcript when it carries one, and its live fields always", () => {
    const prev = mergeHostedChats([], [snapshot("chat-1")]);
    const next = mergeHostedChats(prev, [
      snapshot("chat-1", {
        messages: [line("m1", "Et tu?"), line("m2", "Brute?")],
        status: "ended",
        endReason: "teacher",
        reconnectingStudentIds: ["student-2"],
      }),
    ]);
    expect(next[0]!.messages.map((m) => m.text)).toEqual(["Et tu?", "Brute?"]);
    expect(next[0]!.status).toBe("ended");
    expect(next[0]!.endReason).toBe("teacher");
    expect(next[0]!.reconnectingStudentIds).toEqual(["student-2"]);
  });

  it("keeps the transcript it holds when the payload omits messages", () => {
    const prev = mergeHostedChats([], [snapshot("chat-1")]);
    // The slim shape: an ended chat riding a seat-level broadcast.
    const slim: ChatSnapshot = {
      ...snapshot("chat-1", { status: "ended", endReason: "teacher" }),
      messages: undefined,
    };
    const next = mergeHostedChats(prev, [slim]);
    expect(next[0]!.messages.map((m) => m.text)).toEqual(["Et tu?"]);
    expect(next[0]!.status).toBe("ended");
  });

  it("renders a never-seen slim chat empty, and drops chats the payload no longer lists", () => {
    const prev: HostedChat[] = mergeHostedChats([], [snapshot("chat-1")]);
    const next = mergeHostedChats(prev, [
      { ...snapshot("chat-2"), messages: undefined },
    ]);
    expect(next).toHaveLength(1);
    expect(next[0]!.id).toBe("chat-2");
    expect(next[0]!.messages).toEqual([]);
  });
});
