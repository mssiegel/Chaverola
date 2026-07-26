import type { ActivitySettings, HostedActivity } from "@/types/activity";
import type { Character } from "@/types/chat";

import {
  validateActivityDraft,
  type ActivityDraft,
  type ActivityDraftFields,
  type SetupProblem,
} from "./activitySetup";

/*
  The host page's live-edit model. The settings panel edits a draft that
  mirrors the setup form (same fields, same caps, same validation), but with
  one extra rule: character ids are STABLE. The server's chat members
  reference characters by id (the deal/matching key), and the roster chips
  and future pairings resolve by id too, so the id must never change once a
  row exists. New rows therefore mint their permanent id the moment they're
  added (ids are opaque; only setup slugs them for readability). Chat cards
  are NOT part of this loop anymore: a chat's labels are frozen server-side
  when it starts (feature 18), so a roster edit never touches a running or
  completed card. See DECISIONS.md → "Teacher live activity page".
*/

/**
 * One character row of the live panel: shaped like a Character, but the
 * name may be empty or invalid mid-edit — only a valid commit makes it one.
 */
export type LiveCharacterRow = Character;

/** The live panel's whole draft — possibly invalid mid-edit. */
export interface LiveActivityDraft extends ActivityDraftFields {
  characters: LiveCharacterRow[];
}

let liveCharacterSeq = 0;

/** Permanent id for a character row added while the activity runs. */
export function mintLiveCharacterId(): string {
  liveCharacterSeq += 1;
  return `live-character-${liveCharacterSeq}`;
}

export function liveDraftFromActivity(
  activity: HostedActivity
): LiveActivityDraft {
  return {
    characters: activity.characters.map((c) => ({ id: c.id, name: c.name })),
    hostName: activity.hostName,
    teacherEmail: activity.teacherEmail ?? "",
    studentInstructions: activity.studentInstructions ?? "",
    settings: { ...activity.settings },
  };
}

function toActivityDraft(draft: LiveActivityDraft): ActivityDraft {
  return {
    characters: draft.characters.map(({ name }) => ({ name })),
    hostName: draft.hostName,
    teacherEmail: draft.teacherEmail,
    studentInstructions: draft.studentInstructions,
    settings: draft.settings,
  };
}

/**
 * Everything that blocks a live edit from propagating. The setup rules all
 * hold, plus one live-only rule: a character the class already has (any
 * committed id) can't be renamed to nothing — emptying the name would
 * silently drop the character at commit time, and removal has its own
 * guarded control. While problems exist, the last valid value stays in
 * effect; fixing the field applies it on the next debounce tick.
 */
export function validateLiveDraft(
  draft: LiveActivityDraft,
  committedCharacterIds: ReadonlySet<string>
): SetupProblem[] {
  const problems = validateActivityDraft(toActivityDraft(draft));
  draft.characters.forEach((row, index) => {
    if (row.name.trim() === "" && committedCharacterIds.has(row.id)) {
      problems.push({
        field: `character-${index}`,
        message:
          "Your class already has this character, so it needs a name. " +
          "To drop a character, use the remove button on rows 3 and 4.",
      });
    }
  });
  return problems;
}

function copySettingsKey<K extends keyof ActivitySettings>(
  target: ActivitySettings,
  source: ActivitySettings,
  key: K
) {
  target[key] = source[key];
}

/**
 * Folds settings changed OUTSIDE the live panel (the pairing rail's
 * auto-match switch, End-all's auto-hold) into the panel's draft. Without
 * this the draft — captured once on mount — would show the old switch
 * position and, worse, quietly put the old value back on its next commit.
 * A key merges only when the activity value actually moved AND the draft
 * disagrees: the panel's own commits echo back as no-ops, and a pending
 * edit to any other key is never clobbered. Returns null when there's
 * nothing to change so callers can skip the state update entirely.
 */
export function mergeExternalSettings(
  prev: ActivitySettings,
  next: ActivitySettings,
  draft: ActivitySettings
): ActivitySettings | null {
  let merged: ActivitySettings | null = null;
  for (const key of Object.keys(next) as (keyof ActivitySettings)[]) {
    if (prev[key] !== next[key] && draft[key] !== next[key]) {
      merged ??= { ...draft };
      copySettingsKey(merged, next, key);
    }
  }
  return merged;
}

/**
 * Commit a valid draft: trims like hosting does, silently drops added rows
 * that were left empty, and keeps every character id exactly as drafted.
 */
export function activityFromLiveDraft(
  draft: LiveActivityDraft,
  base: HostedActivity
): HostedActivity {
  const characters: Character[] = draft.characters
    .filter((row) => row.name.trim() !== "")
    .map((row) => ({ id: row.id, name: row.name.trim() }));

  const activity: HostedActivity = {
    joinCode: base.joinCode,
    hostName: draft.hostName.trim(),
    characters,
    settings: { ...draft.settings },
  };
  const instructions = draft.studentInstructions.trim();
  const email = draft.teacherEmail.trim();
  if (instructions !== "") activity.studentInstructions = instructions;
  if (email !== "") activity.teacherEmail = email;
  return activity;
}
