import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  Check,
  Info,
  Repeat2,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

import type { RailNotice } from "@chaverola/shared";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLocale, type Locale } from "@/lib/locale";
import { listNames } from "@/lib/names";
import { splitWaitShort, type WaitUnit } from "@/lib/time";
import { cn } from "@/lib/utils";

import { EmptyState } from "./EmptyState";
import { NoticeBanner } from "./NoticeBanner";
import type { WaitingStudent } from "./hostWorld";

/** The wait chip's unit → its catalog key. `as const satisfies` keeps the
 *  literals, which is what lets the `t()` below check. */
const WAIT_KEYS = {
  seconds: "pairing.wait.seconds",
  minutes: "pairing.wait.minutes",
} as const satisfies Record<WaitUnit, `pairing.wait.${string}`>;

/**
 * The rail notice, worded here rather than on the server: the wire carries a
 * `RailNotice` (a kind plus its numbers or names), so a Hebrew teacher reads
 * a Hebrew sentence and a student's typed name still passes through verbatim.
 * A plain function taking `t` — pure, and callable from anywhere the catalog
 * is loaded. Names are joined by `Intl.ListFormat` pinned to the reading
 * locale, which isolates each one so a Latin name can't flip the list.
 */
function railNoticeText(
  t: TFunction<["teacher", "common"]>,
  notice: RailNotice,
  locale: Locale
): string {
  if (notice.kind === "tooFewCharacters") {
    return t("pairing.notice.tooFewCharacters", {
      characterCount: notice.characterCount,
      studentCount: notice.studentCount,
    });
  }
  // Exactly two chatted "with each other"; three or more chatted "together" —
  // the same split the rematch heads-up above makes, and not a plural form:
  // English has no category that separates 2 from 3.
  return t(
    notice.names.length === 2
      ? "pairing.notice.stuckInLine.pair"
      : "pairing.notice.stuckInLine.group",
    { names: listNames(notice.names, locale) }
  );
}

export interface PairingPanelProps {
  waiting: WaitingStudent[];
  /** Nobody has joined at all — a fresh real activity, not a busy round. */
  noStudentsYet: boolean;
  /** Every tick on screen — a reconnecting student keeps theirs. */
  selectedIds: string[];
  /** The ticked students the server would actually pair right now. */
  actionableSelectedIds: string[];
  onToggleSelect: (studentId: string) => void;
  /** min(4, characters on the roster) — how big a selection can get. */
  maxGroupSize: number;
  onStartChat: () => void;
  onPairEveryone: () => void;
  onRequestRemove: (student: WaitingStudent) => void;
  /** Selection-time rematch heads-up (never blocks anything). */
  rematchWarning: string | null;
  /** Why the last press didn't do what the teacher expected, dismissible:
   *  pair-everyone's forced-repeat note, or a start the cast couldn't seat.
   *  Data, not prose — this panel words it (see railNoticeText). */
  railNotice: RailNotice | null;
  onDismissRailNotice: () => void;
  /** Pair-everyone's odd one out, highlighted as first in line. */
  leftoverStudentId: string | null;
  autoMatchOn: boolean;
  autoMatchSeconds: number;
  /** The activity-wide pause: matching is on hold, and the row says so. */
  paused?: boolean;
  /** Flips the real activity setting — the same one Edit activity settings shows. */
  onAutoMatchChange: (on: boolean) => void;
  /** Post-End-all hold banner — only when End-all itself turned auto-match off. */
  showHoldNotice: boolean;
  onDismissHoldNotice: () => void;
}

/**
 * The waiting queue and everything the teacher does with it. Students render
 * in join order — new joiners append at the bottom, so the longest-waiting
 * sit on top and the list never reshuffles under the teacher's cursor.
 * Pairing is tap-to-select; characters are assigned randomly when the chat
 * starts (no assignment step). Each row's remove control is separate from
 * the select target so the two taps never collide. See DECISIONS.md.
 *
 * A student marked "reconnecting" renders dimmed with a lost-connection tag:
 * their seat is riding out its grace window, the wait clock keeps ticking,
 * and they stay out of every count and gate here — a button that lights up
 * for students the server won't pair does nothing when it's tapped. A tick
 * they already had survives the blip, though: it renders beside the tag, and
 * tapping the row still clears it, so one sleeping phone can't strand a
 * selection the teacher wants to change.
 */
