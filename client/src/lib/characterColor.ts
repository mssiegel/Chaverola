/*
  Character-name colors.

  The chatbox colors each speaker's name (game-chat style). Colors are assigned
  by speaking order within a room and drawn from the `--char-*` design tokens:
  the first key is green, the second golden, the third bluish, the fourth
  purplish, then extra distinct hues after that.

  From the student's view the caller passes their own character first, so "you"
  are always green. The teacher's grid instead seeds the activity roster, so a
  character holds one color across every chat card. See DECISIONS.md →
  "Character-name colors" for the rules and the reasoning behind them.
*/

import { CHARACTER_COLOR_VARS, type Character } from "@chaverola/shared";
import type { Participant } from "@/types/chat";

/**
 * Assigns a color to every key in the order it first appears. The first key
 * gets `--char-1` (green), the second `--char-2` (golden), and so on; repeated
 * keys keep their first color. Pass the viewer's own character first so it
 * always renders green. Wraps around once there are more speakers than colors.
 */
export function assignCharacterColors(keys: string[]): Map<string, string> {
  const result = new Map<string, string>();
  let next = 0;

  for (const key of keys) {
    if (result.has(key)) continue;
    const index = next % CHARACTER_COLOR_VARS.length;
    result.set(key, `var(${CHARACTER_COLOR_VARS[index]})`);
    next += 1;
  }

  return result;
}

/**
 * Room colors from the viewer's seat: seeds the viewer's own character first
 * so "you" are always green; peers then follow in participant order (golden,
 * bluish, purplish, …).
 */
export function selfFirstCharacterColors(
  self: Participant,
  participants: Participant[]
): Map<string, string> {
  return assignCharacterColors([
    self.character.id,
    ...participants.map((p) => p.character.id),
  ]);
}

/**
 * Room colors from the teacher's seat: seeds the activity roster first, so a
 * character keeps one color across every chat card no matter how `dealCast`
 * shuffled it. A character removed from the roster mid-activity (whose
 * completed cards still render) picks up the next free color instead of
 * colliding with a roster color.
 */
export function rosterCharacterColors(
  roster: Character[],
  participants: Participant[]
): Map<string, string> {
  return assignCharacterColors([
    ...roster.map((c) => c.id),
    ...participants.map((p) => p.character.id),
  ]);
}
