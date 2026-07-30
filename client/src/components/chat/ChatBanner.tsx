import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The floating pill that sits over a conversation to say something about the
 * room rather than in it: the teacher's pause, your own dropped connection,
 * a peer's. Chat chrome, not a message — and never a takeover, so the
 * transcript stays readable underneath.
 *
 * One shape for all three, because they occupy the same slot and one can
 * replace another mid-chat (`Conversation` ranks them): a pill that changed
 * size or weight between reasons would read as the screen jumping. **Amber**
 * is trouble that is still running, **emerald** the moment it resolves.
 */
export function ChatBanner({
  tone = "amber",
  icon,
  children,
}: {
  tone?: "amber" | "emerald";
  /** Already sized (`size-4`) and, where it spins, already animated. */
  icon: ReactNode;
  /** Wraps rather than truncates: clipping would eat a countdown on narrow
   *  phones ("Caesar's ghost 👻 lost connection… 2:00 to co…"). */
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-fit max-w-full animate-in items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm fade-in slide-in-from-top-2",
        tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
      role="status"
    >
      {icon}
      <span className="min-w-0 text-center">{children}</span>
    </div>
  );
}
