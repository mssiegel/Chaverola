import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { STUDENT_CARD_CLASS } from "./stageTypes";

/**
 * The floating white card every non-chat stage of the student flow renders
 * on — the code/name gate, the loading beat, the reconnecting hold, the
 * seat-cap wall, and the activity-over screen.
 *
 * Phones anchor it high so the content is visible without scrolling or
 * hunting; from `sm` up it centers in the viewport. `className` tunes the
 * card itself (a different gap, taller padding, an entrance variant); the
 * outer anchor is the same on all five and is not overridable, because a
 * stage that sat somewhere else would read as a different screen.
 */
export function StageCard({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-start gap-4 pt-2 sm:justify-center sm:pt-0">
      <div
        className={cn(
          STUDENT_CARD_CLASS,
          "flex w-full animate-in flex-col gap-6 px-6 py-8 text-center duration-500 fade-in motion-reduce:animate-none sm:px-8",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}
