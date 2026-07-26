import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";

import type { LobbyConnectionState } from "@chaverola/shared";

import { DemoBanner } from "@/components/demo/DemoBanner";
import type { StudentWorldOutletContext } from "@/components/layout/StudentWorldLayout";
import { ChatStage } from "@/components/Student/ChatStage";
import { LiveChatStage } from "@/components/Student/LiveChatStage";
import { WaitingLobby } from "@/components/Student/WaitingLobby";
import { useLocaleNavigate } from "@/lib/locale";
import { useStudentSession } from "@/lib/studentSession";
import { useActivityLookup } from "@/lib/useActivityLookup";
import { usePageTitle } from "@/lib/usePageTitle";
import { cn } from "@/lib/utils";
import { DEMO_JOIN_CODE, DEMO_STUDENT_NAME } from "@/mockData";
import type { Activity } from "@/types/activity";

import { ActivityFullCard } from "./join/ActivityFullCard";
import { ActivityGoneCard } from "./join/ActivityGoneCard";
import { JoinGateCard } from "./join/JoinGateCard";
import { LoadingCard } from "./join/LoadingCard";
import { LobbyDemoControls } from "./join/LobbyDemoControls";
import { ReconnectingCard } from "./join/ReconnectingCard";
import {
  PAGE_TITLES,
  STUDENT_CARD_CLASS,
  type StudentStage,
} from "./join/stageTypes";
import { useActiveMatch } from "./join/useActiveMatch";
import { useDemoLobby } from "./join/useDemoLobby";

/**
 * The student flow. Serves both `/activity/join` (code entry) and
 * `/activity/join/:joinCode`, which carries the student through every later
 * stage on one route (enter name → waiting lobby → chatting → chat ended);
 * the UI changes by stage.
 *
 * Stage is derived, not stored: no `:joinCode` param means code entry, a
 * code still being looked up means loading, a code whose lookup can't reach
 * the server holds a signed-in student on the reconnecting card while the
 * lookup retries itself, a code that resolved to nothing
 * falls back to code entry, a found activity without a signed-in session
 * means name entry, and a session that matches the code means the lobby —
 * until a match starts a chat: the demo's mock triggers on `1234`, the
 * server's `chat:started` on real activities. The demo activity resolves
 * synchronously with zero network; real codes go through the API
 * (`useActivityLookup`). A demo match lives only in memory, so a mid-chat
 * refresh lands back in the lobby; a live match resumes across refresh —
 * the server re-emits `chat:started` to a matched seat on every welcome.
 *
 * Demo entries (the homepage's "Try the student side", /demo/student) skip
 * the code screen: they land straight on /activity/join/1234 with the name
 * already filled in, so the lobby is one click away — see DECISIONS.md →
 * "The student demo skips the code screen and joins you as Rachel".
 *
 * This shell is a composition root: the live/demo match state lives in
 * `useActiveMatch`, the demo lobby furniture in `useDemoLobby`, the code +
 * name form in `JoinGateCard`, and the pure socket reducers in
 * `join/liveMatchState.ts`. What stays here is the stage machine, the
 * session and its latches, and the render dispatch.
 */
