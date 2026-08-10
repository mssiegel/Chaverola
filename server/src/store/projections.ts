import type {
  Activity,
  ActivitySettings,
  Character,
  ChatLine,
  ChatPeer,
  ChatSnapshot,
  ChatTranscriptLine,
  HostedActivity,
  QueueEntry,
  RailNotice,
} from "@chaverola/shared";

import { activeMembers, eligibleWaiting } from "../live/matching";
import type { StoredChat, StoredChatLine } from "../live/matching";
import { timing } from "../live/timing";
import type { Seat } from "../live/seats";
import type { StoredActivity } from "./activityStore";

/*
  The only module allowed to turn stored records into response JSON. Every
  projection is an explicit field-by-field literal — never a spread, never a
  delete — so a new StoredActivity field is private until someone adds it
  here on purpose. The privacy tests pin the exact key lists.
*/

/** The student projection: no teacherEmail, no settings, no hostKey. */
export function toActivity(stored: StoredActivity): Activity {
  const activity: Activity = {
    joinCode: stored.joinCode,
    hostName: stored.hostName,
    characters: stored.characters,
    // The one field a student's own screen needs before they've typed
    // anything: it's what puts a Hebrew class on a Hebrew page.
    locale: stored.locale,
  };
  if (stored.studentInstructions !== undefined)
    activity.studentInstructions = stored.studentInstructions;
  return activity;
}

/** The student-visible details as activity:details-changed carries them
 *  (feature 17; the roster joined in 18) — this payload reaches student
 *  sockets, so teacherEmail, settings, and the hostKey must be structurally
 *  unable to ride along. The roster is the one thing here students already
 *  hold: toActivity hands them the same array at join. `null`, not an
 *  omitted key, for the instructions: a clear must be expressible on the
 *  wire (toActivity keeps its omit-when-undefined shape).
 *
 *  Deliberately NO `locale`: it is frozen at create, so a details edit can't
 *  move it — and this allowlist is what proves it never leaks into the
 *  details channel by accident. */
export function toActivityDetails(stored: StoredActivity): {
  characters: Character[];
  hostName: string;
  studentInstructions: string | null;
} {
  return {
    characters: stored.characters,
    hostName: stored.hostName,
    studentInstructions: stored.studentInstructions ?? null,
  };
}

/** The teacher projection: everything students see plus the teacher-only
 *  setup fields. The hostKey stays out — it lives only in the URL. */
export function toHostedActivity(stored: StoredActivity): HostedActivity {
  const activity: HostedActivity = {
    joinCode: stored.joinCode,
    hostName: stored.hostName,
    characters: stored.characters,
    locale: stored.locale,
    settings: stored.settings,
  };
  if (stored.studentInstructions !== undefined)
    activity.studentInstructions = stored.studentInstructions;
  if (stored.teacherEmail !== undefined) {
    activity.teacherEmail = stored.teacherEmail;
  }
  return activity;
}

/** The settings as they ride chats:snapshot (teacher-room only). Handing
 *  `stored.settings` to the emit would work today, but a field-by-field
 *  literal is what keeps a future server-only settings field private until
 *  someone adds it here on purpose. */
export function toActivitySettings(stored: StoredActivity): ActivitySettings {
  return {
    revealNames: stored.settings.revealNames,
    rematchWarning: stored.settings.rematchWarning,
    autoMatch: stored.settings.autoMatch,
    autoMatchSeconds: stored.settings.autoMatchSeconds,
    characterMode: stored.settings.characterMode,
  };
}

/** The rail notice as chats:snapshot carries it (teacher-room only). A
 *  field-by-field literal per variant, never a spread of the stored object —
 *  the same rule as every other projector here, and it matters more than
 *  usual now that the notice carries real student names. The names array is
 *  copied so a later mutation of the stored notice can't reach a payload
 *  already emitted. */
