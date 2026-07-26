import { Loader2, Pause } from "lucide-react";
import { useEffect, useState } from "react";

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
  onLeaveActivity,
}: WaitingLobbyProps) {
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
      ? "Longer wait than usual, but you're still in line. Your chat opens as soon as someone's free."
      : waited === 1
        ? "Still finding you a partner. Hang tight, your chat opens right here."
        : `${activity.hostName} is picking who chats with who. When it's your turn, the chat opens right here.`;

  return (
    <section className="flex w-full animate-in flex-col items-center gap-6 text-center duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none">
      <div className="space-y-2 pt-2">
        <h1 className="text-3xl font-semibold text-foreground">
          You're in, {studentName}! 🎉
        </h1>
        <p className="text-muted-foreground" aria-live="polite">
          {isPaused
            ? "Your teacher hit pause for a moment. When things start back up, your chat opens right here."
            : waitingLine}
        </p>
      </div>

      {/* Connection trouble outranks the pause pill: while the socket is
          down, "paused" is a claim this screen can't back up. */}
      {connection === "reconnecting" ? (
        <div
          className="flex items-center gap-2.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
          aria-live="polite"
        >
          <Loader2
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          Reconnecting you…
        </div>
      ) : isPaused ? (
        <div
          className="flex items-center gap-2.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
          aria-live="polite"
        >
          <Pause aria-hidden className="size-4" />
          Class is paused
        </div>
      ) : (
        <div
          className="flex items-center gap-2.5 rounded-full border border-brand-grape/25 bg-brand-grape-soft px-4 py-2 text-sm font-semibold text-brand-grape-strong"
          aria-live="polite"
        >
          Waiting for your match
          <TypingDots dotClassName="bg-brand-mint" aria-hidden />
        </div>
      )}

      <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
        <div>
          <SectionLabel>Hosted by</SectionLabel>
          <p className="mt-0.5 font-medium text-foreground">
            {activity.hostName}
          </p>
        </div>

        <div>
          <SectionLabel>Characters in this activity</SectionLabel>
          <ul className="mt-2 flex flex-wrap gap-2">
            {activity.characters.map((character) => (
              <li
                key={character.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
              >
                {character.name}
              </li>
            ))}
          </ul>
        </div>

        {activity.studentInstructions && (
          <div>
            <SectionLabel>Instructions</SectionLabel>
            <p className="mt-0.5 text-sm leading-relaxed text-foreground">
              {activity.studentInstructions}
            </p>
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
        Leave the activity
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
        title="Leave the activity?"
        description="Your teacher will see you've left. You can rejoin with the same code, but you'd start waiting again."
        confirmLabel="Leave activity"
        cancelLabel="Keep waiting"
      />
    </section>
  );
}
