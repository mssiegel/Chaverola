import { z } from "zod";

import {
  AUTO_MATCH_SECONDS,
  EMAIL_MAX_CHARS,
  EMAIL_PATTERN,
  LOCALES,
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  NAME_MAX_CHARS,
  STUDENT_INSTRUCTIONS_MAX_CHARS,
} from "@chaverola/shared";
import type {
  ActivitySettings,
  ApiFieldIssue,
  CreateActivityRequest,
} from "@chaverola/shared";

/*
  zod lives server-side only (the client keeps its friendly per-field form
  validation) and every limit is read from @chaverola/shared — the same
  numbers the form enforces, so the form can't accept what we reject.
  Settings bounds are REJECTED, not clamped: the client already snaps values
  into range, so anything out of range here is a broken caller, not a user.
*/

/**
 * Names are capped by CODE POINTS, not UTF-16 units — matching the form's
 * `clampChars`, so a multi-unit emoji counts as one character on both sides
 * of the wire (the same rule `chat:send` applies to messages). Since an
 * emoji is now simply part of a character's name, a plain `.max()` here
 * would reject names the form happily accepts.
 */
const withinNameCap = (value: string) =>
  Array.from(value).length <= NAME_MAX_CHARS;

const characterInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Every character needs a name.")
    .refine(
      withinNameCap,
      `Character names max out at ${NAME_MAX_CHARS} chars.`
    ),
});

/** Also the socket's settings:update validator — the full-replace payload
 *  is exactly the settings object the create request carries. */
export const activitySettingsSchema = z.object({
  revealNames: z.boolean(),
  rematchWarning: z.boolean(),
  autoMatch: z.boolean(),
  autoMatchSeconds: z
    .number()
    .int()
    .min(AUTO_MATCH_SECONDS.min)
    .max(AUTO_MATCH_SECONDS.max)
    // On the step grid too (min is itself a step multiple) — same
    // broken-caller reasoning as the bounds.
    .multipleOf(AUTO_MATCH_SECONDS.step),
  // Defaulted rather than required, for the locale field's reason: a required
  // field would 400 every create — and every settings:update — from the
  // still-old client for the length of a Vercel deploy. The fallback is
  // "inOrder" and NOT DEFAULT_ACTIVITY_SETTINGS.characterMode ("shuffled")
  // on purpose: a client that sends no mode was built when a cast was always
  // the roster's first N, so "inOrder" is what its payload already meant.
  // This is only what a silent payload means; what a NEW draft starts as is
  // the form's own decision, made in the shared defaults.
  characterMode: z.enum(["inOrder", "shuffled"]).default("inOrder"),
}) satisfies z.ZodType<ActivitySettings>;

/** The socket's activity:update-email validator — the same limits the create
 *  request's optional field uses, plus an explicit null for "clear it". A
 *  blank string is rejected on purpose: clearing travels as null, so an empty
 *  input box can never be mistaken for an address. */
export const teacherEmailUpdateSchema = z.union([
  z.null(),
  z
    .string()
    .trim()
    .min(1, "Send null instead of a blank email.")
    .max(EMAIL_MAX_CHARS, "That email address is too long.")
    .regex(EMAIL_PATTERN, "That doesn't look like an email address."),
]);

/**
 * A character as the LIVE roster carries it (feature 18) — the create
 * request's row plus the id, because a mid-activity roster arrives from a
 * panel that already knows every id. The server takes ids as given rather
 * than reminting them: a chat member holds a `characterId` and a re-minted
 * id would orphan the deal-time bookkeeping, and ids are opaque anyway —
 * nothing renders them (founder call, 2026-07-26). The cap is generous and
 * exists only so an opaque key can't be used as a storage channel.
 */
const liveCharacterSchema = z.object({
  id: z.string().trim().min(1, "Every character needs an id.").max(120),
  name: z
    .string()
    .trim()
    .min(1, "Every character needs a name.")
    .refine(
      withinNameCap,
      `Character names max out at ${NAME_MAX_CHARS} chars.`
    ),
});

/** The socket's activity:update-details validator — the same limits the
 *  create request's hostName, characters and studentInstructions fields use
 *  (the code-point caps included), plus an explicit null for clearing the
 *  instructions. A blank string is rejected on purpose: a clear travels as
 *  null, so an emptied textarea can never be mistaken for instructions.
 *  The refines are repeated here rather than shared with
 *  createActivityRequestSchema — the teacherEmailUpdateSchema precedent:
 *  the two schemas describe different payloads and are free to drift. */
