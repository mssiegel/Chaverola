import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The pulsing mint dot that marks something as live right now — the chat
 * cards' "Live" badge and the host header's own indicator share it, so both
 * read as the same state. A character row never wears it: removing a
 * character is never blocked, so there is nothing on that row to mark
 * (feature 18).
 */
function LiveDot({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn("relative flex size-2", className)} {...props}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-mint opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-brand-mint" />
    </span>
  );
}

export { LiveDot };
