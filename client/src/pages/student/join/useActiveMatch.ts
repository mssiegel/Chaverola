import { useRef, useState } from "react";

import {
  CHAT_SEND_WINDOW_LIMIT,
  CHAT_SEND_WINDOW_MS,
  TYPING_INDICATOR_TTL_MS,
} from "@chaverola/shared";

import { nextId } from "@/lib/random";
import type { Activity } from "@/types/activity";
import type { Character } from "@/types/chat";
import type { StudentSession } from "@/lib/studentSession";
import type { ActivityChatScenarioKey } from "@/mockData";
import { useLobbyPresence } from "@/pages/student/useLobbyPresence";

import {
  PENDING_ECHO_TIMEOUT_MS,
  RETURNED_FLASH_MS,
  type ActiveMatch,
} from "./stageTypes";
import {
  appendPendingLine,
  applyChatLine,
  applyChatStarted,
  applyChatUpdate,
  applyPeerDropped,
  applyPeerReturned,
  applyPeerTyping,
  applyReveal,
  clearReturnedFlash,
  clearTypingPeer,
  dropPendingLine,
  failPendingLine,
} from "./liveMatchState";

/**
 * Owns the student's live/demo match state and drives the real seat.
 *
 * `match` / `chatEnded` / `liveEndReason` live here, fed by the demo triggers
 * (`startMatch`) and the socket (via `useLobbyPresence` below). The eight
 * socket callbacks are one-liners over the pure reducers in
 * `liveMatchState.ts`; what stays here is the state the reducers can't hold
 * — the typing-TTL and 🎉-flash timer refs, and the synchronous
 * `liveChatIdRef`.
 *
 * `onRemoved` / `onEnded` / `onActivityDetails` are caller-supplied because
 * they touch page-level state (sign-out, the name field, the activity-gone
 * latch, the activity lookup); this hook wraps `onRemoved` to also clear its
 * own match, and forwards the other two untouched. No liveMatchState reducer
 * for the details event on purpose: nothing about a chat changes. That holds
 * for the roster it now carries too (feature 18) — those are the LOBBY's
 * characters, and an in-chat label resolves against the frozen cast baked
 * into the match at chat:started, never against the activity lookup.
 */
