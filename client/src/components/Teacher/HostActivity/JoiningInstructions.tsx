import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link2, Megaphone } from "lucide-react";

import { useLocalePath } from "@/lib/locale";

import { CollapsibleSection } from "./CollapsibleSection";

/** The address students hear, spoken and written. The apex, not `www` — it's
 *  the canonical host, and one less thing for a teacher to say out loud to a
 *  room. Latin in every locale, so every rendering of it carries `dir="ltr"`
 *  — an RTL line otherwise lays it out as `com.chaverola`. */
const SPOKEN_DOMAIN = "chaverola.com";

/**
 * How students get in: the pin, said out loud or written on the board —
 * never a shared screen. This page shows who's waiting and who's paired
 * with whom, so projecting it would give the mystery away (the
 * no-projection principle; see DECISIONS.md).
 */
export function JoiningInstructions({ joinCode }: { joinCode: string }) {
  const { t } = useTranslation(["teacher", "common"]);
  const localePath = useLocalePath();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    []
  );

  const handleCopy = async () => {
    // The spoken instructions say chaverola.com (the address students
    // hear); the clipboard gets THIS origin, so the copied link opens the
    // real join page wherever the app is running. Never printed on screen.
    const url = `${window.location.origin}${localePath(`/activity/join/${joinCode}`)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions) — nothing to confirm.
    }
  };

  return (
    <CollapsibleSection
      title={t("joining.title")}
      icon={Megaphone}
      accent="sky"
      collapsedHint={
        <>
          {t("joining.hint.pin", { code: joinCode })} · {t("joining.hint.site")}{" "}
          <span dir="ltr">{SPOKEN_DOMAIN}</span>
        </>
      }
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* dir="ltr" on the tile: `tracking-[0.2em]` puts a letter-space
            after the last digit, and an RTL box lands that gap on the
            wrong edge, shunting the pin off-centre. */}
        <div
          dir="ltr"
          className="shrink-0 rounded-2xl border-2 border-dashed border-brand-grape/40 bg-brand-grape-soft/50 px-8 py-4 text-center"
        >
          <span className="block text-xs font-bold tracking-wide text-brand-grape-strong/80 uppercase">
            {t("joining.pinLabel")}
          </span>
          <span className="block text-4xl font-bold tracking-[0.2em] text-brand-grape-strong tabular-nums sm:text-5xl">
            {joinCode}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            {t("joining.tellClass")}
          </p>
          {/* The markers are hand-written, so each one carries its own
              dir="ltr" — "1." is a digit next to a neutral full stop, which
              an RTL line renders as ".1". */}
          <ol className="mt-1.5 space-y-1 text-sm text-muted-foreground">
            <li>
              <span dir="ltr">1.</span> {t("joining.step1")}{" "}
              <span dir="ltr" className="font-semibold text-foreground">
                {SPOKEN_DOMAIN}
              </span>
            </li>
            <li>
              <span dir="ltr">2.</span> {t("joining.step2")}{" "}
              <span className="font-semibold text-foreground">
                {t("common:nav.joinLong")}
              </span>
            </li>
            <li>
              <span dir="ltr">3.</span> {t("joining.step3")}
            </li>
          </ol>
          <p className="mt-2.5 text-sm text-muted-foreground">
            {t("joining.body")}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-grape underline-offset-4 transition-colors hover:text-brand-grape-strong hover:underline"
          >
            <Link2 aria-hidden className="size-4" />
            {copied ? t("joining.copied") : t("joining.copy")}
          </button>
        </div>
      </div>
    </CollapsibleSection>
  );
}
