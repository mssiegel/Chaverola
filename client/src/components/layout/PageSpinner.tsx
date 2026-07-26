import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * What fills a layout's content area while the page's chunk arrives.
 *
 * Wordless on purpose. It stands in for any page, so anything it said would
 * be wrong somewhere — "Finding your activity…" over an empty code screen
 * promises a lookup nobody has asked for yet. The shell around it (the navbar,
 * or the purple world and its doodles) stays painted the whole time, so the
 * app never looks like it went away; this is just the beat before the page
 * lands.
 *
 * Sized and centred by its container rather than itself, so it sits in the
 * same place the page will.
 */
export function PageSpinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex flex-1 items-center justify-center py-12"
    >
      <Loader2
        aria-hidden
        className={cn(
          "size-8 animate-spin text-brand-grape motion-reduce:animate-none",
          className
        )}
      />
    </div>
  );
}