export function useActiveMatch({
  activity,
  session,
  updateSession,
  seated,
  isRealActivity,
  activityGoneFromSocket,
  onRemoved,
  onEnded,
  onActivityDetails,
}: {
  activity: Activity | undefined;
  session: StudentSession | null;
  updateSession: (
    patch: Partial<Pick<StudentSession, "nonce" | "studentId" | "token">>
  ) => void;
  seated: boolean;
  isRealActivity: boolean;
  activityGoneFromSocket: boolean;
  onRemoved: () => void;
  onEnded: () => void;
  onActivityDetails: (payload: {
    /** Optional for the deploy window — an older server omits it. */
    characters?: Character[];
    hostName: string;
    studentInstructions: string | null;
  }) => void;
}) {
  // Set by the lobby's demo match triggers (demo) or by the server's
  // chat:started (real activities, via the presence hook below).
  const [match, setMatch] = useState<ActiveMatch | null>(null);
  // Mirrors the chat engine's ended flag up here so the stage (and with it
  // the page title) can tell chatting from ended.
  const [chatEnded, setChatEnded] = useState(false);
  // Why the live chat ended, from chat:ended's payload — "student" is the
  // student's own End chat (the 🎬 wrap-up) and "self-left" their own Leave
  // from a group that kept going (the 👋 one), "peer" is a partner's leave
  // (the 🎭 wrap-up naming their character), "peer-timeout" a 1:1 partner's
  // expired grace (the 🔌 wrap-up), "self-timeout" the student's own (the 📶
  // wrap-up, delivered on their return), "teacher" everything else. Beside
  // chatEnded rather than on the match state: it describes the ending, and
  // it resets on the same edges.
  const [liveEndReason, setLiveEndReason] = useState<
    | "teacher"
    | "student"
    | "peer"
    | "self-left"
    | "peer-timeout"
    | "self-timeout"
    | null
  >(null);
  // Who ended it — the leaver's characterId, riding only with "peer" (null
  // otherwise, and from an older server: the ended screen then falls back
  // to "Your partner"). Same edges as liveEndReason.
  const [liveEndedBy, setLiveEndedBy] = useState<string | null>(null);
  // Whether the ended chat revealed real names (the teacher's reveal setting
  // was on at end time). Beside liveEndReason — it describes the ending and
  // resets on the same edges. The names themselves land on the match's
  // peers/everPeers via applyReveal; this flag flips the ended screen into its
  // reveal branch.
  const [revealed, setRevealed] = useState(false);

  // The typing indicator's TTL: re-armed on every relayed heartbeat, so it
  // runs from the LAST one. No cleanup effect on purpose: a stray
  // post-unmount fire is a guarded setMatch no-op.
  const typingExpiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The 🎉 flash's clear timer — same no-cleanup pattern: a stray
  // post-unmount fire is a guarded setMatch no-op.
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The chat this socket has been handed via chat:started, updated
  // SYNCHRONOUSLY (a ref, not state) so onChatEnded can trust it inside
  // the same event burst. Cleared wherever the match clears.
  const liveChatIdRef = useRef<string | null>(null);
  // The client's copy of the server's send window: the timestamps of the
  // sends that have actually gone out, plus whatever is waiting for a slot
  // and the one timer that lets them go. Refs, not state — the composer
  // reads none of this; only the wait below is rendered.
  const sendTimesRef = useRef<number[]>([]);
  const heldRef = useRef<{ pendingId: string; text: string }[]>([]);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // When the held messages get their slot (epoch ms), or null when nothing
  // is waiting. The chat stage turns it into the composer's wait notice.
  const [holdUntil, setHoldUntil] = useState<number | null>(null);

  const startMatch = (scenarioKey: ActivityChatScenarioKey) => {
    setChatEnded(false);
    setMatch((prev) => ({
      kind: "demo",
      seq: (prev?.kind === "demo" ? prev.seq : 0) + 1,
      scenarioKey,
    }));
  };

  // Back to the queue: only ever by the student's own tap (see DECISIONS.md).
  const backToLobby = () => {
    liveChatIdRef.current = null;
    setMatch(null);
    setChatEnded(false);
    setLiveEndReason(null);
    setLiveEndedBy(null);
    setRevealed(false);
  };

  // The live seat. Active through the whole seated life of a real activity
  // — lobby, chatting, and the chat-ended screen — so a matched student's
  // socket lives on and a refresh resumes into the chat; the demo (1234)
  // keeps zero network by construction.
  // - onRemoved (the socket event, or a tombstoned token on a reconnect
  //   attempt) drives the same flow the demo button does; the caller clears
  //   the session and name, and this hook clears the match with the seat.
  // - onEnded latches the dead activity's code (caller), which flips the
  //   stage to the activity-gone screen.
  // - onChatStarted is both the match and every resume into it; the reducer
  //   merges the missed transcript backlog, reconciles peers, then rebuilds
  //   the offline map from the payload's reconnectingPeers backlog.
  // - onChatEnded keys off liveChatIdRef, not the render closure's match:
  //   the reaped-returner replay (chat:started + chat:ended in one burst)
  //   arrives before React re-renders, so the closure would still see null
  //   and bounce the 📶 screen back to the queue. No chat:started this
  //   connection means nothing to show — straight back to the queue.
  const {
    presence,
    paused,
    teacherPresent,
    retrying,
    retry,
    returnToLobby,
    leaveChat,
    sendChatMessage,
    sendTyping,
  } = useLobbyPresence({
    active: seated && isRealActivity && !activityGoneFromSocket,
    joinCode: activity?.joinCode,
    session,
    updateSession,
    onRemoved: () => {
      onRemoved();
      liveChatIdRef.current = null;
      setMatch(null);
      setChatEnded(false);
      setRevealed(false);
    },
    onEnded,
    onActivityDetails,
    onChatStarted: (payload) => {
      if (!session) return;
      liveChatIdRef.current = payload.chatId;
      setChatEnded(false);
      // Any held reason/reveal is stale: for an active chat there's no ending
      // to name, and the reaped-returner replay's own chat:ended follows in
      // order and re-sets them.
      setLiveEndReason(null);
      setLiveEndedBy(null);
      setRevealed(false);
      setMatch((prev) =>
        applyChatStarted(
          prev,
          payload,
          // The chat resolves against its OWN frozen cast — captured
          // server-side at chat start — never the mutable lobby roster;
          // the lobby copy is only the deploy-window fallback for a
          // server that doesn't send `cast` yet.
          payload.cast ?? activity?.characters ?? [],
          session.name
        )
      );
    },
    onChatLine: (payload) => {
      setMatch((prev) => applyChatLine(prev, payload));
    },
    onChatUpdate: (payload) => {
      setMatch((prev) => applyChatUpdate(prev, payload));
    },
    onPeerTyping: (payload) => {
      if (match?.kind !== "live" || match.chatId !== payload.chatId) return;
      setMatch((prev) => applyPeerTyping(prev, payload));
      // ALWAYS re-arm, churn skipped or not — the TTL runs from the last
      // heartbeat, not the first.
      if (typingExpiryRef.current !== null) {
        clearTimeout(typingExpiryRef.current);
      }
      typingExpiryRef.current = setTimeout(() => {
        typingExpiryRef.current = null;
        setMatch((prev) => clearTypingPeer(prev));
      }, TYPING_INDICATOR_TTL_MS);
    },
    onPeerConnection: (payload) => {
      if (payload.state === "dropped") {
        setMatch((prev) => applyPeerDropped(prev, payload));
        return;
      }
      // "returned" — the reducer's own guard keeps sub-4s blips,
      // duplicate-tab takeovers, and StrictMode double-mounts invisible.
      setMatch((prev) => applyPeerReturned(prev, payload));
      // Re-armed on every return (a no-op fire can only re-null a null) —
      // the flash runs RETURNED_FLASH_MS from the LAST return.
      if (flashTimerRef.current !== null) {
        clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = setTimeout(() => {
        flashTimerRef.current = null;
        setMatch((prev) => clearReturnedFlash(prev));
      }, RETURNED_FLASH_MS);
    },
    onChatEnded: (payload) => {
      if (liveChatIdRef.current !== null) {
        setChatEnded(true);
        setLiveEndReason(payload.reason);
        setLiveEndedBy(payload.endedBy ?? null);
        // Names arrive only when the teacher's reveal setting was on at end
        // time. Stamp them onto the room and flip the ended screen to reveal.
        // Captured to a const so the setMatch closure keeps the narrowing.
        const reveal = payload.reveal;
        if (reveal !== undefined) {
          setRevealed(true);
          setMatch((prev) => applyReveal(prev, reveal));
        }
      } else {
        // No chat:started this connection (a survivor's cold refresh onto
        // a wrappingUp seat): there's no chat to show an ended screen for
        // — go straight back to the queue instead of pretending.
        returnToLobby();
      }
    },
  });

  // The actual emit, plus the timer that admits the echo never came. Every
  // path into the wire goes through here so one place owns the window's
  // bookkeeping.
  const emitLiveMessage = (pendingId: string, text: string) => {
    sendTimesRef.current.push(Date.now());
    sendChatMessage(text);
    // No cleanup bookkeeping: once the echo resolves the line, this id is
    // gone from the feed and failPendingLine is a no-op — the same guarded
    // late-fire contract the typing TTL and 🎉 flash timers use.
    setTimeout(() => {
      setMatch((prev) => failPendingLine(prev, pendingId));
    }, PENDING_ECHO_TIMEOUT_MS);
  };

  // Let out whatever the window now has room for, and re-arm for the rest.
  const drainHeldMessages = () => {
    holdTimerRef.current = null;
    const now = Date.now();
    sendTimesRef.current = sendTimesRef.current.filter(
      (t) => now - t < CHAT_SEND_WINDOW_MS
    );
    while (
      heldRef.current.length > 0 &&
      sendTimesRef.current.length < CHAT_SEND_WINDOW_LIMIT
    ) {
      // Length-checked on the line above.
      const next = heldRef.current.shift()!;
      emitLiveMessage(next.pendingId, next.text);
    }
    if (heldRef.current.length === 0) {
      setHoldUntil(null);
      return;
    }
    const readyAt = oldestSendExpiry();
    setHoldUntil(readyAt);
    holdTimerRef.current = setTimeout(
      drainHeldMessages,
      Math.max(0, readyAt - Date.now())
    );
  };

  /** When the oldest send in the window falls out of it, freeing a slot. */
  const oldestSendExpiry = () =>
    // Only ever called with a full window, so [0] is there.
    sendTimesRef.current[0]! + CHAT_SEND_WINDOW_MS;

  // The send the live chat actually calls: the line goes on screen first,
  // marked pending, and the server's echo replaces it. Nothing here waits on
  // the wire, so the message appears at thumb speed even on classroom wifi —
  // and if the echo never comes, the line says so instead of vanishing.
  //
  // A send that would blow the shared rate-limit window is HELD, not
  // dropped: the server would have thrown it away without a word, so the
  // composer keeps it, shows the wait, and lets it go the moment the window
  // opens. The line sits pending the whole time, which is the truth.
  const sendLiveMessage = (text: string) => {
    const pendingId = nextId("pending");
    setMatch((prev) => appendPendingLine(prev, pendingId, text));

    const now = Date.now();
    sendTimesRef.current = sendTimesRef.current.filter(
      (t) => now - t < CHAT_SEND_WINDOW_MS
    );
    const windowIsFull =
      sendTimesRef.current.length >= CHAT_SEND_WINDOW_LIMIT ||
      // Anything already queued goes first, or the feed's order would lie.
      heldRef.current.length > 0;

    if (!windowIsFull) {
      emitLiveMessage(pendingId, text);
      return;
    }
    heldRef.current.push({ pendingId, text });
    const readyAt = oldestSendExpiry();
    setHoldUntil(readyAt);
    if (holdTimerRef.current === null) {
      holdTimerRef.current = setTimeout(
        drainHeldMessages,
        Math.max(0, readyAt - now)
      );
    }
  };

  // "Tap to retry" on a failed line: drop it and send the text again as a
  // fresh pending message, which lands at the bottom where a new send belongs.
  const retryLiveMessage = (messageId: string) => {
    if (match?.kind !== "live") return;
    const failed = match.messages.find(
      (m) => m.id === messageId && m.delivery === "failed"
    );
    if (!failed) return;
    setMatch((prev) => dropPendingLine(prev, messageId));
    sendLiveMessage(failed.text);
  };

  return {
    match,
    chatEnded,
    setChatEnded,
    liveEndReason,
    liveEndedBy,
    revealed,
    startMatch,
    backToLobby,
    presence,
    paused,
    teacherPresent,
    retrying,
    retry,
    returnToLobby,
    leaveChat,
    sendChatMessage: sendLiveMessage,
    retryLiveMessage,
    sendHoldUntil: holdUntil,
    sendTyping,
  };
}
