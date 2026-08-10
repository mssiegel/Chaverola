import { useTranslation } from "react-i18next";
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

/**
 * Placeholder ideas, one per row — catalog KEYS, because the cast is example
 * content rather than copy: each locale gets the roster its own classroom
 * would recognise (the Rome demo's in English, 1948 Tel Aviv's in Hebrew).
 */
const ROW_PLACEHOLDER_KEYS = [
  "characters.placeholder1",
  "characters.placeholder2",
  "characters.placeholder3",
  "characters.placeholder4",
] as const satisfies readonly `characters.placeholder${number}`[];

interface CharacterRowsFieldProps {
  rows: CharacterRowState[];
  onUpdate: (id: string, changes: Partial<CharacterDraft>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  problemFor: (field: SetupField) => string | undefined;
  registerField: (field: SetupField) => (el: HTMLElement | null) => void;
}

/**
 * The character rows. Each is one name field, hard-capped at 30 characters —
 * names prefix every chat line. An emoji, if the teacher wants one, is simply
 * part of that name. The first two rows are permanent (an activity needs two
 * characters anyway); every row after them gets a remove button, no
 * confirmation — retyping a name is cheap.
 *
 * Rows are added one at a time, and a long roster is ordinary: shuffled mode
 * deals each chat its own characters, so a class of forty can have forty
 * names. The list scrolls with the page and never inside its own box — setup
 * is one scrolling form, and a nested scroller on a phone is worse than a long
 * page.
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
  const { t } = useTranslation("teacher");
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => {
        const error = problemFor(`character-${index}`);
        const placeholderKey = ROW_PLACEHOLDER_KEYS[index];
        const count = charCount(row.name);
        const removable = index >= MIN_CHARACTERS;
        return (
          <div key={row.id} className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <CharacterNameField
                value={row.name}
                onChange={(name) => onUpdate(row.id, { name })}
                placeholder={t(placeholderKey ?? "characters.placeholderExtra")}
                label={t("characters.nameLabel", { number: index + 1 })}
                emojiButtonLabel={t("characters.emojiLabel", {
                  number: index + 1,
                })}
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
                aria-label={t("characters.removeLabel", {
                  number: index + 1,
                })}
                className="mt-2 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            ) : (
              // Spacer where the later rows show their remove button, so
              // every name input ends on the same line.
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
          {t("characters.add")}
        </button>
      )}
    </div>
  );
}
