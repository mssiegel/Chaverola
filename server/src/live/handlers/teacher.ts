import {
  activityDetailsUpdateSchema,
  activitySettingsSchema,
  teacherEmailUpdateSchema,
} from "../../schemas/activity";
import { sendTranscriptEmail } from "../../email/sendTranscript";
import { getByHostKey, removeActivity } from "../../store/activityStore";
import { armAutoMatch, clearAutoMatch, releaseAutoMatch } from "../autoMatch";
import { onTeacherConnected, onTeacherDisconnected } from "../teacherPresence";
import { armTranscriptFallback } from "../transcriptFallback";
import { room, seatSocket } from "../lobbyContext";
import type {
  LobbyContext,
  LobbyServer,
  LobbySocket,
  TeacherSocketData,
} from "../lobbyContext";
import {
  createChat,
  endChat,
  markInactive,
  matchedStudentIds,
  pauseChats,
  planPairEveryone,
  requestedSeats,
  resumeChats,
} from "../matching";
import { removeSeat } from "../seats";
import type { Seat } from "../seats";
import type { StoredActivity } from "../../store/activityStore";

/** While a teacher socket is connected, refresh the activity's TTL this
 *  often (getByHostKey is the refresh path). Student sockets never refresh
 *  — enumeration must not keep activities alive. */
const TEACHER_KEEPALIVE_MS = 5 * 60 * 1000;

/** The `email` field of `activity:end-result`, taken from the function that
 *  produces it on the happy path so the failure path can't drift from it. */
type EndResultEmail = Awaited<ReturnType<typeof sendTranscriptEmail>>;

/**
 * The teacher's removal, whichever door it came through: tombstone the seat,
 * tell the student why their screen is about to change, and drop the socket.
 * Both `queue:remove` and `chat:remove` do exactly this — the chat one just
 * settles the chat's membership first. Returns the removed seat, or undefined
 * when it had already left (both commands are idempotent).
 */
function evictSeat(
  io: LobbyServer,
  record: StoredActivity,
  studentId: string
): Seat | undefined {
  const seat = removeSeat(record, studentId);
  if (!seat?.connected) return seat;
  const target = seatSocket(io, seat);
  target?.emit("lobby:removed");
  target?.disconnect(true);
  return seat;
}

/** Everything a teacher socket does: join the room, take initial snapshots,
 *  hold the TTL open, and serve the teacher commands. Registered on teacher
 *  sockets only — the structural boundary that makes a student emitting
 *  queue:remove / chat:start / ... a silent no-op. */
