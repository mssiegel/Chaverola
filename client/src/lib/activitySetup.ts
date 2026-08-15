import {
  AUTO_MATCH_SECONDS,
  DEFAULT_ACTIVITY_SETTINGS,
  EMAIL_PATTERN,
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  NAME_MAX_CHARS,
  STUDENT_INSTRUCTIONS_MAX_CHARS,
} from "@chaverola/shared";
import type {
  CharacterInput,
  CharacterMode,
  CreateActivityRequest,
  Locale,
  StepperBounds,
} from "@chaverola/shared";
import type { ActivitySettings } from "@/types/activity";
import type { Character } from "@/types/chat";

import { readSessionJson, writeSessionJson } from "./storage";
import { clampChars } from "./text";

/*
  Everything behind the teacher's setup form that isn't UI: the in-progress
  draft (sessionStorage — survives a refresh on a flaky classroom device,
  gone when the tab closes), validation for the always-tappable Host button,
  and the mapping of a finished draft onto the create-activity request. The
  field caps themselves live in @chaverola/shared (the server enforces the
  same numbers) and are re-exported here so form imports stay put. See
  DECISIONS.md → "Teacher activity setup".
*/

export {
  AUTO_MATCH_SECONDS,
  DEFAULT_ACTIVITY_SETTINGS,
  EMAIL_PATTERN,
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  NAME_MAX_CHARS,
  STUDENT_INSTRUCTIONS_MAX_CHARS,
};
export type { StepperBounds };

/** The caps' quiet counters appear only this close to the limit. */
export const NAME_COUNTER_FROM = 25;
export const STUDENT_INSTRUCTIONS_COUNTER_FROM = 200;

/**
 * The character-mode picker appears from this many rows up. Below it the two
 * modes are the same operation — dealCast either shuffles the roster and takes
 * N or takes N and shuffles them, and with two names those are the same two
 * names — so the question can't have an answer that changes anything.
 */
export const CHARACTER_MODE_FROM = MIN_CHARACTERS + 1;

/** One character row as drafted — may be empty while typing. Just a name:
 *  an emoji, if the teacher wants one, is part of that name. */
export type CharacterDraft = Pick<Character, "name">;

/** The non-character fields every activity draft carries (setup and live). */
export interface ActivityDraftFields {
  hostName: string;
  teacherEmail: string;
  studentInstructions: string;
  settings: ActivitySettings;
}

/** The whole setup form, exactly as typed so far.
 *
 *  `lockLocale` sits here rather than on ActivityDraftFields on purpose: the
 *  fields interface is shared with the host page's LiveActivityDraft, and the
 *  live panel can't edit this one — it's frozen at create, like the locale it
 *  locks. */
export interface ActivityDraft extends ActivityDraftFields {
  characters: CharacterDraft[];
  lockLocale: boolean;
}

export function defaultActivityDraft(): ActivityDraft {
  return {
    characters: [{ name: "" }, { name: "" }],
    hostName: "",
    teacherEmail: "",
    studentInstructions: "",
    // On, like every other recommended default. A class that reads the app in
    // one language is the state a teacher wants without asking for it, and
    // the one who doesn't can see the switch and turn it off.
    lockLocale: true,
    settings: { ...DEFAULT_ACTIVITY_SETTINGS },
  };
}

/** A row counts once its name has any non-whitespace in it. */
export function isFilledCharacter(row: CharacterDraft): boolean {
  return row.name.trim() !== "";
}

// ---------------------------------------------------------------------------
// Draft persistence

const DRAFT_KEY = "chaverola.activityDraft";

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Every mode, as a lookup. `satisfies Record<CharacterMode, true>` is what
 *  makes a third mode a compile error here instead of a silent fallback. */
const CHARACTER_MODES = {
  inOrder: true,
  shuffled: true,
} as const satisfies Record<CharacterMode, true>;

function asCharacterMode(
  value: unknown,
  fallback: CharacterMode
): CharacterMode {
  return typeof value === "string" && value in CHARACTER_MODES
    ? (value as CharacterMode)
    : fallback;
}

/** Keep a stepper value inside its bounds. */
export function clampToBounds(value: number, bounds: StepperBounds): number {
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

/** Clamp to bounds and snap onto the step grid (steps count from `min`). */
function snapToBounds(value: unknown, bounds: StepperBounds): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : bounds.default;
  const stepped =
    Math.round((n - bounds.min) / bounds.step) * bounds.step + bounds.min;
  return clampToBounds(stepped, bounds);
}

