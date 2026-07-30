/*
  Shared helpers for the demo engines (useChatDemo, useHostActivityDemo):
  session-unique ids and the random picks that keep the simulations varied.
  `shuffled` lives in @chaverola/shared now (one Fisher–Yates for both engines)
  and is re-exported here so the client keeps one random surface.
*/

export { shuffled } from "@chaverola/shared";

let idSeq = 0;

/** Session-unique id: the prefix plus a counter, e.g. nextId("seed") → "seed-8". */
export function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

/**
 * An id unique beyond this tab — for the two values that outlive the module
 * a counter lives in: the student's join nonce and a character row minted on
 * the host page (both ride the wire and meet the server's stored copies).
 *
 * `crypto.randomUUID` needs a secure context, which LAN-http dev (a phone
 * pointed at the dev box) is not, so the fallback is random enough and
 * timestamped. Neither value is a secret — one is an idempotency key, the
 * other an opaque roster key nothing renders.
 */
export function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Random integer between min and max, inclusive on both ends. */
export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Random element of an array. */
export function randomFrom<T>(items: readonly T[]): T {
  // Callers always pass non-empty arrays, and the index is < items.length.
  return items[Math.floor(Math.random() * items.length)]!;
}
