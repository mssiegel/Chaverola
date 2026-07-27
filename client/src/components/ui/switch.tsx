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
        // a duplicated pair can drift out of sync with the hard-coded 18px.
        // Safe to mirror wholesale because nothing in here is text or
        // asymmetric art — it's a rounded track and a round thumb.
        "peer inline-flex h-6 w-10 shrink-0 items-center rounded-full shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input rtl:-scale-x-100",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-card shadow-sm transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
