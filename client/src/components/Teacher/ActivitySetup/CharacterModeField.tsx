import { useTranslation } from "react-i18next";
import type { CharacterMode } from "@chaverola/shared";

import { cn } from "@/lib/utils";

/**
 * Reading order of the two options, and the only place it's decided. Shuffled
 * leads because it's the default (DEFAULT_ACTIVITY_SETTINGS), and a teacher
 * who reads no further than the first option should be reading the one that's
 * already selected.
 */
const MODES = [
  "shuffled",
  "inOrder",
] as const satisfies readonly CharacterMode[];

/** Catalog keys as a plain module map, the `FAILURE_KEYS` idiom — `as const
 *  satisfies` keeps the literals, which is what lets `t()` check them. */
const MODE_KEYS = {
  inOrder: {
    title: "characters.mode.inOrder.title",
    body: "characters.mode.inOrder.body",
  },
  shuffled: {
    title: "characters.mode.shuffled.title",
    body: "characters.mode.shuffled.body",
  },
} as const satisfies Record<
  CharacterMode,
  { title: `characters.mode.${string}`; body: `characters.mode.${string}` }
>;

interface CharacterModeFieldProps {
  value: CharacterMode;
  onChange: (mode: CharacterMode) => void;
  /**
   * Namespaces the input ids and the radio group's `name`, the same way the
   * shared AboutYouFields does — the setup form and the host page's live
   * panel render this component with different prefixes so two groups could
   * never merge into one.
   */
  idPrefix: string;
  className?: string;
}

/**
 * How a chat's cast gets dealt: the first N names in roster order, or N drawn
 * at random from the whole list. Native `<input type="radio">` under a
 * visually-hidden peer, so arrow-key navigation, roving focus and the group
 * itself come from the browser rather than a hand-rolled `role="radiogroup"`.
 *
 * Always rendered, even with a two-name roster where the two modes deal the
 * same cast — a control that comes and goes is worse than one that sometimes
 * does nothing, so there is no conditional rendering here on purpose.
 *
 * Deliberately silent about two things, both decided against rather than
 * missed: a roster shorter than the class repeats characters across chats
 * (no warning, no block, and no copy anywhere may promise a chat's cast is
 * unique), and in order mode a roster longer than the chat it's dealing
 * strands every name past that chat's last seat — MAX_CHAT_SEATS at the very
 * biggest, and fewer for the pairs and trios most chats are. Don't add a
 * hint, a badge, or a gate for either.
 */
export function CharacterModeField({
  value,
  onChange,
  idPrefix,
  className,
}: CharacterModeFieldProps) {
  const { t } = useTranslation("teacher");
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-2 text-sm font-medium text-foreground">
        {t("characters.mode.label")}
      </legend>

      <div className="flex flex-col gap-2">
        {MODES.map((mode) => {
          const id = `${idPrefix}-character-mode-${mode}`;
          const selected = value === mode;
          return (
            <div key={mode}>
              {/* The real control, hidden but focusable: the label below is
                  its peer, and carries every visible state including the
                  focus ring the hidden input can't show. */}
              <input
                type="radio"
                id={id}
                name={`${idPrefix}-character-mode`}
                value={mode}
                checked={selected}
                onChange={() => onChange(mode)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={cn(
                  "block cursor-pointer rounded-xl border p-3 transition-colors peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
                  selected
                    ? "border-brand-grape bg-brand-grape-soft/40"
                    : "border-input bg-card hover:bg-accent/60"
                )}
              >
                {/* Title row only; the description hangs below at an indent
                    that clears the tick, so it never squeezes into a sliver
                    on phones (SettingRow's shape). */}
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                      selected
                        ? "border-brand-grape bg-brand-grape text-white"
                        : "border-input bg-background"
                    )}
                  >
                    {selected && (
                      <span className="size-2 rounded-full bg-current" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-foreground">
                    {t(MODE_KEYS[mode].title)}
                  </span>
                </span>
                <span className="mt-1.5 block ps-8 text-sm leading-relaxed text-muted-foreground">
                  {t(MODE_KEYS[mode].body)}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
