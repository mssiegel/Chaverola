import type { ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * "Here's why that didn't do what you expected" — the amber box the host page
 * uses for anything the teacher should read but nothing that blocks them: the
 * post-End-all auto-match hold, the rematch heads-up, the pairing rail's
 * notice, a paused round, the teacher's own dropped connection.
 *
 * One shape for all of them because they stack in the same column, and a box
 * that changed its padding or icon size per message would read as five
 * unrelated warnings instead of one voice. Dismissible only where dismissing
 * means something — a notice about live state (paused, offline) clears itself
 * when the state does.
 */
export function NoticeBanner({
  icon: Icon,
  iconClassName,
  children,
  onDismiss,
  dismissLabel,
  footer,
  className,
}: {
  icon: LucideIcon;
  /** Extra icon classes on top of the shared sizing (e.g. a spin). */
  iconClassName?: string;
  children: ReactNode;
  /** Omit for a notice the teacher can't clear by hand. */
  onDismiss?: () => void;
  dismissLabel?: string;
  /** An action under the message, inside the box (the hold notice's
   *  turn-auto-match-back-on button). */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          aria-hidden
          className={cn("mt-0.5 size-4 shrink-0", iconClassName)}
        />
        <span className="min-w-0 flex-1">{children}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel}
            className="grid size-6 shrink-0 place-items-center rounded-full text-amber-700 transition-colors hover:bg-amber-100"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {footer}
    </div>
  );
}
