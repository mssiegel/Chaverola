/*
  Character-name colors.

  The chatbox colors each speaker's name (game-chat style). Colors are assigned
  by speaking order within a room and drawn from the `--char-*` design tokens:
  the first key is green, the second golden, the third bluish, the fourth
  purplish, then extra distinct hues after that.

  From the student's view the caller passes their own character first, so "you"
  are always green. The teacher's grid instead seeds the activity roster, so a
  character holds one color across every chat card — as far as the palette
  reaches; past that `rosterCharacterColors` puts the card first (see its
  docblock). See DECISIONS.md → "Character-name colors" for the rules and the
  reasoning behind them.
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
 * Room colors from the teacher's seat. Which seeding it uses depends on
 * whether this card's keys fit the palette:
 *
 * - They fit: the roster seeds first, so a character keeps one color across
 *   every chat card no matter how `dealCast` shuffled it, and a character
 *   removed from the roster mid-activity (whose completed cards still render)
 *   picks up the next free color instead of colliding with a roster color.
 * - They don't: this chat's participants seed first, then the roster. Past the
 *   palette `assignCharacterColors` wraps, so two keys 8 apart share a color —
 *   and a shuffled deal can drop both into one chat, which would print two
 *   speakers of one card in the same color. Distinct colors WITHIN a card beat
 *   a stable color ACROSS cards, and a stable per-character color was already
 *   unachievable at this length, so nothing is lost by dropping it.
 *
 * Seeding the cast first works because `MAX_CHAT_SEATS` IS the palette length:
 * the participants take indices 0..n-1 and the wrap only ever lands on roster
 * characters that aren't in this chat. That bound is exact, not roomy — a
 * ninth seat would put the ninth speaker on the first speaker's color. It
 * holds because the cast is always n DISTINCT characters: the schema rejects
 * duplicate character ids, and `dealCast` slices a roster rather than drawing
 * with replacement.
 *
 * The test is the count of DISTINCT keys, not `roster.length`: a card also
 * carries any character a mid-activity removal left frozen on it, so a roster
 * of exactly eight plus one removed character wraps just as an oversized
 * roster does.
 */
export function rosterCharacterColors(
  roster: Character[],
  participants: Participant[]
): Map<string, string> {
  const rosterIds = roster.map((c) => c.id);
  const participantIds = participants.map((p) => p.character.id);
  const distinct = new Set([...rosterIds, ...participantIds]).size;

  return assignCharacterColors(
    distinct > CHARACTER_COLOR_VARS.length
      ? [...participantIds, ...rosterIds]
      : [...rosterIds, ...participantIds]
  );
}