export const activityDetailsUpdateSchema = z.object({
  characters: z
    .array(liveCharacterSchema)
    .min(MIN_CHARACTERS, `At least ${MIN_CHARACTERS} characters.`)
    .max(MAX_CHARACTERS, `At most ${MAX_CHARACTERS} characters.`)
    .superRefine((characters, ctx) => {
      // The same duplicate-name rule (trimmed, case-insensitive) and the same
      // later-row choice as the setup form, plus a duplicate-ID rule the
      // create path can't need: these ids are minted client-side, and two
      // characters sharing one would deal two chat members the same
      // characterId — which is how a student's peer labels collapse.
      const names = new Set<string>();
      const ids = new Set<string>();
      characters.forEach((character, index) => {
        const key = character.name.toLowerCase();
        if (names.has(key)) {
          ctx.addIssue({
            code: "custom",
            message: "Two characters can't share a name.",
            path: [index, "name"],
          });
        } else {
          names.add(key);
        }
        if (ids.has(character.id)) {
          ctx.addIssue({
            code: "custom",
            message: "Two characters can't share an id.",
            path: [index, "id"],
          });
        } else {
          ids.add(character.id);
        }
      });
    }),
  hostName: z
    .string()
    .trim()
    .min(1, "The host name is required.")
    .refine(withinNameCap, `Host names max out at ${NAME_MAX_CHARS} chars.`),
  studentInstructions: z.union([
    z.null(),
    z
      .string()
      .trim()
      .min(1, "Send null instead of blank instructions.")
      .refine(
        (value) => Array.from(value).length <= STUDENT_INSTRUCTIONS_MAX_CHARS,
        `Student instructions max out at ${STUDENT_INSTRUCTIONS_MAX_CHARS} chars.`
      ),
  ]),
});

export const createActivityRequestSchema = z.object({
  hostName: z
    .string()
    .trim()
    .min(1, "The host name is required.")
    .refine(withinNameCap, `Host names max out at ${NAME_MAX_CHARS} chars.`),
  characters: z
    .array(characterInputSchema)
    .min(MIN_CHARACTERS, `At least ${MIN_CHARACTERS} characters.`)
    .max(MAX_CHARACTERS, `At most ${MAX_CHARACTERS} characters.`)
    .superRefine((characters, ctx) => {
      // Duplicates flagged on the later row — the same rule (trimmed,
      // case-insensitive) and the same row choice as the setup form.
      const seen = new Set<string>();
      characters.forEach((character, index) => {
        const key = character.name.toLowerCase();
        if (seen.has(key)) {
          ctx.addIssue({
            code: "custom",
            message: "Two characters can't share a name.",
            path: [index, "name"],
          });
        } else {
          seen.add(key);
        }
      });
    }),
  studentInstructions: z
    .string()
    .trim()
    .min(1, "Omit studentInstructions instead of sending it blank.")
    // Code points, not .max() — the same rule as names, so an emoji-heavy
    // instruction the form accepts isn't rejected here.
    .refine(
      (value) => Array.from(value).length <= STUDENT_INSTRUCTIONS_MAX_CHARS,
      `Student instructions max out at ${STUDENT_INSTRUCTIONS_MAX_CHARS} chars.`
    )
    .optional(),
  teacherEmail: z
    .string()
    .trim()
    .max(EMAIL_MAX_CHARS, "That email address is too long.")
    .regex(EMAIL_PATTERN, "That doesn't look like an email address.")
    .optional(),
  // Optional on the wire and defaulted in the store — a required field would
  // 400 every create from the still-old client for the length of a Vercel
  // deploy. An unknown language is a rejection, not a silent fallback: the
  // value is a closed set the client picks from, so anything else is a broken
  // caller, the same reasoning as the settings bounds.
  locale: z.enum(LOCALES).optional(),
  // Optional for the same deploy-window reason, but defaulted to FALSE while
  // the form's own default is true. The asymmetry is deliberate: the only
  // caller that omits this is a client with no such control on screen, and a
  // teacher who never saw the switch shouldn't get a lock they can't undo.
  lockLocale: z.boolean().optional(),
  settings: activitySettingsSchema,
}) satisfies z.ZodType<CreateActivityRequest>;
// ^ The drift pin: if the schema's output ever drifts from the shared wire
//   type, this line is a compile error.

/** Flatten a ZodError into the envelope's zod-style issues[]. */
export function toFieldIssues(error: z.ZodError): ApiFieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}
