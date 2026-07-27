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
  - The brand is חברולה. The domain (chaverola.com) stays Latin.
  - Teacher-typed content — character names, the host's name, instructions,
    student names, every message — is NEVER translated, in any locale.
*/
export const common: HebrewOf<CommonCatalog> = {
  "brand.name": "חברולה",
  "brand.home": "חברולה, לדף הבית",

  "share.cardAlt":
    "הלוגו של חברולה, בועת דיבור לבנה עם פרצוף מחייך, על רקע סגול.",

  // A localization of the fallback sentence, not a translation of it: the
  // phrases are the ones the Hebrew homepage already ships ("פעילות כיתתית
  // חינם" is its meta.title, "השם האמיתי של כל תלמיד" its meta.description).
  // Third person, like the English, because this serves student URLs too — so
  // the homepage's "אתה רואה" can't be reused here. "גלוי למורה" puts the
  // teacher in the dative and sidesteps the verb agreement entirely; see
  // DECISIONS.md → "Hebrew talks about the teacher without guessing their
  // gender".
  "shell.description":
    "פעילות כיתתית חינם: כל תלמיד מקבל דמות סודית, ובתוכה מדבר על החומר עם מישהו מהכיתה. כל צ׳אט גלוי למורה בשידור חי, עם השם האמיתי של כל תלמיד.",

  "nav.joinLong": "להצטרף לפעילות",
  "nav.joinShort": "להצטרף",

  "language.change": "החלפת שפה",

  "student.signedInAs": "מחובר בשם ",

  "dialog.close": "סגירה",
  "dialog.dismiss": "סגירה",

  // "בתפקיד" is the playbill connective, the same one the transcript email
  // uses. "בתור" was rejected: תור also means queue, and the pairing rail
  // already owns that word.
  "card.as": " בתפקיד ",
  "card.live": "חי",
  "card.paused": "מושהה",
  "card.ended": "הסתיים",
  "card.fullChat": "כל השיחה",
  "card.minimize": "לכווץ",
  "card.remove": "להוציא את {{name, bidi}} מהשיחה",

  lostConnection: "החיבור נפל",

  "demo.banner": "זה שיעור הדמו. התלמידים מדומים.",
  "demo.bannerStudent": "זה הדמו. שאר התלמידים מדומים.",
  "demo.startYourOwn": "להקים אחד משלך",
  "demo.driving": "אתה מנהל את הדמו",

  "endChat.title": "לסיים את השיחה?",
  "endChat.confirm": "לסיים",
  "endChat.hostBody":
    "התלמידים יראו שהשיחה נגמרה ויוכלו לחזור ללובי. אין דרך לפתוח אותה מחדש.",
  "endChat.hostCancel": "שימשיכו לדבר",

  "notFound.pageTitle": "הדף לא נמצא",
  "notFound.eyebrow": "404",
  "notFound.title": "אין כאן כלום 🫥",
  "notFound.body": "הדף הזה הלך לאיבוד. יש לך קוד מהמורה?",
  "notFound.backHome": "חזרה לדף הבית",

  "error.title": "זה לא נטען 🫠",
  "error.body": "משהו נתקע בדרך. עוד ניסיון בדרך כלל פותר את זה.",
  "error.retry": "לנסות שוב",
};
