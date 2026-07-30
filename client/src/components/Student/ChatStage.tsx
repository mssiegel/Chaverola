import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, PartyPopper, Pause, Play } from "lucide-react";

import { useChatDemo } from "@/components/chat/useChatDemo";
import { ChatDemoControls } from "@/components/demo/ChatDemoControls";
import { EventButton } from "@/components/demo/DemoControls";
import { Chatbox } from "@/components/Student/Chatbox";
import { ChatStageFrame } from "@/components/Student/ChatStageFrame";
import { useDemoContent } from "@/lib/demoContent";
import { scaledMs } from "@/lib/demoTime";
import { useBackGuard } from "@/lib/useBackGuard";
import type { ActivityChatScenarioKey } from "@/mockData";
import { DEMO_WIFI_BLIP_MS } from "@/pages/student/join/stageTypes";

interface ChatStageProps {
  /** The real name the student signed in with. */
  studentName: string;
  /** Which mock match the lobby's demo trigger fired (1:1 or group of 3). */
  scenarioKey: ActivityChatScenarioKey;
  /** Reports the chat ending / restarting so the page can derive its stage. */
  onEndedChange: (ended: boolean) => void;
  onBackToLobby: () => void;
  /**
   * The teacher's activity-wide pause, owned by the page so it outlives this
   * match (lobby ⇄ chat ⇄ ended). The demo triggers below flip it.
   */
  classPaused: boolean;
  onClassPausedChange: (paused: boolean) => void;
  /** The page has latched the activity as over — the ended screen's CTA
   *  closes out instead of offering a lobby that no longer exists. */
  activityEnded: boolean;
  /** The demo's "teacher ends the activity" beat: latch that on the page. */
  onActivityEnds: () => void;
}

/**
 * The chatting + chat-ended stages of the student flow: the real chatbox
 * driven by the mock engine, plus the demo steering panel. Mounted fresh
 * per match (the page keys it), so every match starts a clean chat. No
 * identity bar here — the chat header already says who you're with (see
 * DECISIONS.md).
 */
export function ChatStage({
  studentName,
  scenarioKey,
  onEndedChange,
  onBackToLobby,
  classPaused,
  onClassPausedChange,
  activityEnded,
  onActivityEnds,
}: ChatStageProps) {
  const { t } = useTranslation("student");
  const demo = useDemoContent();
  // Built once per mount: the scenario is this match's identity, with the
  // signed-in student's real name behind their character.
  const [scenario] = useState(() => {
    const base = demo.chatScenarios[scenarioKey];
    return { ...base, self: { ...base.self, realName: studentName } };
  });
  // Both tabs stay independently mocked — there's no cross-tab sync with a
  // teacher's live settings.
  const chat = useChatDemo(scenario, { isPaused: classPaused });

  // The demo's stand-in for the teacher's activity-level "reveal names"
  // setting. It stays local and stays a toggle: the two demo tabs share no
  // state by design (see DECISIONS.md), so a demo student has no teacher to
  // read the setting from, and this switch is how a visitor sees both
  // outcomes. A real chat gets the same prop off chat:ended, where the
  // server decides it at end time from the teacher's setting.
  const [revealNames, setRevealNames] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // The demo's own wifi blip, the lobby trigger's twin (same length, same
  // scaledMs). It skips the live stage's debounce on purpose: a visitor who
  // just pressed the button should see something happen.
  const [selfBlip, setSelfBlip] = useState(false);
  useEffect(() => {
    if (!selfBlip) return;
    const timer = setTimeout(
      () => setSelfBlip(false),
      scaledMs(DEMO_WIFI_BLIP_MS)
    );
    return () => clearTimeout(timer);
  }, [selfBlip]);

  useEffect(() => {
    onEndedChange(chat.isEnded);
  }, [chat.isEnded, onEndedChange]);

  // A stray back-swipe must never silently kill a live chat: back opens the
  // same exit confirmation as the header button — Leave in a group, End in
  // a 2-person chat (see DECISIONS.md).
  useBackGuard(!chat.isEnded, () => setConfirmOpen(true));

  return (
    <>
      <ChatStageFrame>
        <Chatbox
          chat={{
            ...chat,
            selfConnection: selfBlip ? "reconnecting" : "connected",
          }}
          revealNames={revealNames}
          onSend={chat.send}
          onEndChat={() => chat.endChat("student")}
          onLeaveChat={chat.leaveChat}
          onBackToLobby={onBackToLobby}
          endConfirmOpen={confirmOpen}
          onEndConfirmOpenChange={setConfirmOpen}
          activityEnded={activityEnded}
          // Sending on a phone gives the keyboard back, which is what puts
          // the steering panel below back within reach. LiveChatStage's
          // silence here is the other half: nothing is hidden below a real
          // chat, so it holds the keyboard for the next message.
          releaseKeyboardOnSend
        />
      </ChatStageFrame>

      {/* Hidden on phones while the composer has focus. Not cosmetic: this
          panel is what sits BELOW the input, and as long as it's there the
          browser has somewhere to pan a focused input to — which is how the
          demo's composer ended up off screen with the keyboard open. Dismiss
          the keyboard to steer the demo again. */}
      <div className="w-full max-sm:group-has-[textarea:focus]:hidden">
        {/* The join flow's extra triggers: end sources that exist only once a
            teacher and an activity clock are in the room. */}
        <ChatDemoControls
          chat={chat}
          onWorld
          revealNames={revealNames}
          onRevealNamesChange={setRevealNames}
          selfBlipActive={selfBlip}
          onSelfBlip={() => setSelfBlip(true)}
          extraEvents={
            <>
              <EventButton
                onWorld
                onClick={() => chat.endChat("teacher")}
                disabled={chat.isEnded}
                icon={<GraduationCap className="size-4" />}
              >
                {t("demo.teacherEndsChat")}
              </EventButton>
              {/* The bell: every chat ends AND the activity closes. The
                  wrap-up screen (reveal included) holds, and its CTA lands on
                  the activity-over card — the live sequencing, mocked.
                  onEndedChange is called by hand alongside the engine's own
                  ending: the effect that normally reports it lands a render
                  late, and the page would flip to the activity-over card
                  before the wrap-up ever drew. */}
              <EventButton
                onWorld
                onClick={() => {
                  chat.endChat("teacher");
                  onEndedChange(true);
                  onActivityEnds();
                }}
                disabled={chat.isEnded}
                icon={<PartyPopper className="size-4" />}
              >
                {t("demo.teacherEndsActivity")}
              </EventButton>
              {/* Deliberately not gated on isEnded: pause is world-level, so
                  flipping it from the ended screen sends the student back to a
                  paused (or resumed) lobby. */}
              <EventButton
                onWorld
                onClick={() => onClassPausedChange(true)}
                disabled={classPaused}
                icon={<Pause className="size-4" />}
              >
                {t("demo.pause")}
              </EventButton>
              <EventButton
                onWorld
                onClick={() => onClassPausedChange(false)}
                disabled={!classPaused}
                // No flip-rtl on Play: a transport control points the same
                // way on every remote in the world.
                icon={<Play className="size-4" />}
              >
                {t("demo.resume")}
              </EventButton>
            </>
          }
        />
      </div>
    </>
  );
}
