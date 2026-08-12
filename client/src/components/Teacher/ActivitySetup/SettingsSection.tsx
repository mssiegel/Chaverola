import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Eye,
  Repeat2,
  SlidersHorizontal,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { AUTO_MATCH_SECONDS } from "@/lib/activitySetup";
import { cn } from "@/lib/utils";
import type { ActivitySettings } from "@/types/activity";

import { AccentIconChip, FormSection } from "./FormSection";
import { NumberStepper } from "./NumberStepper";

interface SettingsSectionProps {
  settings: ActivitySettings;
  onChange: (changes: Partial<ActivitySettings>) => void;
  /**
   * Renders just the setting rows without the FormSection card — the host
   * page's live panel provides its own section chrome around them.
   */
  bare?: boolean;
  /**
   * Every chat is paused, so auto-match is pairing nobody right now and the
   * row says so instead of promising pairing. The host page passes
   * `engine.paused` (the same value the pairing rail gets); the setup form
   * has no such state and passes nothing.
   */
  paused?: boolean;
}

/**
 * The three activity toggles. Reveal names and the rematch warning ship on;
 * auto-match ships off, so nothing pairs until the teacher says so. A
 * toggle's sub-control stays visible but disabled while it's off — the
 * teacher can see what turning it on will do, and nothing jumps around. All
 * of it stays editable while the activity runs.
 */
export function SettingsSection({
  settings,
  onChange,
  bare,
  paused,
}: SettingsSectionProps) {
  const { t } = useTranslation("teacher");

  const rows = (
    <div className="divide-y divide-border/70">
      <SettingRow
        id="setting-reveal-names"
        icon={Eye}
        title={t("settings.reveal.title")}
        description={t("settings.reveal.body")}
        checked={settings.revealNames}
        onCheckedChange={(revealNames) => onChange({ revealNames })}
      />

      <SettingRow
        id="setting-rematch-warning"
        // No flip-rtl: Repeat2 is a cycle glyph, and a cycle has no reading
        // direction to mirror.
        icon={Repeat2}
        title={t("settings.rematch.title")}
        description={t("settings.rematch.body")}
        checked={settings.rematchWarning}
        onCheckedChange={(rematchWarning) => onChange({ rematchWarning })}
      />

      <SettingRow
        id="setting-auto-match"
        icon={Zap}
        title={t("settings.autoMatch.title")}
        // Paused only outranks the normal description while the setting is
        // ON — the same off > paused > on order the pairing rail uses, and
        // it opens with the rail's own sentence so the two controls can't
        // read as two different truths. Switched off, the row keeps
        // describing what turning it on will do.
        description={
          paused && settings.autoMatch
            ? t("settings.autoMatch.bodyPaused")
            : t("settings.autoMatch.body")
        }
        checked={settings.autoMatch}
        onCheckedChange={(autoMatch) => onChange({ autoMatch })}
      >
        <SubControl
          label={t("settings.autoMatch.wait")}
          muted={!settings.autoMatch}
        >
          <NumberStepper
            value={settings.autoMatchSeconds}
            bounds={AUTO_MATCH_SECONDS}
            disabled={!settings.autoMatch}
            format={(v) => t("settings.autoMatch.seconds", { seconds: v })}
            decreaseLabel={t("settings.autoMatch.less")}
            increaseLabel={t("settings.autoMatch.more")}
            onChange={(autoMatchSeconds) => onChange({ autoMatchSeconds })}
          />
        </SubControl>
      </SettingRow>
    </div>
  );

  if (bare) return rows;

  return (
    <FormSection
      quiet
      title={t("settings.title")}
      icon={SlidersHorizontal}
      accent="mint"
      hint={t("settings.hint")}
    >
      {rows}
    </FormSection>
  );
}

/**
 * One toggle row: icon chip, label, switch, and the description hanging
 * below. Exported because the Language section renders the same row outside
 * this card — a switch row is repeated chrome, not a class string to copy.
 */
export function SettingRow({
  id,
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      {/* Title row only; the description hangs below so the icon chip and
          switch never squeeze it into a sliver on phones. */}
      <div className="flex items-center gap-3">
        <AccentIconChip accent="neutral" icon={Icon} />
        <label
          htmlFor={id}
          className="min-w-0 flex-1 cursor-pointer font-medium text-foreground"
        >
          {title}
        </label>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      <p className="mt-1.5 ps-12 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  );
}

function SubControl({
  label,
  muted,
  children,
}: {
  label: string;
  muted: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 ps-12">
      <span
        className={cn(
          "text-sm transition-colors",
          muted ? "text-muted-foreground/60" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
