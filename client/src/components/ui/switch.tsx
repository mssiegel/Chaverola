import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // `rtl:-scale-x-100` on the whole control rather than mirrored copies
        // of the thumb's two translate utilities: transforms are physical, and
        // a duplicated pair can drift out of sync with the hard-coded offset.
        // Safe to mirror wholesale because nothing in here is text or
        // asymmetric art — it's a rounded track and a round thumb.
        //
        // The mirror is only correct because the thumb below is anchored
        // PHYSICALLY and out of flow. A flex thumb rides the main axis, which
        // follows `direction`, so under /he it starts at the track's far end,
        // the physical translate pushes it further out, and the mirror throws
        // it clean off the other edge — which is what shipped from 2026-07-27
        // until it was spotted on the setup form. `relative` is what earns its
        // keep in LTR: RTL gets a containing block free from the scale, LTR has
        // no transform at all and the thumb would escape to the nearest
        // positioned ancestor without it. A caller passing `absolute`/`static`
        // would beat it through tailwind-merge and detach the thumb; nobody
        // passes a className today, and this is the reason not to start.
        "peer relative inline-flex h-6 w-10 shrink-0 rounded-full shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input rtl:-scale-x-100",
        className
      )}
      {...props}
    >
      {/* `top-0.5 left-0.5`, never `start-0.5`: a logical anchor would flip
          with direction and the mirror would then flip it a second time. The
          travel is the leftover 16px (40 track − 20 thumb − 2×2 gutter). */}
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none absolute top-0.5 left-0.5 block size-5 rounded-full bg-card shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