export function PairingPanel({
  waiting,
  noStudentsYet,
  selectedIds,
  actionableSelectedIds,
  onToggleSelect,
  maxGroupSize,
  onStartChat,
  onPairEveryone,
  onRequestRemove,
  rematchWarning,
  railNotice,
  onDismissRailNotice,
  leftoverStudentId,
  autoMatchOn,
  autoMatchSeconds,
  paused = false,
  onAutoMatchChange,
  showHoldNotice,
  onDismissHoldNotice,
}: PairingPanelProps) {
  const { t } = useTranslation(["teacher", "common"]);
  const locale = useLocale();
  const selectionFull = selectedIds.length >= maxGroupSize;
  // Rows list everyone; counts and CTAs follow who the server would actually
  // pair. Derived here rather than passed in, so the button and the number
  // beside it can never drift apart.
  const connectedCount = waiting.filter(
    (s) => s.connection === "connected"
  ).length;
  // Ticked but off the air. Start counts only who can pair, so name the ones
  // it's waiting on rather than leave the teacher doing the subtraction.
  const parkedNames = waiting
    .filter(
      (s) => selectedIds.includes(s.id) && !actionableSelectedIds.includes(s.id)
    )
    .map((s) => s.realName);
  // The host page renders this panel twice (desktop rail + the phones'
  // collapsible section), so the switch id must be unique per instance.
  const autoMatchSwitchId = useId();

  return (
    <div className="flex flex-col gap-4">
      {/* Above the empty-state branch on purpose: right after End-all the
          queue is briefly empty while students wrap up, and this is exactly
          when the teacher needs to see the hold. The count is live — it
          climbs as students come back. */}
      {showHoldNotice && (
        <NoticeBanner
          icon={Zap}
          onDismiss={onDismissHoldNotice}
          dismissLabel={t("common:dialog.dismiss")}
          footer={
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAutoMatchChange(true)}
              className="mt-2 w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100 hover:text-amber-900"
            >
              <Zap aria-hidden />
              {t("pairing.hold.turnOn")}
            </Button>
          }
        >
          {connectedCount === 0
            ? // Zero is its own sentence, not a plural form.
              t("pairing.hold.none")
            : t("pairing.hold.waiting", { count: connectedCount })}
        </NoticeBanner>
      )}

      {waiting.length === 0 ? (
        noStudentsYet ? (
          <EmptyState className="py-8">
            <p className="text-2xl" aria-hidden>
              📣
            </p>
            <p className="mt-1 font-semibold text-foreground">
              {t("pairing.empty.noStudents.title")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pairing.empty.noStudents.body")}
            </p>
          </EmptyState>
        ) : (
          <EmptyState className="py-8">
            <p className="text-2xl" aria-hidden>
              🎉
            </p>
            <p className="mt-1 font-semibold text-foreground">
              {t("pairing.empty.chatting.title")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pairing.empty.chatting.body")}
            </p>
          </EmptyState>
        )
      ) : (
        <>
          {/* lg: matches the host page's rail breakpoint — only the desktop
              mount scrolls internally, so the CTAs pin there and nowhere else.
              Order is deliberate: the confirm CTA sits second, adjacent to
              the names the teacher just tapped. */}
          <div className="flex flex-col gap-2 lg:sticky lg:top-0 lg:z-10 lg:bg-card lg:pb-2">
            <Button
              variant="outline"
              onClick={onPairEveryone}
              // Two connected students, or the server pairs nobody and the
              // tap is a silent no-op.
              disabled={connectedCount < 2}
              className="w-full"
            >
              <UsersRound aria-hidden />
              {t("pairing.pairEveryone")}
            </Button>
            <Button
              onClick={onStartChat}
              disabled={actionableSelectedIds.length < 2}
              className="w-full"
            >
              <Sparkles aria-hidden />
              {actionableSelectedIds.length >= 2
                ? t("pairing.startWithCount", {
                    selected: actionableSelectedIds.length,
                  })
                : t("pairing.start")}
            </Button>
            {parkedNames.length > 0 && (
              <p role="status" className="text-xs text-amber-700">
                {t("pairing.parked", {
                  names: listNames(parkedNames, locale),
                })}
              </p>
            )}
          </div>
          <p className="-mt-2 text-xs text-muted-foreground lg:-mt-4">
            {maxGroupSize > 2
              ? t("pairing.tapHintGroup", { max: maxGroupSize })
              : t("pairing.tapHint")}
          </p>

          {/* No flip-rtl on Repeat2: it's a cycle, not a direction. */}
          {rematchWarning && (
            <NoticeBanner icon={Repeat2}>{rematchWarning}</NoticeBanner>
          )}

          {/* One slot, two messages: why pair-everyone skipped a pair, and why
              a start the cast couldn't seat did nothing (feature 18). Hence
              the neutral icon — the box means "here's why that didn't do what
              you expected", and only the warning above is about a rematch. */}
          {railNotice && (
            <NoticeBanner
              icon={Info}
              onDismiss={onDismissRailNotice}
              dismissLabel={t("common:dialog.dismiss")}
            >
              {railNoticeText(t, railNotice, locale)}
            </NoticeBanner>
          )}

          <ul className="flex flex-col gap-1.5">
            {waiting.map((student) => {
              const selected = selectedIds.includes(student.id);
              const isLeftover = student.id === leftoverStudentId;
              const dropped = student.connection === "reconnecting";
              const wait = splitWaitShort(student.waitSeconds);
              // Both tags never show at once — a dropped student can't be
              // paired, so "first in line" would be an empty promise.
              const rowContent = (
                <>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                      selected
                        ? "border-brand-grape bg-brand-grape text-white"
                        : "border-input bg-background"
                    )}
                  >
                    {selected && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    <bdi>{student.realName}</bdi>
                  </span>
                  {isLeftover && !dropped && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      {t("pairing.firstInLine")}
                    </span>
                  )}
                  {dropped && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      {t("common:lostConnection")}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {t(WAIT_KEYS[wait.unit], { value: wait.value })}
                  </span>
                </>
              );
              return (
                <li
                  key={student.id}
                  className={cn(
                    "flex items-center gap-0.5 rounded-xl border p-1 transition-colors lg:scroll-mt-24",
                    selected
                      ? "border-brand-grape/50 bg-brand-grape-soft/60"
                      : "border-border bg-card",
                    isLeftover &&
                      !selected &&
                      !dropped &&
                      "border-amber-300 bg-amber-50"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onToggleSelect(student.id)}
                    aria-pressed={selected}
                    // A dropped student can't be newly ticked — their seat is
                    // unmatchable while it rides out the grace window (founder
                    // call), and the disabled dim doubles as the row's
                    // marking. Untapping one that's already ticked stays live:
                    // otherwise a blip at a full selection locks the teacher
                    // out of pairing anyone at all.
                    disabled={!selected && (dropped || selectionFull)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60",
                      // A ticked dropped row is still tappable (to untick), so
                      // the dim has to come from the drop, not from disabled.
                      dropped && "opacity-60"
                    )}
                  >
                    {rowContent}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestRemove(student)}
                    aria-label={t("pairing.remove", {
                      name: student.realName,
                    })}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* The matching control lives where the teacher watches the queue —
          it IS the activity setting, the same one Edit activity settings
          shows, so the two switches can never disagree. */}
      <div className="flex items-start gap-2 border-t border-border/70 pt-3">
        <Zap
          aria-hidden
          className={cn(
            "mt-0.5 size-3.5 shrink-0",
            autoMatchOn ? "text-brand-mint" : "text-muted-foreground/50"
          )}
        />
        <label
          htmlFor={autoMatchSwitchId}
          className="min-w-0 flex-1 cursor-pointer text-xs leading-relaxed text-muted-foreground"
        >
          {!autoMatchOn
            ? t("pairing.autoMatch.off")
            : paused
              ? t("pairing.autoMatch.paused")
              : t("pairing.autoMatch.on", { seconds: autoMatchSeconds })}
        </label>
        <Switch
          id={autoMatchSwitchId}
          checked={autoMatchOn}
          onCheckedChange={onAutoMatchChange}
        />
      </div>
    </div>
  );
}
