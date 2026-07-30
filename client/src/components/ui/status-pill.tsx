import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Why nothing is moving, said in one chip — the student world's holding
 * signal. The lobby wears it while waiting, paused, or out of reach of a
 * teacher; the reconnecting card wears the same amber one, because a lost
 * connection is the same trouble wherever the student is standing.
 *
 * Two tones and no more: **grape** is the happy hold (the matchmaker is
 * working, or the teacher stepped away — nothing for the student to fix),
 * **amber** is the one that wants attention (paused, or off the air). Amber
 * for a hold the student can't act on would read as a warning about their
 * own connection, which is a founder call, not a palette preference.
 */
export function StatusPill({
  tone,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { tone: "amber" | "grape" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-semibold",
        tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-brand-grape/25 bg-brand-grape-soft text-brand-grape-strong",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
