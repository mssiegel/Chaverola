import { useTranslation } from "react-i18next";
import { Languages, Lock } from "lucide-react";

import { FormSection } from "./FormSection";
import { SettingRow } from "./SettingsSection";

/**
 * The activity's language, and whether students are held in it.
 *
 * There is no language picker here on purpose: an activity is set up in
 * whatever locale the form itself is being read in, so the language is
 * already chosen by the time a teacher reaches this section. The only
 * decision left is whether it binds the class.
 *
 * Deliberately NOT a fourth row inside SettingsSection. That component is
 * shared with the host page's live panel, and its section hint promises
 * everything in it stays editable while the activity runs — which this one
 * isn't. It's frozen at create, like the locale it locks, so it gets its own
 * card and says so in its hint.
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
      icon={Languages}
      accent="sun"
      hint={t("language.hint")}
    >
      <SettingRow
        id="setting-lock-locale"
        // Not Languages again: the section chip already carries that glyph,
        // and a padlock says what the row actually does.
        icon={Lock}
        title={t("language.lock.title")}
        description={t("language.lock.body")}
        checked={value}
        onCheckedChange={onChange}
      />
    </FormSection>
  );
}
