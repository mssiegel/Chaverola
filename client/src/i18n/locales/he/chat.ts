import type { HebrewOf } from "../../types";
import type { ChatCatalog } from "../en/chat";

/** Hebrew — masculine second person throughout; see `he/common.ts` for the
 *  house style this folder follows. A chat is where teenagers actually are,
 *  so this namespace is the most spoken-Hebrew of the five. */
export const chat: HebrewOf<ChatCatalog> = {
  "header.youAre": "אתה ",
  "header.with": "עם ",
  // Hebrew spells small numbers as words, and this count is 1 or 2 in
  // practice — a chat holds four people at most.
  "header.others_one": "ועוד אחד",
  "header.others_two": "ועוד שניים",
  "header.others_other": "ועוד {{count}}",
  "header.roster": "מי בצ׳אט",
  "header.you": "(אתה)",

  "line.retry": "לא נשלח. לנסות שוב",
  "line.failed": "זה לא נשלח",
  "line.newMessages": "הודעות חדשות",

  "notice.left": "{{name, bidi}} יצא מהצ׳אט",
  "notice.timedOut": "{{name, bidi}} לא הצליח לחזור ויצא מהצ׳אט",
  "notice.someone": "מישהו",
  "notice.mysteryGuest": "אורח מסתורי",

  "typing.someone": "מישהו",
  "typing.line": "<1>{{name}}</1> מקליד…",

  "peer.fallback": "השותף שלך",
  "peer.lost": "{{name, bidi}} נפל מהחיבור…",
  // The Hebrew puts the words the clock needs on BOTH sides of it, which is
  // exactly why this is one <Trans> key and not a prefix plus a suffix.
  "peer.clock": "נשארו לו <1>{{clock}}</1> לחזור",
  "peer.srWindow": "נשארו לו {{minutes}} דקות לחזור",
  "peer.back": "{{name, bidi}} חזר! 🎉",
  "self.reconnecting": "מתחבר מחדש…",
  // Actor-free, like the student catalog's endings: "eyes up front" already
  // says whose doing it is, and naming the teacher would force a gender.
  paused: "הצ׳אט מושהה. עיניים קדימה! 👀",

  "composer.hold": "אתה בקצב. שולח את אלה בעוד {{seconds}} שניות",
  "composer.pausedPlaceholder": "מושהה. רגע אחד…",
  // "בתור" here, not the playbill "בתפקיד" that `common`'s card.as uses: on
  // the homepage this placeholder sits a few pixels under `home`'s
  // "תכתוב בתור {{self}}", and two words for one idea on one screen reads
  // worse than the collision with תור-the-queue, which lives on a screen a
  // student never sees.
  "composer.talkAs": "לדבר בתור {{name, bidi}}…",
  "composer.placeholder": "כתוב הודעה…",
  "composer.addEmoji": "להוסיף אימוג׳י",
  "composer.send": "לשלוח הודעה",

  "emoji.loading": "טוען אימוג׳ים…",
  "emoji.search": "חיפוש",
  "emoji.clear": "לנקות",
  "emoji.suggested": "בשימוש לאחרונה",
  "emoji.smileysPeople": "פרצופים ואנשים",
  "emoji.animalsNature": "חיות וטבע",
  "emoji.foodDrink": "אוכל ושתייה",
  "emoji.travelPlaces": "נסיעות ומקומות",
  "emoji.activities": "פעילויות",
  "emoji.objects": "חפצים",
  "emoji.symbols": "סמלים",
  "emoji.flags": "דגלים",
};
