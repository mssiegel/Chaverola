import {
  hasString,
  isRecord,
  readSessionJson,
  removeSessionItem,
  writeSessionJson,
} from "@/lib/storage";

import { isLocale, type Locale } from "./locale";

/*
  The language a locked activity put this tab in, remembered across reloads.

  Why it has to exist: the activity's language is applied by an effect in
  JoinActivityPage, and that effect is deliberately blocked once a seat is in
  sessionStorage — a cross-locale navigate remounts the page and the lobby
  hook's cleanup emits `lobby:leave`, so re-deciding the language under a
  seated student would drop their seat, or end their partner's chat. Which
  means a seated student who reloads gets whatever `applyBootLocale` guesses,
  and for a Hebrew phone in an English-locked class that is the wrong answer
  with the switcher already hidden. A dead end.

  So the decision is made once, while the student is still unseated, and
  written down. `applyBootLocale` reads it before React exists and rewrites
  the URL there — no remount, no socket, and frame 1 already correct.

  sessionStorage, keyed to the join code: this is one lesson's rule, not a
  preference. It dies with the tab like the seat does, it never touches the
  visitor's saved language, and a different code ignores it.
*/

const KEY = "chaverola.activityLocale";

export interface ActivityLocalePin {
  joinCode: string;
  locale: Locale;
}

export function readLocalePin(): ActivityLocalePin | null {
  return readSessionJson(KEY, (parsed) => {
    if (!isRecord(parsed) || !hasString(parsed, "joinCode")) return null;
    const { joinCode, locale } = parsed;
    return isLocale(locale) ? { joinCode: joinCode as string, locale } : null;
  });
}

export function writeLocalePin(pin: ActivityLocalePin): void {
  writeSessionJson(KEY, pin);
}

export function clearLocalePin(): void {
  removeSessionItem(KEY);
}
