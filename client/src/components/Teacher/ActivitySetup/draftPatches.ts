import type { Dispatch, SetStateAction } from "react";

import {
  MAX_CHARACTERS,
  type ActivityDraftFields,
  type CharacterDraft,
} from "@/lib/activitySetup";
import type { ActivitySettings } from "@/types/activity";

import type { CharacterRowState } from "./CharacterRowsField";

/** The draft shape both editors patch: keyed character rows + the fields. */
interface PatchableDraft extends ActivityDraftFields {
  characters: CharacterRowState[];
}

/**
 * The draft updaters the setup form and the live settings panel share —
 * same fields, same caps. Only the row-id minter differs: setup rows mint
 * throwaway React keys, live rows mint the character's permanent id.
 *
 * Generic over the draft rather than pinned to PatchableDraft: the setup form
 * carries fields the live panel has no control for (`lockLocale`), and those
 * have to survive a patch untouched. Widening PatchableDraft instead would
 * hand the live panel a setter for a field frozen at create.
 */
export function makeDraftPatches<D extends PatchableDraft>(
  setDraft: Dispatch<SetStateAction<D>>,
  mintRowId: () => string
) {
  const patch = (changes: Partial<ActivityDraftFields>) =>
    setDraft((prev) => ({ ...prev, ...changes }));

  const patchSettings = (changes: Partial<ActivitySettings>) =>
    setDraft((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...changes },
    }));

  const updateCharacter = (id: string, changes: Partial<CharacterDraft>) =>
    setDraft((prev) => ({
      ...prev,
      characters: prev.characters.map((row) =>
        row.id === id ? { ...row, ...changes } : row
      ),
    }));

  const addCharacter = () =>
    setDraft((prev) =>
      prev.characters.length >= MAX_CHARACTERS
        ? prev
        : {
            ...prev,
            characters: [...prev.characters, { id: mintRowId(), name: "" }],
          }
    );

  return { patch, patchSettings, updateCharacter, addCharacter };
}
