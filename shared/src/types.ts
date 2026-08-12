/*
  The canonical domain types shared by the client and the server. Handwritten
  interfaces here are the wire contract; the server's zod schemas are pinned
  to them (schema drift is a compile error server-side).
*/

/**
 * The languages Chaverola speaks. English is the unprefixed locale in the
 * client's URL scheme; every other one gets a prefix (`/he`).
 *
 * Here rather than in constants.ts, which already imports from this file —
 * the other direction would be circular. The client re-exports all three from
 * `lib/locale.ts`, which keeps the URL helpers beside them.
 */
export const LOCALES = ["en", "he"] as const;
export type Locale = (typeof LOCALES)[number];

/** The unprefixed locale, and the fallback whenever nothing else decides. */
export const DEFAULT_LOCALE: Locale = "en";

export interface Character {
  id: string;
  /**
   * Display name, e.g. "Caesar's ghost 👻". Emoji are simply part of the
   * name — there is no separate emoji field, so every surface renders this
   * string as-is (see docs/decisions/characters.md).
   */
  name: string;
}

/**
 * An activity as students see it when joining: who's hosting, which characters
 * are in play, and the teacher's optional instructions for the activity.
 */
export interface Activity {
  /** The 4-digit code students type to get in. */
  joinCode: string;
  /** The teacher's display name, e.g. "Ms. Cohen". */
  hostName: string;
  /** The character roster students may be assigned from. */
  characters: Character[];
  /** Optional instructions students read in the lobby — a scene, a debate
   *  topic, task steps. Not every teacher writes them. */
  studentInstructions?: string;
  /**
   * The language the teacher set the activity up in, frozen at create. A
   * student who resolves the join code inherits it, so a whole class matches
   * the projector instead of splitting by phone settings. Never editable:
   * `activity:details-changed` deliberately doesn't carry it.
   */
  locale: Locale;
  /**
   * Whether `locale` is a lock rather than a default. Off, a student who
   * deliberately picked a language keeps it and can switch back from the
   * lobby; on, the activity's language wins over that choice and the student
   * world offers no switcher at all. What an English-as-a-second-language
   * teacher turns on so thirty phones can't quietly translate the lesson.
   *
   * Frozen at create beside `locale`, and for the same reason: the language
   * must not be able to move under a class mid-lesson.
   *
   * An older server answers without this key for the length of a deploy, so
   * every reader compares `=== true` — absent means unlocked.
   */
  lockLocale: boolean;
}

/**
 * How a chat's cast is drawn from the roster. "inOrder" is the original rule
 * and the one a whole-class scene wants; "shuffled" is what a long roster is
 * for.
 */
export type CharacterMode = "inOrder" | "shuffled";

/**
 * The teacher's activity settings, chosen at setup and editable while the
 * activity runs (Chaverola is a series of activities with the same students,
 * so nothing is locked in). The defaults are the recommended state; see
 * DEFAULT_ACTIVITY_SETTINGS in constants.ts.
 */
export interface ActivitySettings {
  /** Students learn who they were really chatting with once a chat ends. */
  revealNames: boolean;
  /** Warn the teacher before pairing students who already chatted together. */
  rematchWarning: boolean;
  /** Pair waiting students 1:1 on their own after `autoMatchSeconds`. */
  autoMatch: boolean;
  /** Seconds, 5–120 in steps of 5. Kept (but inert) while `autoMatch` is off. */
  autoMatchSeconds: number;
  /**
   * "inOrder": every chat plays the same parts — a pair gets the roster's
   * first two names, a trio the first three. "shuffled": each chat draws its
   * own parts at random from the whole roster, so a class of thirty is
   * running thirty different scenes rather than one.
   */
  characterMode: CharacterMode;
}

/**
 * An activity from the teacher's side: everything students see plus the
 * teacher-only fields from the setup form.
 */
export interface HostedActivity extends Activity {
  /** Where to email the activity's chat transcripts, if the teacher asked. */
  teacherEmail?: string;
  settings: ActivitySettings;
}
