import type { HebrewOf } from "../../types";
import type { HomeCatalog } from "../en/home";

/**
 * Hebrew — masculine second person throughout; see `he/common.ts` for the
 * house style this folder follows. The homepage sells to teachers, so the
 * voice here is a colleague's: practical, warm, no marketing gloss.
 *
 * Two places where this is a localization rather than a translation, on
 * purpose: the founder's note drops "in Israel" (redundant to a Hebrew
 * reader), and `hero.chatNote` says "גם X וגם Y" instead of a vav prefix,
 * which would collide badly with a Latin character name.
 */
export const home: HebrewOf<HomeCatalog> = {
  // "צ׳אט בתוך דמות" rather than the literal משחק תפקידים — it's the page's
  // own shipped phrase (hero.title) and the lighter of the two to search.
  // Hebrew adjectives follow the noun, so "חינם" sits after פעילות כיתתית
  // and the whole query reads contiguously.
  "meta.title": "פעילות כיתתית חינם: צ׳אט בתוך דמות",
  "meta.description":
    "כל תלמיד מקבל דמות סודית ובן שיח מהכיתה. אתה רואה כל צ׳אט בשידור חי, עם השם האמיתי של כל תלמיד. חינם, ובלי חשבונות לתלמידים.",

  "hero.eyebrow": "פעילות כיתתית למורים",
  "hero.title": "כל הכיתה מדברת. <1>בתוך דמות.</1>",
  "hero.pitch":
    "אתה בוחר את הנושא ומחלק דמויות סודיות. התלמידים מדברים ביניהם על החומר שלמדתם, ומאחורי כל דמות מסתתר תלמיד אמיתי מהכיתה. אף אחד לא יודע מי זה מי, עד שאתה חושף את זה בסוף.",
  "hero.chatCaption":
    "זה הצד של התלמיד, בשידור חי. קדימה, תכתוב בתור {{self, bidi}}.",
  "hero.chatNote":
    "🤫 בסבב אמיתי, גם {{self, bidi}} וגם {{peerShort, bidi}} הם תלמידים שלך. רק אתה יודע מי מגלם את מי, עד החשיפה בסוף.",
  "hero.chatPeerSuffix": " · מגולם בידי תלמיד מהכיתה",
  "hero.stepsLabel": "ההקמה לוקחת בערך דקה:",
  "hero.step1": "יוצרים פעילות ובוחרים דמויות.",
  "hero.step2": "כותבים את קוד ההצטרפות על הלוח.",
  "hero.step3": "התלמידים מדברים. אתה צופה, ואז חושף מי היה מי.",

  "cta.host": "להקים פעילות",

  "teacherView.eyebrow": "המסך של המורה",
  "teacherView.heading": "התלמידים רואים דמויות. אתה רואה מי זה מי.",
  "teacherView.body":
    "בראש הדף הזה מישהו מגלם את {{self, bidi}} ומישהו מגלם את {{peer, bidi}}. אתה, בתור המורה, רואה בדיוק את אותו צ׳אט, עם השם האמיתי של כל תלמיד ליד הדמות שלו.",
  "teacherView.bullet1":
    "התלמידים רואים רק את הדמויות אחד של השני. מולך אף אחד לא אנונימי, אז אם מישהו יוצא מהקווים, תדע בדיוק מי.",
  "teacherView.bullet2":
    "לכל צ׳אט בפעילות יש כרטיס חי משלו, כך שאתה עוקב אחרי כל הכיתה במבט אחד.",
  "teacherView.bullet3":
    "כשהפעילות נגמרת, חברולה יכולה לשלוח לך במייל את התמליל המלא של כל השיחות.",
  "teacherView.caption":
    "זה הצד של המורה, בשידור חי. אותו צ׳אט, עכשיו עם שמות.",
  "teacherView.note":
    "🕵️ תנסה: תכתוב משהו בתור {{self, bidi}} למעלה, ותחזור לכאן. בדמו הזה אתה יושב במקום של {{seat, bidi}}, אז ההודעה תופיע עם השם שלה.",

  "demo.eyebrow": "לראות את זה עובד",
  "demo.heading": "תיכנס לכיתה חיה ותסתובב.",
  "demo.body":
    "שני הצדדים של חברולה, רצים על תלמידים מדומים. תלחץ על מה שבא לך: אין הרשמה, ואי אפשר לשבור כלום.",
  "demo.teacherTitle": "המסך של המורה",
  "demo.teacherBody":
    "כיתה באמצע פעילות. תלמידים נכנסים אחד־אחד ומחכים לשיבוץ, ולכל צ׳אט יש כרטיס חי משלו. אתה מנהל את החדר.",
  "demo.teacherCta": "לפתוח את הדמו של המורה",
  "demo.studentTitle": "הצד של התלמיד",
  "demo.studentBody":
    "אתה מצטרף לכיתת הדמו בשם {{studentName, bidi}} ומשובץ לצ׳אט עם דמות. זו בדיוק אותה דרך שהתלמידים שלך יעברו.",
  "demo.studentCta": "לנסות את הצד של התלמיד",

  "how.eyebrow": "איך זה עובד",
  "how.heading": "באוויר לפני שסיימת לרשום נוכחות.",
  "how.step1.title": "יוצרים את הפעילות",
  "how.step1.body":
    "מקימים אחת לכל נושא שהכיתה לומדת: יחידה בהיסטוריה, מערכת השמש, מה שבא. לוקח בערך דקה.",
  "how.step2.title": "בוחרים את הדמויות",
  // The one place the copy names the hero cast in prose rather than through
  // an interpolation, so it follows the Hebrew cast: גולדה and the man keeping
  // a secret from her, where English has its queen and its senator.
  "how.step2.body":
    "אתה מחליט את מי התלמידים מגלמים. דמויות מהספר שאתם קוראים, או גולדה מסוימת ומי שלא מספר לה כלום.",
  "how.step3.title": "משתפים קוד בן 4 ספרות",
  "how.step3.body":
    "כותבים אותו על הלוח. התלמידים לוחצים על הצטרפות מכל מכשיר ומקלידים אותו.",
  "how.step4.title": "התלמידים נכנסים מיד",
  "how.step4.body":
    "כל תלמיד מקבל דמות סודית ובן שיח מהכיתה. אתה עוקב אחרי כל החדר מהמסך שלך, ואז חושף מי היה מי.",
  "how.fact1": "מסלול חינם לכל מורה",
  "how.fact2": "בלי חשבונות לתלמידים",
  "how.fact3": "עובד על כל דבר עם דפדפן",

  "plans.eyebrow": "מסלולים",
  "plans.heading": "המסלול החינמי הוא כל התוכנה.",
  "plans.body":
    "כל מה שיש בדף הזה חינם לכל מורה: הדמויות, המסך החי, החשיפה בסוף. המסלול השני הוא למורים ולבתי ספר שרוצים אותנו לצידם.",
  "plans.free.name": "חינם",
  "plans.free.tagline": "כל מה שחברולה עושה היום, לכל מורה שרוצה.",
  "plans.free.bullet1": "יצירת פעילויות וחלוקת דמויות סודיות",
  "plans.free.bullet2":
    "התלמידים מדברים בתוך דמות מכל דפדפן, בלי חשבונות ובלי להתקין כלום",
  "plans.free.bullet3": "מסך מורה חי שבו אתה רואה כל שיחה של תלמידים",
  "plans.free.bullet4": "חשיפת השמות בסוף כל צ׳אט, כשהתלמידים מגלים מי היה מי",
  "plans.free.bullet5": "תמלילים שנשלחים אליך במייל כשהשיעור נגמר",
  "plans.complete.sticker": "יחד עם הצוות של חברולה",
  "plans.complete.name": "ליווי מלא",
  "plans.complete.tagline":
    "למורים ולבתי ספר שרוצים עזרה בלהפוך את חברולה לחלק מהדרך שבה הם מלמדים.",
  "plans.complete.bullet1":
    "הדרכה מהצוות שלנו על שילוב פעילויות בתוכנית הלימודים שלך",
  "plans.complete.bullet2":
    "חיבורים ל־<1>Google Classroom</1> ולשאר הכלים שבית הספר שלך כבר עובד איתם",
  "plans.complete.bullet3":
    "חשבון מורה, כך שהדמויות שלך נשמרות ומוכנות לפעילות הבאה",
  "plans.complete.bullet4":
    "משימות באמצע הפעילות: כותבים אותן מראש, ואז שולחים כל אחת לצ׳אטים של התלמידים כשהחדר מוכן לה",
  "plans.complete.price": "המחיר לפי מורה או לפי בית ספר.",
  "plans.complete.cta": "לכתוב למשה",
  "plans.dialog.title": "בוא נמצא מה מתאים",
  "plans.dialog.body":
    "בין אם אתה מורה אחד או בית ספר שלם, הליווי המלא נבנה סביבך, וגם המחיר. תכתוב למשה קצת על מה שאתה מתכנן, ונמשיך משם.",
  "plans.dialog.emailCta": "לשלוח מייל למשה",
  "plans.dialog.copyLabel": "או להעתיק את הכתובת:",
  "plans.mailto.subject": "ליווי מלא בחברולה",
  "plans.mailto.body": "היי משה,\n\n",

  "founder.heading": "מילה מהמייסד",
  "founder.p1": "אני משה, ואני מתנדב במחלקה לאנגלית בתיכון בבית שמש.",
  "founder.p2":
    "תמיד אהבתי משחקים מרובי משתתפים כמו Warcraft ו-Brawl Stars. אנשים שם סקרנים וערניים בצורה שלא רואים הרבה בכיתה, וזה לא הפסיק להציק לי. אפשר שגם שיעור ירגיש ככה חי?",
  "founder.p3":
    "אז בניתי את המשחק שהייתי שמח לשחק בתיכון. כל תלמיד נכנס לדמות ומדבר עם חברים לכיתה על מה שהכיתה לומדת. אני מקווה שזה יהיה השיעור שהם מספרים עליו בארוחת ערב.",
  "founder.p4":
    "השם מחבר שתי מילים: חבר, ועולה. חברים מעלים אחד את השני. זה מה שרציתי שהדבר הזה יהיה, אז שמתי את זה ישר בשם.",
  "founder.p5":
    "אם יש לך שאלות, רעיונות, או שסתם בא לך להגיד שלום, אשמח לשמוע.",
  "founder.signoff": "בברכה,",
  "founder.name": "משה סיגל",
  "founder.initials": "מ״ס",
  "founder.photoPlaceholder": "מציין מקום לתמונה של משה סיגל",
  "founder.photoAlt": "משה סיגל, מייסד חברולה",
  "founder.photoSoon": "תמונה בקרוב",
  "founder.mailto.subject": "מחשבות על חברולה",
  "founder.mailto.body": "היי משה,\n\n",
};
