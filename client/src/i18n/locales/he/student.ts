import type { HebrewOf } from "../../types";
import type { StudentCatalog } from "../en/student";

/**
 * Hebrew — masculine second person throughout; see `he/common.ts` for the
 * house style this folder follows. This namespace talks to teenagers, so it
 * reads at upper-middle/high-school level and sounds like the game it is.
 */
export const student: HebrewOf<StudentCatalog> = {
  "title.join": "הצטרפות לפעילות",
  "title.reconnecting": "מתחבר מחדש",
  "title.lobby": "חדר המתנה",
  "title.chatting": "בצ׳אט",
  "title.ended": "הצ׳אט נגמר",
  "title.activityGone": "הפעילות נגמרה",

  "join.meta.description":
    "קיבלת קוד מהמורה? מקלידים אותו כאן ומצטרפים לפעילות.",
};
