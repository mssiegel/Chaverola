import { Loader2, Pause } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { LobbyConnectionState } from "@chaverola/shared";

import { TypingDots } from "@/components/chat/TypingDots";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionLabel } from "@/components/ui/section-label";
import type { Activity } from "@/types/activity";

interface WaitingLobbyProps {
  activity: Activity;
  /** The real name the student signed in with. */
  studentName: string;
  /** The teacher paused the class: matching is on hold and the pill says so. */
  isPaused?: boolean;
  /** The lobby's live connection; "reconnecting" swaps the pill to amber. */
  connection?: LobbyConnectionState;
  /**
   * No teacher device is connected, so nothing is pairing anyone. Defaults
   * to present — the demo has no teacher socket and must keep the happy
   * path, and an older server sends nothing to say otherwise.
   */
  teacherAway?: boolean;
  /** The leave door: hand the student back to code entry, signed out. */
  onLeaveActivity: () => void;
}

/**
 * When the body line stops saying the teacher is picking and starts admitting
 * that time is passing. Real wall clock, never `scaledMs`: this is a real
 * surface, and a kid's patience doesn't compress with the demo's.
 */
const STILL_WAITING_MS = 50_000;
const LONG_WAIT_MS = 150_000;

/**
 * The waiting-room stage of the student flow: the student is in, and the
 * teacher hasn't matched them with a partner yet. Bouncy and a little loud on
 * purpose — this screen's job is to build excitement for the chat.
 */
export function WaitingLobby({
  activity,
  studentName,
  isPaused = false,
  connection = "connected",
  teacherAway = false,
  onLeaveActivity,
}: WaitingLobbyProps) {
  const { t } = useTranslation("student");
  // How long this lobby has been on screen, in two steps. The lobby unmounts
  // whenever the stage leaves it, so a chat and a trip back to the lobby
  // afterwards both start the clock over — which is what a student expects.
  const [waited, setWaited] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setWaited(1), STILL_WAITING_MS),
      setTimeout(() => setWaited(2), LONG_WAIT_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const [leaveOpen, setLeaveOpen] = useState(false);

  // The pill's copy is the baseline that stays; the body line is what moves,
  // so a long wait reads differently from a short one without promising a
  // time. Pause outranks all of it — it's the truer reason nothing's moving.
  const waitingLine =
    waited === 2
      ? t("lobby.waitingLong")
      : waited === 1
        ? t("lobby.waitingStill")
        : t("lobby.waiting", { hostName: activity.hostName });

  // One precedence, read by both the pill and the line above it. Connection
  // trouble outranks the rest: while this socket is down, "paused" and "your
  // teacher's away" are both claims the screen can't back up — it lost the
  // line that would tell it otherwise.
  const hold =
    connection === "reconnecting"
      ? "reconnecting"
      : isPaused
        ? "paused"
        : teacherAway
          ? "teacher-away"
          : "waiting";

  const bodyLine =
    hold === "paused"
      ? t("lobby.paused")
      : hold === "teacher-away"
        ? // "Can't reach" rather than "your teacher stepped away": all the
          // server knows is that no teacher device is connected, which could
          // be a shut laptop, a closed tab, or their wifi. It puts the
          // uncertainty on us instead of pinning a story on the teacher.
          t("lobby.teacherAway")
        : waitingLine;

  return (
    <section className="flex w-full animate-in flex-col items-center gap-6 text-center duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none">
      <div className="space-y-2 pt-2">
        <h1 className="text-3xl font-semibold text-foreground">
          {t("lobby.title", { name: studentName })}
        </h1>
        <p className="text-muted-foreground" aria-live="polite">
          {bodyLine}
        </p>
      </div>

      {hold === "reconnecting" ? (
        <div
          className="flex items-center gap-2.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
          aria-live="polite"
        >
          <Loader2
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          {t("reconnecting.pill")}
        </div>
      ) : hold === "paused" ? (
        <div
          className="flex items-center gap-2.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
          aria-live="polite"
        >
          <Pause aria-hidden className="size-4" />
          {t("lobby.pillPaused")}
        </div>
      ) : hold === "teacher-away" ? (
        // The waiting pill's own colors, minus the dots. Amber would read as
        // a warning about something the student can't fix, and the dots would
        // keep promising a matchmaker that isn't running (founder call).
        <div
          className="flex items-center gap-2.5 rounded-full border border-brand-grape/25 bg-brand-grape-soft px-4 py-2 text-sm font-semibold text-brand-grape-strong"
          aria-live="polite"
        >
          {t("lobby.pillTeacherAway")}
        </div>
      ) : (
        <div
          className="flex items-center gap-2.5 rounded-full border border-brand-grape/25 bg-brand-grape-soft px-4 py-2 text-sm font-semibold text-brand-grape-strong"
          aria-live="polite"
        >
          {t("lobby.pillWaiting")}
          <TypingDots dotClassName="bg-brand-mint" aria-hidden />
        </div>
      )}

      <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-5 text-start shadow-sm">
        {/* Every value in this card is teacher-typed, so each one isolates
            itself: a Latin name or an English instruction inside a Hebrew
            card must not drag the punctuation around it. */}
        <div>
          <SectionLabel>{t("lobby.hostedBy")}</SectionLabel>
          <bdi className="mt-0.5 block font-medium text-foreground">
            {activity.hostName}
          </bdi>
        </div>

        <div>
          <SectionLabel>{t("lobby.characters")}</SectionLabel>
          <ul className="mt-2 flex flex-wrap gap-2">
            {activity.characters.map((character) => (
              <li
                key={character.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
              >
                <bdi>{character.name}</bdi>
              </li>
            ))}
          </ul>
        </div>

        {activity.studentInstructions && (
          <div>
            <SectionLabel>{t("lobby.instructions")}</SectionLabel>
            <bdi className="mt-0.5 block text-sm leading-relaxed text-foreground">
              {activity.studentInstructions}
            </bdi>
          </div>
        )}
      </div>

      {/* Leaving is the rare path, so it's link weight, not a second CTA that
          competes with waiting. Ending a chat keeps your seat; this is the
          act that gives it up — see DECISIONS.md → "Ending your own chat
          keeps your seat". */}
      <button
        type="button"
        onClick={() => setLeaveOpen(true)}
        className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        {t("lobby.leave")}
      </button>

      {/* No match-arrived guard needed: a chat:started swaps the stage, which
          unmounts this whole lobby and takes the open dialog with it. A
          matched seat can never be given up through the lobby door. */}
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        onConfirm={() => {
          setLeaveOpen(false);
          onLeaveActivity();
        }}
        title={t("lobby.leaveTitle")}
        description={t("lobby.leaveBody")}
        confirmLabel={t("lobby.leaveConfirm")}
        cancelLabel={t("lobby.leaveCancel")}
      />
    </section>
  );
}
