/**
 * 103 → "1:43" — the m:ss clock shared by every countdown surface.
 *
 * Always render the result inside a `<bdi>`. The `:` is a neutral sitting
 * between two digit runs, so on an RTL line "1:43" lays out as "43:1" without
 * one.
 */
export function formatSecondsAsClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Which unit `splitWaitShort` landed on. */
export type WaitUnit = "seconds" | "minutes";

/**
 * 45 → 45 seconds, 130 → 2 minutes — the compact wait time on queue rows.
 * Split rather than formatted: "45s" and "2m" are English abbreviations, so
 * the unit is a catalog key at the call site and this stays pure.
 */
export function splitWaitShort(totalSeconds: number): {
  unit: WaitUnit;
  value: number;
} {
  if (totalSeconds < 60) return { unit: "seconds", value: totalSeconds };
  return { unit: "minutes", value: Math.floor(totalSeconds / 60) };
}