export function toRailNotice(stored: StoredActivity): RailNotice | null {
  const notice = stored.railNotice;
  if (notice === null) return null;
  if (notice.kind === "stuckInLine") {
    return { kind: "stuckInLine", names: [...notice.names] };
  }
  return {
    kind: "tooFewCharacters",
    characterCount: notice.characterCount,
    studentCount: notice.studentCount,
  };
}

/** Waiting seats' previous partners, for the teacher's rematch heads-up:
 *  `lastPartners` scoped to the currently-selectable (eligibleWaiting) pool,
 *  so the payload never carries departed students' stale keys. Teacher-room
 *  only. */
export function toRematchPartners(
  activity: StoredActivity
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const seat of eligibleWaiting(activity)) {
    const partners = activity.lastPartners[seat.studentId];
    if (partners !== undefined) result[seat.studentId] = partners;
  }
  return result;
}

/** A drop reads "reconnecting" only past the broadcast delay — a refresh
 *  reconnects in ~1–2s and shouldn't flash the row (or dim a card member).
 *  The delay gates only this teacher-facing state, never the grace clock.
 *  timing.*, not the shared constants: countdown payloads must track the
 *  actual (possibly time-scaled) reap clock or they desync. */
function isReconnecting(seat: Seat, now: number): boolean {
  return (
    !seat.connected &&
    seat.disconnectedAt !== undefined &&
    now - seat.disconnectedAt >= timing.broadcastDelayMs
  );
}

/** Seconds left in a dropped seat's reconnect window — the student
 *  countdown's seed, computed at emit; the client ticks between events.
 *  Callers only ask about seats that are actually mid-drop (the broadcast
 *  timer's own seat, or one isReconnecting just passed), so disconnectedAt
 *  is set (the fallback keeps the helper total). */
