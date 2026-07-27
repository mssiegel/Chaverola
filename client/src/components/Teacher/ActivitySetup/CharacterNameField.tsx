import { useRef, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { SmilePlus } from "lucide-react";

import {
  LazyEmojiPicker,
  prefetchEmojiPicker,
} from "@/components/chat/LazyEmojiPicker";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NAME_MAX_CHARS } from "@/lib/activitySetup";
import { charCount, clampChars } from "@/lib/text";

interface CharacterNameFieldProps {
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
  /** Accessible name for the input, e.g. "Character 1 name". */
  label: string;
  /** Accessible name for the emoji button — one per row, so it must say which. */
  emojiButtonLabel: string;
  invalid?: boolean;
  /** The form's focus registry: it scrolls to the first problem field. */
  registerRef: (el: HTMLElement | null) => void;
}

/**
 * One character's name, emoji and all. There is no separate emoji field: an
 * emoji is just text in the name, so what the teacher types is exactly what
 * students read (see DECISIONS.md → "A character's emoji is part of its
 * name").
 *
 * The picker inside the input's left edge is a desktop convenience for a
 * keyboard that has no emoji key. Touch devices don't get it
 * (`pointer-coarse:hidden`, the same rule the student composer uses) because
 * their on-screen keyboard already has one, and the input reclaims the
 * padding so no gap is left behind.
 */
export function CharacterNameField({
  value,
  onChange,
  placeholder,
  label,
  emojiButtonLabel,
  invalid,
  registerRef,
}: CharacterNameFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // An input that has never held focus reports selectionStart 0, which would
  // drop the emoji in front of a restored draft's name. Only trust the caret
  // once the teacher has actually been in the field; browsers keep it
  // accurate after a blur, which is what makes it readable at pick time.
  const caretIsReal = useRef(false);

  const insertEmoji = ({ emoji }: EmojiClickData) => {
    const el = inputRef.current;
    const usable = caretIsReal.current && el ? el : null;
    const start = usable?.selectionStart ?? value.length;
    const end = usable?.selectionEnd ?? value.length;
    const candidate = value.slice(0, start) + emoji + value.slice(end);
    if (charCount(candidate) > NAME_MAX_CHARS) return; // no room; ignore
    onChange(candidate);
    setPickerOpen(false);
    const caret = start + emoji.length;
    // Put the teacher back in the name with the caret after the emoji, so
    // they can keep typing. Closing the popover would otherwise hand focus
    // back to the button (hence the prevented onCloseAutoFocus below).
    requestAnimationFrame(() => {
      const node = inputRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="relative">
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={emojiButtonLabel}
            // Blink focuses a button on mousedown, before any handler —
            // preventing it leaves the caret where the teacher left it.
            onMouseDown={(event) => event.preventDefault()}
            className="absolute start-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground pointer-coarse:hidden"
          >
            <SmilePlus className="size-5" />
          </button>
        </PopoverTrigger>
        {/* Same clamp the composer's popover uses: a definite height, capped
            by the room Radix says it actually has, so a long row list can't
            push the picker off the card. */}
        <PopoverContent
          align="start"
          collisionPadding={8}
          className="h-[min(23rem,var(--radix-popper-available-height))] w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-0"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <LazyEmojiPicker
            // Nothing to protect here — no phone keyboard can open over a
            // desktop-only picker — so landing in the search box is the
            // fastest path to a specific emoji.
            autoFocusSearch
            onPick={insertEmoji}
          />
        </PopoverContent>
      </Popover>

      <Input
        ref={(el) => {
          inputRef.current = el;
          registerRef(el);
        }}
        value={value}
        onChange={(event) =>
          onChange(clampChars(event.target.value, NAME_MAX_CHARS))
        }
        onFocus={() => {
          caretIsReal.current = true;
          // Warm the picker's chunk while the teacher is still typing.
          prefetchEmojiPicker();
        }}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        className="h-12 ps-12 pointer-coarse:ps-3.5"
      />
    </div>
  );
}