export function JoinActivityPage() {
  const { joinCode: joinCodeParam } = useParams();
  const navigate = useLocaleNavigate();
  const { setChatStudentName } = useOutletContext<StudentWorldOutletContext>();
  const { session, signIn, signOut, updateSession } = useStudentSession();

  const {
    lookup,
    deliver: deliverLookup,
    retryNow: retryLookup,
  } = useActivityLookup(joinCodeParam);
  const activity = lookup.state === "found" ? lookup.activity : undefined;

  // A student who still holds a session for the code in the URL, on a lookup
  // that couldn't reach the server. Their seat is real and the server is
  // holding it through its grace window, so they get a holding screen — never
  // the code gate, which would read as "you're out" over a seat that's fine.
  const heldSeatUnreachable =
    lookup.state === "unreachable" &&
    joinCodeParam !== undefined &&
    session?.joinCode === joinCodeParam;

  const isSignedIn =
    activity !== undefined && session?.joinCode === activity.joinCode;

  const isRealActivity =
    activity !== undefined && activity.joinCode !== DEMO_JOIN_CODE;

  // Which real join code the socket said died under us. Latched into state
  // by the presence hook's onEnded callback (the presence value itself
  // resets when its socket tears down) and matched against the current code
  // AND session, so it can't bleed onto another activity; the ended
  // screen's CTA and a fresh sign-in clear it explicitly.
  const [goneCode, setGoneCode] = useState<string | null>(null);
  const activityGoneFromSocket =
    goneCode !== null &&
    goneCode === joinCodeParam &&
    session?.joinCode === goneCode;

  // The REST path of the same truth: a resolved not-found while the session
  // holds a seat token for that exact code. The token is proof the code WAS
  // real, so this is "the class ended", never "recheck your code" — this is
  // the wake-after-deploy path (dark phone → reload → 404).
  const activityGoneFromLookup =
    joinCodeParam !== undefined &&
    lookup.state === "not-found" &&
    session?.joinCode === joinCodeParam &&
    session.token !== undefined;

  const activityGone = activityGoneFromSocket || activityGoneFromLookup;

  // Both roads to the latch: the socket's activity:ended and the demo's
  // "teacher ends the activity" beat.
  const latchActivityGone = () => {
    if (activity) setGoneCode(activity.joinCode);
  };

  // The demo arrives with a name ready, so the lobby is one click away; it
  // stays editable, and real codes always start blank.
  const demoPrefillName =
    activity?.joinCode === DEMO_JOIN_CODE ? DEMO_STUDENT_NAME : "";
  const [name, setName] = useState(demoPrefillName);
  const [removedByTeacher, setRemovedByTeacher] = useState(false);
  // Code-entry state lives here, not in JoinGateCard: the page persists
  // across the /activity/join ↔ /activity/join/:code SPA navigation, so a
  // page-level seed keeps the last-typed code through a browser-back from the
  // lobby (the "redo a wrong name" flow) — a card-local seed would reset it,
  // since the card unmounts once the stage leaves the gate.
  const [code, setCode] = useState(() => joinCodeParam ?? "");

  // The seated stages — lobby, chatting, ended — are exactly "signed into a
  // found activity"; which of the three is a `match`/`chatEnded` detail, so
  // this gate can be read before useActiveMatch owns that state. (The same
  // set as `baseStage` being one of those three, minus the match dependency.)
  const seated =
    joinCodeParam !== undefined &&
    lookup.state !== "loading" &&
    activity !== undefined &&
    isSignedIn;

  const {
    match,
    chatEnded,
    setChatEnded,
    liveEndReason,
    liveEndedBy,
    revealed,
    startMatch,
    backToLobby,
    presence,
    paused: livePaused,
    retrying,
    retry,
    returnToLobby,
    leaveChat,
    sendChatMessage,
    retryLiveMessage,
    sendHoldUntil,
    sendTyping,
  } = useActiveMatch({
    activity,
    session,
    updateSession,
    seated,
    isRealActivity,
    activityGoneFromSocket,
    // Removal drives the same flow the demo button does — except the name
    // field stays blank on real activities (founder call: most removals
    // target a fake name, so don't hand it back for one-tap re-entry; a
    // mistyped real name is quick to retype). Mid-chat removals clear the
    // match with the seat (in the hook).
    onRemoved: () => {
      signOut();
      setName("");
      setRemovedByTeacher(true);
    },
    // Latch the dead activity's code, which flips the stage to activity-gone
    // — except over an ended chat, which holds the screen until its CTA.
    onEnded: () => latchActivityGone(),
    // The teacher edited the lobby's details mid-activity (feature 17, the
    // roster added by 18): rebuild the activity field-by-field and settle it
    // into the lookup — settled state outranks the hand-off map and any
    // refetch, so every render site (lobby chips, join gate) follows without
    // new state. A silent swap by design, like activity:paused. null
    // instructions OMIT the key, the server's own shape, so the lobby's
    // block disappears rather than rendering empty.
    //
    // This is the LOBBY roster and nothing else. A student mid-chat gets
    // this event too, and their chat does not move: in-chat labels resolve
    // against the frozen `cast` chat:started carried, never this lookup
    // (feature 18 prompt 1). `?? activity.characters` covers the deploy
    // window where the server hasn't started sending the roster yet.
    onActivityDetails: (payload) => {
      if (!activity) return;
      const next: Activity = {
        joinCode: activity.joinCode,
        hostName: payload.hostName,
        characters: payload.characters ?? activity.characters,
      };
      if (payload.studentInstructions !== null) {
        next.studentInstructions = payload.studentInstructions;
      }
      deliverLookup(next);
    },
  });

  // The classic stage machine. The activity-gone override is layered on
  // AFTER the presence hook has had its say; the base value keys off the
  // demo/live match state that useActiveMatch owns.
  const baseStage: StudentStage = !joinCodeParam
    ? "code"
    : lookup.state === "loading"
      ? "loading"
      : heldSeatUnreachable
        ? "reconnecting"
        : !activity
          ? "code"
          : !isSignedIn
            ? "name"
            : match
              ? chatEnded
                ? "ended"
                : "chatting"
              : "lobby";
  // The gone latch outranks every stage but one: a student reading their
  // ended chat keeps it. End activity settles every chat before it tears the
  // activity down, so the wrap-up — reveal included — is already on screen
  // when activity:ended lands, and it renders from `chatEnded` state that
  // needs no socket. The gone card takes over on the student's own tap, when
  // backToLobby drops baseStage out of "ended". A student still in the lobby
  // has nothing to keep and goes straight to the card, as before.
  const stage: StudentStage =
    activityGone && baseStage !== "ended" ? "activity-gone" : baseStage;

  const { classPaused, setClassPaused, demoWifiBlip, triggerWifiBlip } =
    useDemoLobby({ stage, activity, startMatch });

  // Only a *resolved* landing at the code-entry gate ends a session: bare
  // /activity/join (browser back from the lobby is how a student redoes a
  // wrong name — see DECISIONS.md) or a code the server said doesn't exist.
  // The in-flight lookup and an unreachable server never sign anyone out —
  // with an async lookup, a lobby refresh passes through a "no activity
  // yet" moment, and signing out on it would destroy the session on every
  // refresh. Unreachable keeps the session so the lobby comes right back
  // once the server answers again. The activity-gone screen also holds the
  // session (it renders FROM it) — its CTA lands here signed-in on purpose,
  // and that's when the sign-out finally runs.
  useEffect(() => {
    const resolvedToCodeEntry =
      joinCodeParam === undefined || lookup.state === "not-found";
    if (resolvedToCodeEntry && session && !activityGoneFromLookup) signOut();
  }, [joinCodeParam, lookup.state, session, signOut, activityGoneFromLookup]);

  // While a chat is on screen (live or just ended) the layout swaps its brand
  // pill for the student's name badge — same condition that renders ChatStage
  // below. See DECISIONS.md → "The brand home link disappears mid-chat and
  // while hosting" and "Mid-chat, the student's name is a corner badge".
  const chatStudentName = activity && session && match ? session.name : null;
  useEffect(() => {
    setChatStudentName(chatStudentName);
    return () => setChatStudentName(null);
  }, [chatStudentName, setChatStudentName]);

  usePageTitle(PAGE_TITLES[stage]);

  // Match changes swap the screen on this same route (lobby → chat, rematch,
  // back to lobby) without navigating, so ScrollToTop can't see them — open
  // each one at the top like a fresh page. Keyed on the match's IDENTITY,
  // not the object: a live chat:update replaces the object mid-chat and
  // must not yank the reader to the top. Layout effect so the jump lands
  // before paint; the ref skips the initial mount, leaving arrival scrolling
  // (including ScrollToTop's back/forward exception) alone. Chatting → ended
  // stays put on purpose: that swap happens in place, mid-read.
  const matchKey =
    match === null
      ? null
      : match.kind === "demo"
        ? `demo-${match.seq}`
        : match.chatId;
  const previousMatchKeyRef = useRef(matchKey);
  useLayoutEffect(() => {
    if (previousMatchKeyRef.current !== matchKey) window.scrollTo(0, 0);
    previousMatchKeyRef.current = matchKey;
  }, [matchKey]);

  const lobbyConnection: LobbyConnectionState =
    activity?.joinCode === DEMO_JOIN_CODE
      ? demoWifiBlip
        ? "reconnecting"
        : "connected"
      : presence === "reconnecting"
        ? "reconnecting"
        : "connected";

  // The lobby's leave door. Same road browser-back takes: land on code entry,
  // where the resolved-code-entry effect above signs the student out, and the
  // presence hook's teardown emits the flush-protected `lobby:leave` on its
  // way down. Never a second hand-rolled emit — the LEAVE_FLUSH_MS gap in
  // useLobbyPresence is a prod lesson, and this path already carries it.
  const leaveActivity = () => navigate("/activity/join");

  // Mock event: the teacher kicks the student out of the activity. They're
  // signed out on the spot and land back on the name step (which the demo
  // refills, so rejoining stays one click).
  const teacherRemovesStudent = () => {
    signOut();
    setName(demoPrefillName);
    setRemovedByTeacher(true);
  };

  // The name-stage submit's page effects: a fresh sign-in must not inherit a
  // dead activity's latch (the same 4-digit code can be minted again), and
  // it always starts in the lobby — never in a chat a previous session left
  // behind (e.g. after hopping via the URL bar).
  const handleJoinActivity = () => {
    if (!activity) return;
    setRemovedByTeacher(false);
    setGoneCode(null);
    backToLobby();
    signIn({ name: name.trim(), joinCode: activity.joinCode });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6">
      {/* From the name stage on, the world is honest about being the demo
          (the code screen resolves no activity, so it can't know yet). */}
      {activity?.joinCode === DEMO_JOIN_CODE && <DemoBanner onWorld />}
      {stage === "activity-gone" ? (
        // The class died under a seated student (deploy/restart wipe, TTL).
        // First in the chain on purpose: it renders from the session alone,
        // before any activity-dependent branch can fall through, and its
        // CTA is what finally signs the student out (see the effect above).
        <ActivityGoneCard
          onEnterNewCode={() => {
            setGoneCode(null);
            navigate("/activity/join");
          }}
        />
      ) : activity && session && match ? (
        // Chatting + chat ended, on this same route. Keyed per match so a
        // rematch always boots a fresh chat.
        match.kind === "demo" ? (
          <ChatStage
            key={match.seq}
            studentName={session.name}
            scenarioKey={match.scenarioKey}
            onEndedChange={setChatEnded}
            onBackToLobby={backToLobby}
            classPaused={classPaused}
            onClassPausedChange={setClassPaused}
            activityEnded={activityGone}
            onActivityEnds={latchActivityGone}
          />
        ) : (
          <LiveChatStage
            key={match.chatId}
            self={match.self}
            peers={match.peers}
            everPeers={match.everPeers}
            messages={match.messages}
            typingPeerId={match.typingPeerId}
            offlinePeers={match.offlinePeers}
            returnedFlashId={match.returnedFlashId}
            isEnded={chatEnded}
            endReason={liveEndReason}
            endedByPeerId={liveEndedBy}
            revealNames={revealed}
            isPaused={livePaused}
            // The lobby's pill and the chat's banner read one value: your
            // own drop is the same event on either screen.
            connection={lobbyConnection}
            activityEnded={activityGone}
            onSend={sendChatMessage}
            onRetryMessage={retryLiveMessage}
            sendHoldUntil={sendHoldUntil}
            onTyping={sendTyping}
            // The exit keeps the seat: chat:leave ends the chat (or steps
            // out of a group), the server answers with chat:ended, and the
            // student reads their wrap-up screen right here. Leaving the
            // activity is a lobby act now, not a chat one.
            onEndChat={leaveChat}
            // The ended screen's Back tap: the server returns the
            // wrapping-up seat to the queue with a fresh clock, and the
            // local match state clears. With the activity gone the emit is
            // already a no-op (the presence hook dropped its socket when the
            // latch flipped), and clearing the match is what hands the screen
            // to the activity-over card.
            onBackToLobby={() => {
              returnToLobby();
              backToLobby();
            }}
          />
        )
      ) : stage === "lobby" && activity && session ? (
        presence === "full" ? (
          // The seat cap said no — the lobby gate's own copy, with a way to
          // retry (a freed seat lets them in) and a way out.
          <ActivityFullCard
            retrying={retrying}
            onRetry={retry}
            onUseAnotherCode={() => navigate("/activity/join")}
          />
        ) : (
          <>
            <div className={cn(STUDENT_CARD_CLASS, "w-full p-5 sm:p-6")}>
              <WaitingLobby
                activity={activity}
                studentName={session.name}
                isPaused={isRealActivity ? livePaused : classPaused}
                connection={lobbyConnection}
                onLeaveActivity={leaveActivity}
              />
            </div>
            {/* Demo steering is demo furniture: a real activity's lobby
                waits for a real teacher, so it renders none of this. */}
            {activity.joinCode === DEMO_JOIN_CODE && (
              <LobbyDemoControls
                onTeacherRemove={teacherRemovesStudent}
                onMatch={startMatch}
                classPaused={classPaused}
                onClassPausedChange={setClassPaused}
                wifiBlipActive={demoWifiBlip}
                onWifiBlip={triggerWifiBlip}
              />
            )}
          </>
        )
      ) : stage === "loading" ? (
        <LoadingCard />
      ) : stage === "reconnecting" && session ? (
        // Signed in, seat held, server not answering — wait it out here. The
        // lookup is already retrying on its own; the button is for a student
        // who knows their wifi came back and doesn't want to wait for the
        // next attempt.
        <ReconnectingCard studentName={session.name} onTryNow={retryLookup} />
      ) : (
        <JoinGateCard
          stage={stage}
          activity={activity}
          joinCodeParam={joinCodeParam}
          lookupState={lookup.state}
          code={code}
          onCodeChange={setCode}
          name={name}
          onNameChange={setName}
          removedByTeacher={removedByTeacher}
          onJoinActivity={handleJoinActivity}
          onDeliverLookup={deliverLookup}
        />
      )}
    </div>
  );
}
