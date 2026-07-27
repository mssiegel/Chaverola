import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LOCALE_INITIALS,
  LOCALE_NAME,
  LOCALES,
  switchLocalePath,
  useLocale,
  type Locale,
} from "@/lib/locale";
import { markLocaleExplicit, saveLocale } from "@/lib/localePreference";
import { cn } from "@/lib/utils";

/**
 * Navbar language dropdown. Picking a language swaps the locale prefix on the
 * current URL in place (search/hash preserved) and remembers the choice; from
 * there `LocaleLink` keeps that locale on every internal navigation, and
 * `LocaleEffects` swings the whole document — copy, `lang`, and `dir`.
 *
 * The trigger shows the active locale's initials (the navbar is tight); the
 * menu spells each language out in itself, since a Hebrew reader looks for
 * עברית rather than "Hebrew".
 *
 * `className` restyles the trigger for non-navbar surfaces (e.g. the
 * floating pill on the student world's purple backdrop).
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  const handleChange = (value: string) => {
    const next = value as Locale;
    if (next === locale) return;
    // Persist BEFORE navigating. Without this, someone on a Hebrew phone who
    // deliberately picks English gets bounced back to /he by applyBootLocale
    // on their next load.
    saveLocale(next);
    // …and this is the choice that outranks an activity's own language, so a
    // student who switches at the join gate isn't bounced back by the code
    // they're about to type.
    markLocaleExplicit();
    navigate(`${switchLocalePath(pathname, next)}${search}${hash}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("language.change")}
          className={cn(
            "gap-1.5 px-2.5 text-muted-foreground hover:text-foreground",
            className
          )}
        >
          {/* A globe and a caret: neither is directional. */}
          <Globe className="size-4" />
          <span>{LOCALE_INITIALS[locale]}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
          {/* Mapped, not hand-listed, so a third language is one entry in
              lib/locale.ts and nothing here. */}
          {LOCALES.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {/* Each name in its own script, so it reads natively however
                  the surrounding page is set. */}
              <span lang={option}>{LOCALE_NAME[option]}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