/** Rebuild a trustworthy draft from whatever was in storage. */
function sanitizeDraft(raw: unknown): ActivityDraft {
  const draft = defaultActivityDraft();
  if (typeof raw !== "object" || raw === null) return draft;
  const candidate = raw as Record<string, unknown>;

  if (Array.isArray(candidate.characters)) {
    const rows = candidate.characters
      .slice(0, MAX_CHARACTERS)
      .map((row: unknown): CharacterDraft => {
        const record =
          typeof row === "object" && row !== null
            ? (row as Record<string, unknown>)
            : {};
        const name =
          typeof record.name === "string"
            ? clampChars(record.name, NAME_MAX_CHARS)
            : "";
        return { name };
      });
    while (rows.length < MIN_CHARACTERS) rows.push({ name: "" });
    draft.characters = rows;
  }

  if (typeof candidate.hostName === "string") {
    draft.hostName = clampChars(candidate.hostName, NAME_MAX_CHARS);
  }
  if (typeof candidate.teacherEmail === "string") {
    draft.teacherEmail = candidate.teacherEmail;
  }
  // `?? candidate.scene`: pre-rename drafts stored this field as `scene`, so
  // an in-flight tab's draft survives the rename deploy.
  const instructions =
    typeof candidate.studentInstructions === "string"
      ? candidate.studentInstructions
      : typeof candidate.scene === "string"
        ? candidate.scene
        : undefined;
  if (instructions !== undefined) {
    draft.studentInstructions = clampChars(
      instructions,
      STUDENT_INSTRUCTIONS_MAX_CHARS
    );
  }

  // Not inside `settings` — a key this function forgets to copy is silently
  // reset to its default on the next refresh, and a lock that quietly
  // evaporates between typing and hosting is exactly the failure nobody
  // notices.
  draft.lockLocale = asBoolean(candidate.lockLocale, draft.lockLocale);

  const settings =
    typeof candidate.settings === "object" && candidate.settings !== null
      ? (candidate.settings as Record<string, unknown>)
      : {};
  draft.settings = {
    revealNames: asBoolean(
      settings.revealNames,
      DEFAULT_ACTIVITY_SETTINGS.revealNames
    ),
    rematchWarning: asBoolean(
      settings.rematchWarning,
      DEFAULT_ACTIVITY_SETTINGS.rematchWarning
    ),
    autoMatch: asBoolean(
      settings.autoMatch,
      DEFAULT_ACTIVITY_SETTINGS.autoMatch
    ),
    autoMatchSeconds: snapToBounds(
      settings.autoMatchSeconds,
      AUTO_MATCH_SECONDS
    ),
    characterMode: asCharacterMode(
      settings.characterMode,
      DEFAULT_ACTIVITY_SETTINGS.characterMode
    ),
  };

  return draft;
}

export function readActivityDraft(): ActivityDraft {
  // sanitizeDraft never rejects — a corrupt or missing draft reads as fresh.
  return readSessionJson(DRAFT_KEY, sanitizeDraft) ?? defaultActivityDraft();
}

export function saveActivityDraft(draft: ActivityDraft): void {
  writeSessionJson(DRAFT_KEY, draft);
}

// ---------------------------------------------------------------------------
// Validation

/** Which form field a problem highlights (`character-<row index>`). */
export type SetupField = "hostName" | "teacherEmail" | `character-${number}`;

/**
 * A `teacher` catalog key, spelled out rather than `problem.${string}`: the
 * literal union is what makes `t(problem.messageKey)` check at the call site.
 * `lib/hostActivity.ts` adds the live-only one.
 */
export type SetupProblemKey =
  | "problem.needTwoCharacters"
  | "problem.duplicateCharacter"
  | "problem.hostName"
  | "problem.email"
  | "problem.characterInUse";

export interface SetupProblem {
  field: SetupField;
  /** A key, not a string — this module is pure, so the form calls `t`. */
  messageKey: SetupProblemKey;
}

/**
 * Everything that blocks hosting, in top-to-bottom form order — the form
 * scrolls to the first one. Field caps (name and instruction lengths) never
 * show up here because the inputs hard-block them while typing.
 */
export function validateActivityDraft(draft: ActivityDraft): SetupProblem[] {
  const problems: SetupProblem[] = [];

  const filledCount = draft.characters.filter(isFilledCharacter).length;
  if (filledCount < MIN_CHARACTERS) {
    const firstEmpty = draft.characters.findIndex(
      (row) => !isFilledCharacter(row)
    );
    problems.push({
      field: `character-${Math.max(firstEmpty, 0)}`,
      messageKey: "problem.needTwoCharacters",
    });
  }

  // Duplicate names (trimmed, case-insensitive) get flagged on the later
  // row — students would see two identical labels with no way to tell the
  // characters apart.
  const seenNames = new Set<string>();
  draft.characters.forEach((row, index) => {
    if (!isFilledCharacter(row)) return;
    const key = row.name.trim().toLowerCase();
    if (seenNames.has(key)) {
      problems.push({
        field: `character-${index}`,
        messageKey: "problem.duplicateCharacter",
      });
    } else {
      seenNames.add(key);
    }
  });

  if (draft.hostName.trim() === "") {
    problems.push({ field: "hostName", messageKey: "problem.hostName" });
  }

  const email = draft.teacherEmail.trim();
  if (email !== "" && !EMAIL_PATTERN.test(email)) {
    problems.push({ field: "teacherEmail", messageKey: "problem.email" });
  }

  return problems;
}

// ---------------------------------------------------------------------------
// Hosting

/**
 * Turn a valid draft into the `POST /activities` body. Rows left empty are
 * dropped here — an abandoned character row never blocks a class from
 * starting. Blank optional fields are omitted (the wire contract never sends
 * `""` or null), and no ids go over: the server mints character ids.
 *
 * `locale` is the language the form itself is in, and it is always sent —
 * optional on the wire only so a deploy can't 400 an old client's create.
 * The activity keeps it for good: it is what puts a student who types the
 * bare join link on the same language as the projector. `lockLocale` travels
 * the same way and says whether that's a suggestion or a rule.
 */
export function toCreateActivityRequest(
  draft: ActivityDraft,
  locale: Locale
): CreateActivityRequest {
  const characters: CharacterInput[] = draft.characters
    .filter(isFilledCharacter)
    .map((row) => ({ name: row.name.trim() }));

  const instructions = draft.studentInstructions.trim();
  const email = draft.teacherEmail.trim();
  const request: CreateActivityRequest = {
    hostName: draft.hostName.trim(),
    characters,
    locale,
    lockLocale: draft.lockLocale,
    settings: { ...draft.settings },
  };
  if (instructions !== "") request.studentInstructions = instructions;
  if (email !== "") request.teacherEmail = email;
  return request;
}
