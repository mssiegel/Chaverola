import { DEMO_JOIN_CODE } from "@chaverola/shared";
import type { Locale } from "@/lib/locale";
import type { Activity } from "@/types/activity";

/*
  The one mock activity behind the student join flow. Per the project brief,
  the demo join code `1234` always works, fully client-simulated; real codes
  resolve over the API. DEMO_JOIN_CODE itself lives in @chaverola/shared
  (the server refuses to issue or answer for it) and is re-exported here.

  Locale-keyed, and the two casts are NOT translations of each other: English
  runs Rome on the Ides of March, Hebrew runs Tel Aviv on the eve of the
  Declaration. See DECISIONS.md → "The Hebrew demo is re-cast, never
  translated". Assembled into DEMO_CONTENT by the barrel; components read it
  through `useDemoContent()`.
*/

export { DEMO_JOIN_CODE };

/**
 * The name waiting in the demo's name field, so demo entries (the homepage's
 * "Try the student side", /demo/student) are one click from the lobby.
 * Deliberately absent from every pretend roster, so the demo never shows two
 * of the same name side by side.
 */
export const demoStudentNames: Record<Locale, string> = {
  en: "Rachel",
  he: "נועה",
};

export const demoActivities: Record<Locale, Activity> = {
  en: {
    joinCode: DEMO_JOIN_CODE,
    hostName: "Ms. Cohen",
    // Nobody set `1234` up, so it has no authored language: each locale's cast
    // simply says it is the one it was written in. The join page skips locale
    // inheritance for the demo entirely (JoinActivityPage), so this field is
    // never read to redirect anyone — it exists because Activity is the wire
    // shape.
    locale: "en",
    // 239 chars on purpose: the instructions counter appears at 200 and turns
    // red at the 250-char cap, so this sits between — the demo shows the
    // counter working instead of a seeded value that reads as an error. Keep
    // any rewrite at 200-249 chars.
    studentInstructions:
      "Rome, on the Ides of March. A rumor is going around the forum, and " +
      "nobody knows who to trust. Stay in character and ask nosy questions. " +
      "And don't tell anyone what you saw last night: someone in this chat " +
      "knows more than they're letting on.",
    characters: [
      { id: "caesars-ghost", name: "Caesar's ghost 👻" },
      { id: "brutus", name: "Brutus 🔪" },
      { id: "cleopatra", name: "Cleopatra 👑" },
      // No emoji on purpose: a name is just a name, and the demo roster should
      // show somewhere visible that not every teacher adds one.
      { id: "marc-antony", name: "Marc Antony" },
    ],
  },
  he: {
    joinCode: DEMO_JOIN_CODE,
    hostName: "רותי כהן",
    locale: "he",
    // 212 characters by `Array.from(s).length`, the same 200-249 band the
    // English one sits in. Hebrew is denser than English, so this is measured
    // rather than translated — don't carry the English "239" over.
    studentInstructions:
      "תל אביב, ה׳ באייר תש״ח, השעות שלפני ההכרזה. שמועה עוברת בעיר ואף אחד " +
      "לא יודע במי לבטוח. תישארו בתוך הדמות ותשאלו שאלות סקרניות. ואל תספרו " +
      "לאף אחד מה ראיתם אתמול בלילה: מישהו כאן יודע הרבה יותר ממה שהוא מוכן " +
      "לספר.",
    characters: [
      // Herzl's ghost is the structural twin of Caesar's: the man whose
      // absence set the scene, turning up fifty years after Basel to comment.
      { id: "herzls-ghost", name: "הרוח של הרצל 👻" },
      { id: "ben-gurion", name: "בן־גוריון 📜" },
      { id: "golda", name: "גולדה 🕊️" },
      // Emoji-free on purpose, mirroring the English roster's fourth seat.
      { id: "zeev-sharef", name: "זאב שרף" },
    ],
  },
};
