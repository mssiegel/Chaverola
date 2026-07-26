import { useEffect, useRef, useState } from "react";

import {
  CHAT_TRANSCRIPT_MAX_LINES,
  activeMembersBy,
  isExactRematchIn,
} from "@chaverola/shared";
import type {
  ActivitySettings,
  Character,
  LobbyConnectionState,
  QueueEntry,
} from "@chaverola/shared";

import { createLobbySocket, type LobbySocket } from "@/lib/socket";
import { useLatestRef } from "@/lib/useLatestRef";

import { mergeHostedChats, toTranscriptMessage } from "./hostChats";
import type { HostEnded, HostEngine } from "./hostEngine";
import type { HostedChat, WaitingStudent } from "./hostWorld";

/*
  The teacher's live engine: one Socket.IO connection per mounted host page
  (auth `{ role: "teacher", hostKey }`). Queue truth comes from the server's
  `queue:snapshot` broadcasts and chat truth from `chats:snapshot`, with
  per-message `chat:transcript-line` deltas keeping transcripts live
  between snapshots — the matching commands (chat:start,
  match:pair-everyone, chat:remove, chat:end, chats:end-all,
  chats:pause-all, chats:resume-all, settings:update,
  activity:update-email) emit over the same socket. Ending and pausing are real: the emits are bare, and the flipped
  state arrives on the handler's own chats:snapshot — no local state to
  reconcile. Deliberately imports nothing from hostWorld.ts beyond types —
  tickWorld runs the SIMULATION's auto-match and must never see a real
  student.

  The server refreshes the activity's TTL while this socket is connected
  (the teacher socket is the keep-alive), so an open host page keeps its
  class alive with no client-side work here.
*/

/** How long the wrapped-up card waits for activity:end-result before it
 *  stops claiming the email is on its way. Sized above the server's own
 *  budget (SMTP timeouts cap the send at roughly half a minute's worst case,
 *  and it answers even when that fails), so this fires only when the answer
 *  is genuinely lost — a dropped socket, or a second host device whose End
 *  hit the send-once guard. Real milliseconds: live socket timers never pass
 *  through scaledMs. */
const END_RESULT_WAIT_MS = 25_000;

/** Server truth → the row shape the dashboard renders. */
function toWaitingStudent(entry: QueueEntry): WaitingStudent {
  return {
    id: entry.id,
    realName: entry.name,
    waitSeconds: entry.waitSeconds,
    connection: entry.connection,
  };
}

/** The members still actually in the room — the shared rule, not a copy of
 *  hostWorld's simulation. It's `@chaverola/shared`, not `hostWorld.ts`, so
 *  the types-only tripwire above still holds. */
function activeParticipantsOf(chat: HostedChat) {
  return activeMembersBy(
    chat.participants,
    chat.inactiveStudentIds,
    (p) => p.id
  );
}

/**
 * Live presence + matching for the host page. Mount only for REAL
 * activities — the `1234` demo renders through useHostActivityDemo and
 * stays zero-network.
 *
 * `connection` goes "reconnecting" the moment the socket drops; socket.io
 * auto-reconnects (plus a hidden→visible fast path for a laptop waking
 * mid-class), and the on-join snapshots restore fresh truth.
 *
 * `onActivityGone` fires from the socket's callbacks when the server says
 * the activity no longer exists (a wipe/restart mid-class) — the page
 * reacts by falling back to its friendly not-found.
 *
 * `onSettingsSync` fires when ANOTHER of the teacher's devices edits the
 * settings (`settings:changed` excludes the sender), and once per connect
 * from the first `chats:snapshot` — a device that slept through the echo
 * re-syncs to server truth before it can commit anything stale. Either way
 * the page folds the server's copy into its local activity state.
 */
