/*
  Tiny text-measuring helpers behind the app's input caps (character names,
  the hosted-by name, the student instructions).
*/

/** Count by code points so multi-unit emoji count as one character. */
export function charCount(text: string): number {
  return Array.from(text).length;
}

/** Hard cap `text` at `max` code points (how the input caps block typing). */
export function clampChars(text: string, max: number): string {
  const points = Array.from(text);
  return points.length > max ? points.slice(0, max).join("") : text;
}