export function graceSecondsLeft(seat: Seat, now: number): number {
  const deadline = (seat.disconnectedAt ?? now) + timing.graceMs;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** The teacher's queue row. NEVER the token. `clockNow` is the wait
 *  clock's now — a paused activity passes its freeze anchor so waitSeconds
 *  holds, while `connection` keeps real time (a mid-pause drop must still
 *  read "reconnecting": its grace clock runs through the pause). */
export function toQueueEntry(
  seat: Seat,
  now: number,
  clockNow: number = now
): QueueEntry {
  return {
    id: seat.studentId,
    name: seat.name,
    waitSeconds: Math.max(0, Math.floor((clockNow - seat.joinedAt) / 1000)),
    connection: isReconnecting(seat, now) ? "reconnecting" : "connected",
  };
}

/** The student's lobby:welcome payload: the resume pair, plus the
 *  activity-wide pause at connect time (a refresh mid-pause stays frozen —
 *  the client keeps `paused` out of the persisted session) and whether a
 *  teacher device is connected. `teacherPresent` is passed in rather than
 *  read off the record: it lives in the socket layer's teacher refcount, and
 *  this module stays pure. */
export function toLobbyWelcome(
  seat: Seat,
  activity: StoredActivity,
  teacherPresent: boolean
): {
  studentId: string;
  token: string;
  paused: boolean;
  teacherPresent: boolean;
} {
  return {
    studentId: seat.studentId,
    token: seat.token,
    paused: activity.pausedAt !== null,
    teacherPresent,
  };
}

/** The teacher's chat card (room lobby:${joinCode}) — real names are fine
 *  here; never a token. `character` is the member's frozen snapshot,
 *  captured at chat start — never re-resolved against the roster, so a
 *  roster edit relabels nothing already on a card.
 *
 *  `transcript: "omit"` is the card WITHOUT its lines — what a seat-level
 *  broadcast sends for an already-ended chat, whose transcript is immutable
 *  and already on the teacher's page (absent means "unchanged" on the wire).
 *  The lines are ASSIGNED onto the literal rather than spread in, so the
 *  field list below stays the whole allowlist either way. */
export function toChatSnapshot(
  chat: StoredChat,
  activity: StoredActivity,
  now: number,
  transcript: "include" | "omit" = "include"
): ChatSnapshot {
  const card: ChatSnapshot = {
    id: chat.id,
    participants: chat.members.map((member) => ({
      id: member.studentId,
      name: member.name,
      character: member.character,
    })),
    inactiveStudentIds: [...chat.inactiveStudentIds],
    reconnectingStudentIds: activeMembers(chat)
      .filter((member) => {
        const seat = activity.seats.byId.get(member.studentId);
        return seat !== undefined && isReconnecting(seat, now);
      })
      .map((member) => member.studentId),
    status: chat.status,
    endReason: chat.endReason,
  };
  if (transcript === "include") {
    card.messages = chat.lines.map((line) => toChatTranscriptLine(chat, line));
  }
  return card;
}

/** The teacher projection of a transcript line — real name attached, same
 *  teacher-only surface as ChatSnapshot. The second, richer view of the
 *  exact stored line toChatLine projects for students. */
export function toChatTranscriptLine(
  chat: StoredChat,
  line: StoredChatLine
): ChatTranscriptLine {
  // appendLine refuses a non-member, so the find can't miss.
  const sender = chat.members.find((m) => m.studentId === line.studentId)!;
  return {
    id: line.id,
    studentId: line.studentId,
    name: sender.name,
    characterId: sender.characterId,
    text: line.text,
    sentAt: line.sentAt,
  };
}

/** The student wire carries characterIds ONLY — never names, never peer
 *  studentIds (the load-bearing privacy pin). */
function toChatPeers(chat: StoredChat, studentId: string): ChatPeer[] {
  return activeMembers(chat)
    .filter((member) => member.studentId !== studentId)
    .map((member) => ({ characterId: member.characterId }));
}

/** Everyone ever in the room minus self, seat order — chat.members, NOT
 *  activeMembers: departed members stay in it forever, which is what makes
 *  this the refresh-invariant roster a resumed client rebuilds lines and
 *  colors from. Additive to `peers`, never a replacement. */
function toChatEverPeers(chat: StoredChat, studentId: string): ChatPeer[] {
  return chat.members
    .filter((member) => member.studentId !== studentId)
    .map((member) => ({ characterId: member.characterId }));
}

/** The student projection of a transcript line: characterId, never the
 *  sender's studentId or name. */
export function toChatLine(chat: StoredChat, line: StoredChatLine): ChatLine {
  // appendLine refuses a non-member, so the find can't miss.
  const sender = chat.members.find((m) => m.studentId === line.studentId)!;
  return {
    id: line.id,
    characterId: sender.characterId,
    text: line.text,
    sentAt: line.sentAt,
  };
}

export function toChatStarted(
  chat: StoredChat,
  activity: StoredActivity,
  studentId: string,
  now: number
): {
  chatId: string;
  selfCharacterId: string;
  cast: Character[];
  peers: ChatPeer[];
  everPeers: ChatPeer[];
  lines: ChatLine[];
  reconnectingPeers: { characterId: string; secondsLeft: number }[];
} {
  // Callers only project a chat for its own members — the find can't miss.
  // Deliberately `members`, not activeMembers: the reaped-returner replay
  // projects through an INACTIVE member of a possibly-ended chat.
  const self = chat.members.find((m) => m.studentId === studentId)!;
  return {
    chatId: chat.id,
    selfCharacterId: self.characterId,
    // The chat's frozen cast — every member's captured character (each
    // dealt once, so already distinct). The client resolves every in-chat
    // label against this, never the mutable lobby roster.
    cast: chat.members.map((member) => member.character),
    peers: toChatPeers(chat, studentId),
    everPeers: toChatEverPeers(chat, studentId),
    lines: chat.lines.map((line) => toChatLine(chat, line)),
    // The offline backlog: peers mid-grace at delivery, on the same 4s
    // gate as chat:peer-connection (a fresh drop reads connected until its
    // own broadcast timer fires). characterId + seconds only — never the
    // seat (the entry pin in projections.test.ts).
    reconnectingPeers: activeMembers(chat).flatMap((member) => {
      if (member.studentId === studentId) return [];
      const seat = activity.seats.byId.get(member.studentId);
      if (!seat || !isReconnecting(seat, now)) return [];
      return [
        {
          characterId: member.characterId,
          secondsLeft: graceSecondsLeft(seat, now),
        },
      ];
    }),
  };
}

/** The student typing signal: characterId-only, the same load-bearing pin
 *  as ChatPeer. Ephemeral — never stored, never in a resume backlog. */
export function toPeerTyping(
  chat: StoredChat,
  studentId: string
): { chatId: string; characterId: string } {
  // The relay only calls this after findActiveChatOf, so the find can't miss.
  const typist = chat.members.find((m) => m.studentId === studentId)!;
  return {
    chatId: chat.id,
    characterId: typist.characterId,
  };
}

/** The student peer-connection signal: characterId-only, the same
 *  load-bearing pin as ChatPeer and toPeerTyping. */
export function toPeerConnection(
  chat: StoredChat,
  studentId: string,
  state: "dropped" | "returned",
  secondsLeft: number | null
): {
  chatId: string;
  characterId: string;
  state: "dropped" | "returned";
  secondsLeft: number | null;
} {
  // Callers resolve the chat via findActiveChatOf, so the find can't miss.
  const member = chat.members.find((m) => m.studentId === studentId)!;
  return {
    chatId: chat.id,
    characterId: member.characterId,
    state,
    secondsLeft,
  };
}

export function toChatUpdate(
  chat: StoredChat,
  studentId: string
): { chatId: string; peers: ChatPeer[] } {
  return {
    chatId: chat.id,
    peers: toChatPeers(chat, studentId),
  };
}

export function toChatEnded(
  chat: StoredChat,
  activity: StoredActivity,
  studentId: string
): {
  reason: "teacher" | "student" | "peer" | "peer-timeout";
  endedBy?: string;
  reveal?: { characterId: string; name: string }[];
} {
  // The reason is PER RECIPIENT, decided here because this is the one place
  // that already knows who's listening (it's how the reveal excludes self).
  // The student who ended it hears "student" — "you ended this chat" — while
  // everyone else hears the stored reason. Wire-only, exactly like
  // "self-timeout": the store keeps the room's truth ("peer" plus who), so
  // the wrappingUp resume re-delivery lands right for both seats for free.
  // The fallback keeps the projector total if it's ever called on a
  // not-yet-ended chat.
  const endedByYou = chat.endedBy !== null && chat.endedBy === studentId;
  const reason = endedByYou ? "student" : (chat.endReason ?? "teacher");
  // A "peer" ending names the leaver — as a characterId the survivor
  // already knows from chat:started, never a studentId, never a name (the
  // ChatPeer pin). The key is absent entirely on every other reason, the
  // ender's own copy included: they don't need to be told who they are.
  const endedBy = endedByYou
    ? undefined
    : chat.members.find((member) => member.studentId === chat.endedBy)
        ?.characterId;
  const base: { reason: typeof reason; endedBy?: string } =
    endedBy === undefined ? { reason } : { reason, endedBy };
  // The name reveal — the ONE sanctioned exception to the characterIds-only
  // student wire. Names leave the server only when the teacher's revealNames
  // setting is on at end time, and only the OTHER members' (the recipient
  // knows their own). Omitted entirely when off, so a real name never reaches
  // a peer unasked-for — pinned by projections.test.ts.
  if (!activity.settings.revealNames) {
    return base;
  }
  return {
    ...base,
    reveal: chat.members
      .filter((member) => member.studentId !== studentId)
      .map((member) => ({
        characterId: member.characterId,
        name: member.name,
      })),
  };
}