export function registerTeacherHandlers(
  ctx: LobbyContext,
  socket: LobbySocket,
  data: TeacherSocketData
): void {
  const {
    io,
    log,
    mailer,
    queuePayload,
    chatsPayload,
    broadcastState,
    settleMembershipChange,
    sendChatStarted,
    sendActivityPaused,
    sendActivityDetails,
  } = ctx;

  socket.join(room(data.joinCode));
  const record = getByHostKey(data.hostKey);
  // Vanishing between middleware and here means the store expired it —
  // onActivityRemoved has already disconnected us.
  if (!record) return;
  log.info({ joinCode: data.joinCode }, "teacher connected");
  // Auto-match runs only while a teacher is connected (founder call);
  // the matching disconnect handler below releases this. The same 0→1 is
  // what the waiting students' lobbies key off — one refcount, so the
  // screens and the matchmaker can't disagree.
  onTeacherConnected(ctx, data.joinCode, armAutoMatch(ctx, data.joinCode));
  const now = Date.now();
  socket.emit("queue:snapshot", queuePayload(record, now));
  socket.emit("chats:snapshot", chatsPayload(record, now));

  const keepAlive = setInterval(() => {
    getByHostKey(data.hostKey);
  }, TEACHER_KEEPALIVE_MS);
  keepAlive.unref();

  socket.on("queue:remove", (payload) => {
    if (typeof payload?.studentId !== "string") return;
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    // A stale queue:remove must never tombstone a chat member without
    // the chat bookkeeping — chat:remove is that path.
    if (matchedStudentIds(current).has(payload.studentId)) return;
    const seat = evictSeat(io, current, payload.studentId);
    if (!seat) return; // idempotent — the seat already left
    log.info(
      { joinCode: data.joinCode, studentId: seat.studentId },
      "student removed by teacher"
    );
    broadcastState(current);
  });

  socket.on("chat:start", (payload) => {
    const ids = payload?.studentIds;
    if (
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 8 ||
      !ids.every((id) => typeof id === "string" && id.length <= 200)
    ) {
      return;
    }
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    // The server's roster is the arbiter (founder call, 2026-07-26). A
    // teacher whose local copy ran ahead asked for more seats than the cast
    // has: a second host device never hears another one's roster edit, and
    // an add is briefly in flight before the emit lands. Seating whoever fit
    // would leave the rest in the queue with nothing to explain it, so the
    // whole start is refused — the selection stays put and the notice says
    // why. createChat enforces the same rule; this branch exists to tell the
    // teacher, since a refusal is otherwise indistinguishable from a dead
    // button.
    const asked = requestedSeats(current, ids).slice(0, 4);
    if (asked.length > current.characters.length) {
      // Counts, not a sentence: the teacher's own page words it, in the
      // teacher's own language. Both are always 2 or more — a chat needs two
      // students, and the roster's first two rows can't be removed.
      current.railNotice = {
        kind: "tooFewCharacters",
        characterCount: current.characters.length,
        studentCount: asked.length,
      };
      log.info(
        {
          joinCode: data.joinCode,
          asked: asked.length,
          characters: current.characters.length,
        },
        "chat start refused: the cast can't seat them"
      );
      broadcastState(current);
      return;
    }
    const chat = createChat(current, ids, Date.now());
    if (!chat) return; // fewer than 2 eligible — a visible no-op
    // A manual pairing clears any stale rail notice: the teacher moved on
    // (mirrors the demo's startChat).
    current.railNotice = null;
    log.info(
      {
        joinCode: data.joinCode,
        chatId: chat.id,
        size: chat.members.length,
      },
      "chat started by teacher"
    );
    sendChatStarted(current, chat);
    broadcastState(current);
  });

  socket.on("match:pair-everyone", () => {
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    const plan = planPairEveryone(current);
    if (!plan) return; // under 2 eligible — a visible no-op
    const now = Date.now();
    for (const group of plan.groups) {
      const chat = createChat(current, group, now);
      if (chat) sendChatStarted(current, chat);
    }
    current.leftoverStudentId = plan.leftoverStudentId;
    // An exact pair/trio the plan couldn't repair stays in line — the rail
    // notice explains the visible skip (names resolved off the seats). Cleared
    // by a manual chat:start or the notice's X.
    current.railNotice =
      plan.stuckStudentIds.length > 0
        ? {
            kind: "stuckInLine",
            names: plan.stuckStudentIds.map(
              (id) => current.seats.byId.get(id)?.name ?? ""
            ),
          }
        : null;
    log.info(
      { joinCode: data.joinCode, groups: plan.groups.length },
      "paired everyone"
    );
    broadcastState(current);
  });

  // The event name predates the notice's second writer and the rename; it
  // stays as it is, because renaming a client→server event is its own
  // breaking change for no gain.
  socket.on("match:dismiss-rematch-notice", () => {
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    if (current.railNotice === null) return; // idempotent — nothing to clear
    // Server-side so the next broadcastState can't resurrect it and a second
    // host device stays coherent.
    current.railNotice = null;
    log.info({ joinCode: data.joinCode }, "rail notice dismissed");
    broadcastState(current);
  });

  socket.on("chat:remove", (payload) => {
    if (
      typeof payload?.chatId !== "string" ||
      typeof payload?.studentId !== "string"
    ) {
      return;
    }
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    const result = markInactive(current, payload.chatId, payload.studentId);
    if (!result) return; // idempotent — not an active member of that chat
    log.info(
      {
        joinCode: data.joinCode,
        chatId: payload.chatId,
        studentId: payload.studentId,
        ended: result.ended,
      },
      "student removed from chat by teacher"
    );
    // The quiet exit drops the seat exactly like a queue remove.
    evictSeat(io, current, payload.studentId);
    settleMembershipChange(current, result);
    broadcastState(current);
  });

  socket.on("chat:end", (payload) => {
    if (typeof payload?.chatId !== "string") return;
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    const result = endChat(current, payload.chatId);
    if (!result) return; // idempotent — already ended or unknown
    log.info(
      { joinCode: data.joinCode, chatId: result.chat.id },
      "chat ended by teacher"
    );
    settleMembershipChange(current, result);
    broadcastState(current);
  });

  socket.on("chats:end-all", () => {
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    // Each student is in at most one active chat, so settling per chat
    // inside the loop is order-independent; one broadcast at the end.
    let endedCount = 0;
    for (const chat of current.chats) {
      const result = endChat(current, chat.id);
      if (!result) continue; // already-ended chats in the list
      endedCount += 1;
      settleMembershipChange(current, result);
    }
    // The round-closer also clears a pause — the next round starts
    // unpaused. Through resumeChats, not a bare null: the waiting
    // students' frozen wait clocks have to shift or they'd jump.
    const resumed = resumeChats(current, Date.now());
    if (endedCount === 0 && !resumed) return; // a visible no-op
    log.info(
      { joinCode: data.joinCode, chats: endedCount, resumed },
      "all chats ended by teacher"
    );
    if (resumed) sendActivityPaused(current, false);
    broadcastState(current);
  });

  socket.on("chats:pause-all", () => {
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    if (!pauseChats(current, Date.now())) return; // already paused
    log.info({ joinCode: data.joinCode }, "chats paused by teacher");
    sendActivityPaused(current, true);
    broadcastState(current);
  });

  socket.on("chats:resume-all", () => {
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    if (!resumeChats(current, Date.now())) return; // not paused
    log.info({ joinCode: data.joinCode }, "chats resumed by teacher");
    sendActivityPaused(current, false);
    broadcastState(current);
  });

  socket.on("settings:update", (payload) => {
    const parsed = activitySettingsSchema.safeParse(payload?.settings);
    if (!parsed.success) {
      log.warn({ joinCode: data.joinCode }, "invalid settings:update");
      return;
    }
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    current.settings = parsed.data;
    // The teacher's OTHER devices — the room minus the sender.
    // (Students never join the room; their lobbies keep the copy they
    // fetched, same as before.)
    socket.to(room(data.joinCode)).emit("settings:changed", {
      settings: parsed.data,
    });
  });

  socket.on("activity:update-details", (payload) => {
    const parsed = activityDetailsUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      log.warn({ joinCode: data.joinCode }, "invalid activity:update-details");
      return;
    }
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    current.hostName = parsed.data.hostName;
    // The roster stops being write-once here (feature 18): a fresh array of
    // fresh objects, never the parsed rows aliased, so nothing a chat
    // already snapshotted can be mutated from under it. Ids arrive from the
    // panel and are stored as given — a chat member's characterId has to
    // keep resolving, so the server never remints. Whoever is mid-chat is
    // untouched: their cast was frozen at chat start.
    current.characters = parsed.data.characters.map((character) => ({
      id: character.id,
      name: character.name,
    }));
    if (parsed.data.studentInstructions === null) {
      delete current.studentInstructions;
    } else {
      current.studentInstructions = parsed.data.studentInstructions;
    }
    // Every connected seat hears the new details so students' lobbies follow
    // live. No teacher-room echo: a second host device is last-write-wins,
    // like the email. The instructions text and the character names stay out
    // of the log — the boolean and the count are what we'd actually debug
    // with, and a roster is the teacher's classroom material.
    sendActivityDetails(current);
    log.info(
      {
        joinCode: data.joinCode,
        characters: parsed.data.characters.length,
        instructions: parsed.data.studentInstructions !== null,
      },
      "activity details updated by teacher"
    );
  });

  socket.on("activity:update-email", (payload) => {
    const parsed = teacherEmailUpdateSchema.safeParse(payload?.teacherEmail);
    if (!parsed.success) {
      log.warn({ joinCode: data.joinCode }, "invalid activity:update-email");
      return;
    }
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    if (parsed.data === null) {
      delete current.teacherEmail;
    } else {
      current.teacherEmail = parsed.data;
    }
    // No echo back: unlike settings, the email lives on one form field the
    // teacher is looking at, so last write wins. The address itself stays
    // out of the log — it's the teacher's, and the boolean is what we'd
    // actually debug with.
    log.info(
      { joinCode: data.joinCode, set: parsed.data !== null },
      "transcript email updated by teacher"
    );
  });

  // The terminal wrap-up: end every chat, mail the transcript, remove the
  // activity. Async because the send is awaited so the outcome can be reported
  // back before teardown. A repeat while a send is in flight is dropped by the
  // send-once guard's "sending" state (set synchronously inside
  // sendTranscriptEmail before its first await), so a double-click or a second
  // host device produces exactly one email.
  socket.on("activity:end", async () => {
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    if (current.transcriptEmail?.state === "sending") return;
    // The teacher's one exit is this emit — the wrap-up card hides its CTA
    // until a result arrives — so every path below has to answer exactly
    // once, including the ones nobody planned. answer() makes the catch
    // safe to call blind, and removeActivity runs whatever happened: a
    // teardown skipped by a throw would leave the class zombied on a server
    // that already told the teacher it was over.
    let answered = false;
    const answer = (email: EndResultEmail) => {
      if (answered) return;
      answered = true;
      socket.emit("activity:end-result", { email });
    };
    try {
      // Stop auto-match outright, whatever the teacher refcount — otherwise a
      // second host device would leave the tick armed, and it could pair the
      // students we just freed into fresh chats during the send await.
      clearAutoMatch(data.joinCode);
      // Flip every active chat to ended before the await so the transcript is
      // frozen for the send — and settle each one exactly like chats:end-all,
      // so the class gets the real ending (reason "teacher", name reveal when
      // the setting is on) instead of the chat going quietly dead under them
      // for the length of the send. endChat only mutates the chat in place, so
      // iterating current.chats directly is safe.
      for (const chat of current.chats) {
        const result = endChat(current, chat.id);
        if (!result) continue; // already-ended chats in the list
        settleMembershipChange(current, result);
      }
      const result = await sendTranscriptEmail(current, mailer, log);
      // To the clicking socket only — the room never hears it. If the teacher
      // already vanished this emit goes nowhere and removal still runs.
      answer(result);
      log.info(
        { joinCode: data.joinCode, chats: current.chats.length },
        "activity ended by teacher"
      );
    } catch (err) {
      log.error({ joinCode: data.joinCode, err }, "activity:end failed");
      // The teacher asked to end; the class IS ending either way. Report the
      // email as failed when there was an address to fail — the wrap-up card
      // then tells them to copy anything they need before closing.
      answer(
        current.teacherEmail
          ? { to: current.teacherEmail, state: "failed" }
          : null
      );
    } finally {
      // onActivityRemoved does the whole teardown: seat timers cleared, every
      // student sent activity:ended, all sockets (this one included) dropped.
      // Best-effort: a throw in here would otherwise escape the handler as an
      // unhandled rejection, and nothing in index.ts catches those.
      try {
        removeActivity(current);
      } catch (err) {
        log.error({ joinCode: data.joinCode, err }, "activity teardown failed");
      }
    }
  });

  socket.on("disconnect", (reason) => {
    clearInterval(keepAlive);
    // Debounced inside: a refresh drops the last socket and reconnects
    // seconds later, and the lobbies should never have flinched.
    onTeacherDisconnected(ctx, data.joinCode, releaseAutoMatch(data.joinCode));
    // Arm the best-effort transcript fallback unconditionally: re-arm replaces,
    // so a second host tab or a reconnect just resets the 10-minute clock, and
    // whether a teacher is actually still around is settled when the timer
    // fires (transcriptFallback.ts), not here.
    armTranscriptFallback(ctx, data.joinCode);
    log.info({ joinCode: data.joinCode, reason }, "teacher disconnected");
  });
}