export function useHostActivityLive({
  hostKey,
  onActivityGone,
  onSettingsSync,
}: {
  hostKey: string;
  onActivityGone: () => void;
  onSettingsSync: (settings: ActivitySettings) => void;
}): HostEngine {
  const [waiting, setWaiting] = useState<WaitingStudent[]>([]);
  const [chats, setChats] = useState<HostedChat[]>([]);
  const [leftoverStudentId, setLeftoverStudentId] = useState<string | null>(
    null
  );
  const [connection, setConnection] =
    useState<LobbyConnectionState>("connected");
  const [paused, setPaused] = useState(false);
  const [lastPartners, setLastPartners] = useState<Record<string, string[]>>(
    {}
  );
  const [rematchNotice, setRematchNotice] = useState<string | null>(null);
  const [ended, setEnded] = useState<HostEnded | null>(null);
  const socketRef = useRef<LobbySocket | null>(null);
  // Set the instant the teacher ends the activity, read inside the mount
  // effect's socket callbacks (which captured the old `ended` value). Once
  // ended, the server removes the activity under us and disconnects this
  // socket; the callbacks must ignore that so the wrapped screen never flips
  // to not-found. A ref, not the state, because the listeners are registered
  // once and would otherwise see a stale closure.
  const endedRef = useRef(false);
  // The one-shot that gives up on activity:end-result. Held in a ref so the
  // socket listener (registered once) and the unmount cleanup can both clear
  // it; only ever written from an event handler or an effect.
  const endResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onActivityGoneRef = useLatestRef(onActivityGone);
  const onSettingsSyncRef = useLatestRef(onSettingsSync);

  useEffect(() => {
    const socket = createLobbySocket(() => ({ role: "teacher", hostKey }));
    socketRef.current = socket;

    // Fold server settings only from the FIRST chats:snapshot after each
    // connect — the catch-up this exists for (a woken device that slept
    // through settings:changed). Unconditional folding would bounce a
    // locally-flipped switch back whenever an unrelated seat/chat broadcast
    // was already in flight.
    let foldSettingsFromSnapshot = false;

    socket.on("connect", () => {
      setConnection("connected");
      foldSettingsFromSnapshot = true;
    });
    socket.on("disconnect", () => {
      // Terminal latch: once the teacher ended the activity, the server's
      // teardown disconnects us on purpose — don't flash "reconnecting" over
      // the wrapped-up screen.
      if (endedRef.current) return;
      setConnection("reconnecting");
    });
    socket.on("activity:end-result", ({ email }) => {
      // The answer arrived — even late, after the card gave up on it.
      if (endResultTimerRef.current !== null) {
        clearTimeout(endResultTimerRef.current);
        endResultTimerRef.current = null;
      }
      // Settle the optimistic "sending" card. Keep the destination we already
      // showed, but prefer the server's authoritative `to` when it sent one; a
      // null result with a known address means a silent class ("empty"), not a
      // missing email.
      setEnded((prev) =>
        prev
          ? {
              to: email?.to ?? prev.to,
              state: email ? email.state : "empty",
            }
          : prev
      );
    });
    socket.on("queue:snapshot", ({ students }) => {
      setWaiting(students.map(toWaitingStudent));
    });
    socket.on("chats:snapshot", (payload) => {
      // A merge, not a replace: a chat that arrives without its `messages` is
      // saying "unchanged", so the lines we hold survive (see hostChats.ts).
      setChats((prev) => mergeHostedChats(prev, payload.chats));
      setLeftoverStudentId(payload.leftoverStudentId);
      // `=== true` / `?? {}` / `?? null` tolerate the deploy window where an
      // older server's snapshot has no paused / lastPartners / rematchNotice
      // field yet.
      setPaused(payload.paused === true);
      setLastPartners(payload.lastPartners ?? {});
      setRematchNotice(payload.rematchNotice ?? null);
      if (foldSettingsFromSnapshot) {
        foldSettingsFromSnapshot = false;
        // Presence check: an older server's snapshot has no settings field
        // yet — skip the fold (today's behavior) instead of folding undefined.
        if (payload.settings) onSettingsSyncRef.current(payload.settings);
      }
    });
    socket.on("chat:transcript-line", ({ chatId, line }) => {
      // The one delta on the teacher wire (message lines only — a snapshot
      // per message would be far too fat). Safe because chats:snapshot also
      // carries the transcript: a dropped delta heals on the next seat
      // change or reconnect instead of wedging a card.
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat;
          // Dedupe by line id — cheap insurance against an emit-order
          // change landing a line's snapshot before its delta.
          if (chat.messages.some((m) => m.id === line.id)) return chat;
          const messages = [...chat.messages, toTranscriptMessage(line)];
          // Mirror the server's transcript cap so a long-lived card never
          // outgrows stored truth between snapshots.
          if (messages.length > CHAT_TRANSCRIPT_MAX_LINES) {
            messages.splice(0, messages.length - CHAT_TRANSCRIPT_MAX_LINES);
          }
          return { ...chat, messages };
        })
      );
    });
    socket.on("settings:changed", ({ settings }) => {
      onSettingsSyncRef.current(settings);
    });
    socket.on("connect_error", (error) => {
      // Terminal latch: after End, the server removed the activity, so a
      // reconnect attempt is rejected with activity_gone — swallow it, or the
      // page would unmount the wrapped-up screen to not-found.
      if (endedRef.current) return;
      // "invalid" is structurally unreachable (the page validated the
      // hostKey pattern before mounting us), but if it ever fires, gone is
      // more honest than an amber banner that can never clear.
      if (error.message === "activity_gone" || error.message === "invalid") {
        onActivityGoneRef.current();
      } else {
        // Network-level failure — socket.io keeps retrying on its own.
        setConnection("reconnecting");
      }
    });

    // A teacher laptop that slept through a discussion wakes mid-backoff;
    // hidden→visible while disconnected skips the throttled timer and
    // connects right now — same fast path as the student lobby.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const current = socketRef.current;
      if (current && !current.connected) current.connect();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    socket.connect();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      socketRef.current = null;
      socket.disconnect();
      socket.removeAllListeners();
      setWaiting([]);
      setChats([]);
      setLeftoverStudentId(null);
      setConnection("connected");
      setPaused(false);
      setLastPartners({});
      setRematchNotice(null);
      setEnded(null);
      endedRef.current = false;
      if (endResultTimerRef.current !== null) {
        clearTimeout(endResultTimerRef.current);
        endResultTimerRef.current = null;
      }
    };
  }, [hostKey, onActivityGoneRef, onSettingsSyncRef]);

  // The local 1s tick between snapshots: the server stamps waitSeconds at
  // emit time; this keeps the queue clocks moving so rows never look frozen.
  // Never through scaledMs — real classroom time is never compressed. While
  // paused it stands down entirely: the server's numbers are frozen at the
  // pause anchor, and resume re-snapshots with the clocks shifted, so nothing
  // jumps.
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setWaiting((prev) =>
        prev.length === 0
          ? prev
          : prev.map((s) => ({ ...s, waitSeconds: s.waitSeconds + 1 }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  const removeFromQueue = (studentId: string) => {
    socketRef.current?.emit("queue:remove", { studentId });
  };
  const startChat = (studentIds: string[]) => {
    socketRef.current?.emit("chat:start", { studentIds });
  };
  const pairEveryone = () => {
    socketRef.current?.emit("match:pair-everyone");
  };
  const removeFromChat = (chatId: string, studentId: string) => {
    socketRef.current?.emit("chat:remove", { chatId, studentId });
  };
  const endChat = (chatId: string) => {
    socketRef.current?.emit("chat:end", { chatId });
  };
  const endAllChats = () => {
    socketRef.current?.emit("chats:end-all");
  };
  const pauseAllChats = () => {
    socketRef.current?.emit("chats:pause-all");
  };
  const resumeAllChats = () => {
    socketRef.current?.emit("chats:resume-all");
  };
  const updateSettings = (settings: ActivitySettings) => {
    socketRef.current?.emit("settings:update", { settings });
  };
  const endActivity = (teacherEmail: string | null) => {
    // Latch first so the teardown the server is about to trigger can't flip us
    // to not-found (the socket callbacks read endedRef).
    endedRef.current = true;
    // The server ends the chats but sends no snapshot back (it's tearing the
    // activity down), so flip our own copy to ended now — otherwise the
    // wrapped-up screen's completed-chats list would be missing this whole
    // final round.
    setChats((prev) =>
      prev.map((chat) =>
        chat.status === "active"
          ? { ...chat, status: "ended", endReason: "teacher" }
          : chat
      )
    );
    // Optimistic card: "sending" when there's an address, "empty" (nothing to
    // send) when there isn't. The server's activity:end-result settles it.
    setEnded({
      to: teacherEmail,
      state: teacherEmail ? "sending" : "empty",
    });
    // Nothing was promised without an address, so there's nothing to time out.
    if (teacherEmail) {
      if (endResultTimerRef.current !== null) {
        clearTimeout(endResultTimerRef.current);
      }
      endResultTimerRef.current = setTimeout(() => {
        endResultTimerRef.current = null;
        // Only the still-waiting card gives up; a result that already landed
        // owns the state.
        setEnded((prev) =>
          prev?.state === "sending" ? { ...prev, state: "unconfirmed" } : prev
        );
      }, END_RESULT_WAIT_MS);
    }
    socketRef.current?.emit("activity:end");
  };
  const updateTeacherEmail = (teacherEmail: string | null) => {
    socketRef.current?.emit("activity:update-email", { teacherEmail });
  };
  const updateDetails = (details: {
    characters: Character[];
    hostName: string;
    studentInstructions: string | null;
  }) => {
    // No listener to pair with this emit: activity:details-changed goes to
    // student seats only — a second host device is last-write-wins, like the
    // email (founder call, 2026-07-26). The roster rides along (feature 18):
    // it replaces the one the lobby chips and the next deal read, and never
    // touches a chat already running — those hold the cast they froze at
    // start, which is what the cards already render.
    socketRef.current?.emit("activity:update-details", details);
  };

  const chatsInProgress = chats.filter((c) => c.status === "active");
  const completedChats = chats.filter((c) => c.status === "ended");

  return {
    waiting,
    chatsInProgress,
    completedChats,
    studentsChattingCount: chatsInProgress.reduce(
      (sum, c) => sum + activeParticipantsOf(c).length,
      0
    ),
    leftoverStudentId,
    // rematchNotice and isExactRematch both read server truth from
    // chats:snapshot; dismissing is a real server round-trip so a second host
    // device stays coherent (the server won't resurrect a dismissed notice).
    rematchNotice,
    dismissRematchNotice: () =>
      socketRef.current?.emit("match:dismiss-rematch-notice"),
    isExactRematch: (ids) => isExactRematchIn(lastPartners, ids),
    startChat,
    pairEveryone,
    endChat,
    endAllChats,
    paused,
    pauseAllChats,
    resumeAllChats,
    removeFromQueue,
    removeFromChat,
    updateSettings,
    updateTeacherEmail,
    updateDetails,
    connection,
    endActivity,
    ended,
  };
}
