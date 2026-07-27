import type { HebrewOf } from "../../types";
import type { CommonCatalog } from "../en/common";

/*
  Hebrew — the house style for every catalog in this folder.

  - Second person is MASCULINE, always. Never slash forms ("אתה/את",
    "הצטרף/י"): this is a game-like product for teenagers and the slashes read
    like a permission slip. Founder call — see DECISIONS.md → "Hebrew is
    written in masculine second person".
  - Conversational, not institutional. Teacher surfaces talk to a colleague;
    student surfaces read at upper-middle/high-school level.
  - The brand is חברולה. The domain (www.chaverola.com) stays Latin.
  - Teacher-typed content — character names, the host's name, instructions,
    student names, every message — is NEVER translated, in any locale.
*/
export const common: HebrewOf<CommonCatalog> = {
  "brand.name": "חברולה",
  "brand.home": "חברולה, לדף הבית",

  "nav.joinLong": "להצטרף לפעילות",
  "nav.joinShort": "להצטרף",

  "language.change": "החלפת שפה",

  "student.signedInAs": "מחובר בשם ",

  "dialog.close": "סגירה",
  "dialog.dismiss": "סגירה",

  "notFound.pageTitle": "הדף לא נמצא",
  "notFound.eyebrow": "404",
  "notFound.title": "אין כאן כלום 🫥",
  "notFound.body": "הדף הזה הלך לאיבוד. יש לך קוד מהמורה?",
  "notFound.backHome": "חזרה לדף הבית",

  "error.title": "זה לא נטען 🫠",
  "error.body": "משהו נתקע בדרך. עוד ניסיון בדרך כלל פותר את זה.",
  "error.retry": "לנסות שוב",
};
