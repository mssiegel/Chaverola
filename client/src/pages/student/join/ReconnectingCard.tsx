import { Loader2, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { STUDENT_CARD_CLASS } from "./stageTypes";

/**
 * A student who already has a seat, on a refresh (or a tab restore) the
 * server didn't answer. The code gate would be a lie here — they're still
 * signed in, and their seat is held by the server's grace window — so they
 * wait it out on this screen instead, while the lookup retries behind it.
 * The amber pill is the lobby's, on purpose: same trouble, same signal.
 */
export function ReconnectingCard({
  studentName,
  onTryNow,
}: {
  studentName: string;
  onTryNow: () => void;
}) {
  return (
    <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-start gap-4 pt-2 sm:justify-center sm:pt-0">
      <div
        className={cn(
          STUDENT_CARD_CLASS,
          "flex w-full animate-in flex-col items-center gap-6 px-6 py-8 text-center duration-500 fade-in motion-reduce:animate-none sm:px-8"
        )}
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Hang tight, {studentName}
          </h1>
          <p className="text-muted-foreground">
            We can't reach Chaverola right now. Your spot is saved, and this
            screen opens back into your lobby as soon as we get through.
          </p>
        </div>

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

        <Button
          size="lg"
          variant="outline"
          onClick={onTryNow}
          className="w-full"
        >
          <RotateCw aria-hidden className="size-4" />
          Try now
        </Button>
      </div>
    </div>
  );
}
