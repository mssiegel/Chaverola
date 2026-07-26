import { Plus, X } from "lucide-react";

import {
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  NAME_COUNTER_FROM,
  NAME_MAX_CHARS,
  type CharacterDraft,
  type SetupField,
} from "@/lib/activitySetup";
import { charCount } from "@/lib/text";

import { CharacterNameField } from "./CharacterNameField";
import { FieldError, LimitCounter } from "./FieldFeedback";

/** A character row in form state: a draft plus a stable key for React. */
export interface CharacterRowState extends CharacterDraft {
  id: string;
}

/** Placeholder ideas, one per row — same cast as the Rome demo activity. */
const ROW_PLACEHOLDERS = [
  "Caesar's ghost",
  "Brutus",
  "Cleopatra",
  "Marc Antony",
];

interface CharacterRowsFieldProps {
  rows: CharacterRowState[];
  onUpdate: (id: string, changes: Partial<CharacterDraft>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  problemFor: (field: SetupField) => string | undefined;
  registerField: (field: SetupField) => (el: HTMLElement | null) => void;
}

/**
 * The 2–4 character rows. Each is one name field, hard-capped at 30
 * characters — names prefix every chat line. An emoji, if the teacher wants
 * one, is simply part of that name. The first two rows are permanent (an
 * activity needs two characters anyway); rows 3–4 get a remove button, no
 * confirmation — retyping a name is cheap.
 *
 * The remove button is never gated, on the live host page either. A running
 * chat holds the cast it was dealt (feature 18), so removing a character it
 * is using can't strand a label — the row goes, the chat keeps its names,
 * and only future deals see the shorter roster.
 */
export function CharacterRowsField({
  rows,
  onUpdate,
  onAdd,
  onRemove,
  problemFor,
  registerField,
}: CharacterRowsFieldProps) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => {
        const error = problemFor(`character-${index}`);
        const count = charCount(row.name);
        const removable = index >= MIN_CHARACTERS;
        return (
          <div key={row.id} className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <CharacterNameField
                value={row.name}
                onChange={(name) => onUpdate(row.id, { name })}
                placeholder={ROW_PLACEHOLDERS[index] ?? "Another character"}
                label={`Character ${index + 1} name`}
                emojiButtonLabel={`Add an emoji to character ${index + 1}`}
                invalid={Boolean(error)}
                registerRef={registerField(`character-${index}`)}
              />
              {(error || count >= NAME_COUNTER_FROM) && (
                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  {error ? (
                    <FieldError message={error} />
                  ) : (
                    <span aria-hidden />
                  )}
                  <LimitCounter
                    count={count}
                    max={NAME_MAX_CHARS}
                    showFrom={NAME_COUNTER_FROM}
                  />
                </div>
              )}
            </div>

            {removable ? (
              <button
                type="button"
                onClick={() => onRemove(row.id)}
                aria-label={`Remove character ${index + 1}`}
                className="mt-2 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            ) : (
              // Spacer where rows 3–4 show their remove button, so every
              // name input ends on the same line.
              <div className="w-8 shrink-0" aria-hidden />
            )}
          </div>
        );
      })}

      {rows.length < MAX_CHARACTERS && (
        <button
          type="button"
          onClick={onAdd}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-input text-sm font-semibold text-muted-foreground transition-colors hover:border-brand-grape/60 hover:bg-brand-grape-soft/40 hover:text-brand-grape"
        >
          <Plus className="size-4" aria-hidden />
          Add a character
        </button>
      )}
    </div>
  );
}
