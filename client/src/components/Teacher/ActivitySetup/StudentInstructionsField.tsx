import { useTranslation } from "react-i18next";

import { STUDENT_INSTRUCTIONS_MAX_CHARS } from "@chaverola/shared";
import { Textarea } from "@/components/ui/textarea";
import { STUDENT_INSTRUCTIONS_COUNTER_FROM } from "@/lib/activitySetup";
import { charCount, clampChars } from "@/lib/text";

import { LimitCounter } from "./FieldFeedback";

/**
 * The student-instructions textarea with its quiet character counter —
 * identical on the setup form and the host page's live panel. Clamped by
 * code points like every other capped input, so the form can't accept what
 * the API rejects.
 */
export function StudentInstructionsField({
  value,
  onChange,
}: {
  value: string;
  onChange: (studentInstructions: string) => void;
}) {
  const { t } = useTranslation("teacher");
  const count = charCount(value);
  return (
    <>
      <Textarea
        rows={3}
        value={value}
        onChange={(event) =>
          onChange(
            clampChars(event.target.value, STUDENT_INSTRUCTIONS_MAX_CHARS)
          )
        }
        aria-label={t("setup.instructions.title")}
        placeholder={t("instructions.placeholder")}
      />
      {count >= STUDENT_INSTRUCTIONS_COUNTER_FROM && (
        <div className="mt-1.5 flex justify-end">
          <LimitCounter
            count={count}
            max={STUDENT_INSTRUCTIONS_MAX_CHARS}
            showFrom={STUDENT_INSTRUCTIONS_COUNTER_FROM}
          />
        </div>
      )}
    </>
  );
}
