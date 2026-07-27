import type { Catalog } from "../../types";

/**
 * Student surfaces: the join flow, the lobby, and the chat-ended screens.
 * Registered from `i18n/ns/student.ts`, so it rides that page's chunk.
 *
 * Only the page-meta keys so far — the rest lands with the student slice.
 */
export const student = {
  "title.join": "Join an Activity",
  "title.reconnecting": "Reconnecting",
  "title.lobby": "Waiting Lobby",
  "title.chatting": "Chatting",
  "title.ended": "Chat Ended",
  "title.activityGone": "Activity Ended",

  "join.meta.description":
    "Got a code from your teacher? Type it in here and join the activity.",
} as const satisfies Catalog;

export type StudentCatalog = typeof student;
