import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Loader2 } from "lucide-react";

import { STUDENT_NAME_MAX_CHARS } from "@chaverola/shared";

import { Button } from "@/components/ui/button";
import { getActivity } from "@/lib/api";
import { useLocaleNavigate } from "@/lib/locale";
import type { Activity } from "@/types/activity";
import {
  primeActivityLookup,
  type ActivityLookup,
} from "@/lib/useActivityLookup";
import { DEMO_JOIN_CODE } from "@/mockData";

import { StageCard } from "./StageCard";
import type { CodeProblem, StudentStage } from "./stageTypes";

/**
 * The one form serving both gate stages — code entry and name entry — on one
 * route; only the input and the button label change between them. Owns the
 * code-entry submit machinery (the state and the lookup);
 * `name` / `removedNotice` arrive as props because socket and demo flows
 * write them. The name-stage submit's page effects (sign-in, latch clears)
 * are `onJoinActivity`; the same-URL resubmit hands its fetched activity back
 * through `onDeliverLookup`.
 */
export function JoinGateCard({
  stage,
  activity,
  joinCodeParam,
  lookupState,
  code,
  onCodeChange,
  name,
  onNameChange,
  removedNotice,
  onJoinActivity,
  onDeliverLookup,
}: {
  stage: StudentStage;
  activity: Activity | undefined;
  joinCodeParam: string | undefined;
  lookupState: ActivityLookup["state"];
  // Code state is owned by the shell, not this card: the page persists across
  // the /activity/join ↔ /activity/join/:code SPA navigation, but this card
  // unmounts whenever the stage leaves the gate (lobby, chat), so a
  // card-local seed would drop a typed code on the browser-back-from-lobby
  // flow. Page-level state keeps the last code exactly as before.
  code: string;
  onCodeChange: (value: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  /** A removal sent them here, and from where — null on an ordinary gate. */
  removedNotice: "lobby" | "chat" | null;
  onJoinActivity: () => void;
  onDeliverLookup: (activity: Activity) => void;
}) {
  const { t } = useTranslation("student");
  const navigate = useLocaleNavigate();

  // The message under the code input has two sources: a submit that came
  // back empty-handed (state), and a shared-link arrival whose URL code
  // resolved to nothing (derived straight from the lookup, so it's already
  // showing when the code gate appears). Typing dismisses both.
  const [submitProblem, setSubmitProblem] = useState<CodeProblem | null>(null);
  const [lookupProblemDismissed, setLookupProblemDismissed] = useState(false);
  const lookupProblem: CodeProblem | null =
    joinCodeParam !== undefined &&
    (lookupState === "not-found" || lookupState === "unreachable")
      ? lookupState
      : null;
  const codeProblem =
    submitProblem ?? (lookupProblemDismissed ? null : lookupProblem);
  // True while the code-entry submit's own lookup is in flight.
  const [lookingUpCode, setLookingUpCode] = useState(false);

  // Autofocusing an input on a phone pops the keyboard over half the world,
  // so phones only get it when there's typing to do: never on the code input
  // (fresh landing, let the page breathe first), not on a prefilled demo name,
  // and not after a removal — the notice above the field is the whole point of
  // that landing, and the keyboard would cover it. Desktop always autofocuses
  // — no keyboard to pop, and Enter submits the prefilled name straight away.
  const isDesktopViewport = window.matchMedia("(min-width: 640px)").matches;

  const isCodeComplete = /^\d{4}$/.test(code);
  const canJoin = name.trim().length > 0;
  const canSubmit =
    stage === "name" ? canJoin : isCodeComplete && !lookingUpCode;

  // One form serves both gate stages; only the input and the button label
  // change between them.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (stage === "name") {
      if (!activity) return;
      onJoinActivity();
      return;
    }
    // The demo code resolves with zero network — the demo works offline.
    if (code === DEMO_JOIN_CODE) {
      setSubmitProblem(null);
      navigate(`/activity/join/${code}`);
      return;
    }
    setLookingUpCode(true);
    void getActivity(code).then((result) => {
      setLookingUpCode(false);
      if (!result.ok) {
        setSubmitProblem(
          result.kind === "not_found" ? "not-found" : "unreachable"
        );
        return;
      }
      setSubmitProblem(null);
      if (code === joinCodeParam) {
        // Already on this URL (a lobby refresh that found the server down,
        // then a resubmit): navigating is a no-op, so hand the activity to
        // the lookup directly.
        onDeliverLookup(result.data.activity);
      } else {
        // Hand the fetched activity to the target route's fresh lookup so
        // the code input swaps in-place for the name input (see
        // DECISIONS.md) instead of flashing a loading screen over a
        // refetch.
        primeActivityLookup(result.data.activity);
        navigate(`/activity/join/${code}`);
      }
    });
  };

  return (
    <StageCard className="slide-in-from-bottom-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">
          {t("title.join")}
        </h1>
        {stage === "name" && activity ? (
          <p className="animate-in text-muted-foreground duration-300 fade-in motion-reduce:animate-none">
            {t("gate.hostedBy")}
            {/* The teacher typed this name — isolate it so a Latin one
                  can't drag the "·" to the wrong side of a Hebrew line. */}
            <bdi className="font-semibold text-foreground">
              {activity.hostName}
            </bdi>{" "}
            · {t("gate.code")}{" "}
            {/* Four digits beside a neutral: dir="ltr" or an RTL line
                  reorders them. */}
            <span dir="ltr">{activity.joinCode}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">{t("gate.codePrompt")}</p>
        )}
      </div>

      {removedNotice && (
        <div
          role="alert"
          className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {/* Arriving from a chat, the wrap-up screen already said what
                happened — repeating it here would just be the same sentence
                twice, so this variant is only the instruction. */}
          {removedNotice === "lobby" && t("gate.removed")}
          {t("gate.reenterName")}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        {stage === "name" ? (
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            autoFocus={
              isDesktopViewport || (name === "" && removedNotice === null)
            }
            maxLength={STUDENT_NAME_MAX_CHARS}
            aria-label={t("gate.yourName")}
            placeholder={t("gate.yourName")}
            className="w-full animate-in rounded-2xl border-0 bg-brand-grape-soft px-4 py-4 text-center text-xl font-semibold duration-300 outline-none fade-in slide-in-from-bottom-2 focus:ring-2 focus:ring-brand-grape/40 motion-reduce:animate-none"
          />
        ) : (
          <>
            <input
              value={code}
              onChange={(event) => {
                onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 4));
                setSubmitProblem(null);
                setLookupProblemDismissed(true);
              }}
              // Read-only (not disabled) mid-lookup: edits mid-flight
              // would make the answer about a different code, but a
              // disabled input would drop focus and the phone keyboard.
              readOnly={lookingUpCode}
              inputMode="numeric"
              autoFocus={isDesktopViewport}
              aria-label={t("gate.joinCode")}
              placeholder="1234"
              // dir="ltr" on a four-digit field inside an RTL page:
              // `tracking-[0.4em]` puts a letter-space after the last digit,
              // and centred text lands that gap — and the caret — on the
              // wrong edge without it. The "1234" placeholder pads backwards
              // too.
              dir="ltr"
              className="w-full rounded-2xl border-0 bg-brand-grape-soft py-4 text-center text-3xl font-semibold tracking-[0.4em] outline-none focus:ring-2 focus:ring-brand-grape/40"
            />
            {codeProblem && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {codeProblem === "not-found"
                  ? t("gate.notFound")
                  : t("gate.unreachable")}
              </p>
            )}
          </>
        )}
        <Button
          variant="brand"
          type="submit"
          size="lg"
          disabled={!canSubmit}
          className="w-full"
        >
          {/* flip-rtl on both arrows: they mean "onwards", so they point
                the way the page reads. */}
          {stage === "name" ? (
            <>
              {t("gate.join")}
              <ArrowRight className="flip-rtl size-4" />
            </>
          ) : lookingUpCode ? (
            <>
              {t("gate.finding")}
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            </>
          ) : (
            <>
              {t("gate.continue")}
              <ArrowRight className="flip-rtl size-4" />
            </>
          )}
        </Button>
      </form>
    </StageCard>
  );
}
