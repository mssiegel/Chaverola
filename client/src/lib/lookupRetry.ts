/**
 * The wait before refetching a join-code lookup that came back unreachable.
 * Short at first — a classroom wifi blip is usually over in a second or two,
 * and the student is staring at a holding screen while their seat's grace
 * period burns — then longer, so thirty phones don't hammer a server that is
 * genuinely down. `attempt` 0 is the wait after the first failed lookup.
 */
const CAPPED_DELAY_MS = 10_000;

export const LOOKUP_RETRY_DELAYS_MS = [2_000, 5_000, CAPPED_DELAY_MS];

export function lookupRetryDelayMs(attempt: number): number {
  return LOOKUP_RETRY_DELAYS_MS[Math.max(attempt, 0)] ?? CAPPED_DELAY_MS;
}
