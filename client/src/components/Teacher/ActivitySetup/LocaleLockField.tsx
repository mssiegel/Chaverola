import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

import { Switch } from "@/components/ui/switch";

import { FormSection } from "./FormSection";

const TITLE_ID = "language-settings-title";

/**
 * The activity's language, and whether students are held in it.
 *
 * There is no language picker here on purpose: an activity is set up in
 * whatever locale the form itself is being read in, so the language is
 * already chosen by the time a teacher reaches this section. The only
 * decision left is whether it binds the class.
 *
 * One setting, so the section header IS the row — no inner SettingRow, and
 * no second icon under the section's own chip. The switch names itself from
 * the heading rather than carrying a duplicate label.
 *
 * Deliberately NOT a fourth row inside SettingsSection, even though it sits
 * directly below it. That component is shared with the host page's live
 * panel, which can't edit this, and its section hint promises everything in
 * it stays editable while the activity runs. This one is frozen at create,
 * like the locale it locks, so the separate card is what keeps that promise
 * honest — the adjacency makes it matter more, not less.
 */
export function LocaleLockField({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (lockLocale: boolean) => void;
}) {
  const { t } = useTranslation("teacher");
  return (
    <FormSection
      quiet
      title={t("language.title")}
      titleId={TITLE_ID}
      icon={Languages}
      accent="sun"
      hint={t("language.lock.body")}
      action={
        <Switch
          id="setting-lock-locale"
          aria-labelledby={TITLE_ID}
          checked={value}
          onCheckedChange={onChange}
        />
      }
    />
  );
}
