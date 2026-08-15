import { DEFAULT_ACTIVITY_SETTINGS } from "@/lib/activitySetup";
import type { Locale } from "@/lib/locale";
import type { Activity, HostedActivity } from "@/types/activity";
import type { ChatEndReason, ChatStatus } from "@/types/chat";

/*
  Mock data behind the teacher's live activity page. The host demo runs the
  SAME activity as the student join flow (code `1234`) — there is no cross-tab
  sync, the two sides just agree on the story. The dialogue here is
  deliberately character-agnostic: chats on the host page get characters
  assigned at pairing time (possibly a teacher's own cast), so no line may
  name a specific character.

  That constraint has a second half in Hebrew, and it is the one a translator
  breaks first: a Hebrew line must not guess the speaker's or the listener's
  GENDER either, since the cast could be גולדה talking to בן־גוריון. Written
  unvocalized, second-person past ("ענית", "השתנית") and the whole first-person
  past are identical for both genders, so these lines lean on those and avoid
  present-tense verbs and imperatives about the other person.
*/

/**
 * The demo activity as a HostedActivity — the fallback seed for direct visits
 * to `/activity/host/1234`. Deliberately has NO teacher email, so direct
 * visits exercise the settings section's add-your-email nudge. Returns a
 * fresh object each call: the live page mutates its settings.
 */
export function demoHostedActivity(activity: Activity): HostedActivity {
  return {
    ...activity,
    characters: activity.characters.map((c) => ({ ...c })),
    settings: {
      ...DEFAULT_ACTIVITY_SETTINGS,
      // Deliberately NOT the form's default, which is "inOrder": the demo is
      // what a teacher judges the mode by, and in order on this roster would
      // put Caesar's ghost and Brutus in every single chat. Paired with the
      // eight-name roster in activityDemo.ts — the two together are what make
      // the chat cards carry different casts.
      characterMode: "shuffled",
    },
  };
}

/** One pre-scripted chat for the host page's seed round. */
export interface HostSeedChat {
  /** How many students it seats (2–4). */
  size: 2 | 3 | 4;
  status: ChatStatus;
  /** Why it ended, for ended seeds; null while active. */
  endReason: ChatEndReason | null;
  /** Lines in order; `seat` indexes into the chat's participants. */
  lines: { seat: number; text: string }[];
}

/** Everything the host demo's simulation needs that a locale decides. */
export interface HostDemoCast {
  /**
   * The demo class, in the order the simulation uses them: the first 5 seed
   * the two in-progress chats, the next 6 sit in the waiting queue (they're
   * the students of the two completed chats, so the rematch warning is
   * demoable right away), and the rest trickle in over time as new joiners.
   */
  studentNames: readonly string[];
  /**
   * Two in progress (a 1:1 and a group of 3, so the group paths are
   * exercised) and two completed (a 1:1 and a group of 4). Four seed chats
   * drawing from an eight-name roster is also how the shuffled mode shows
   * itself: the four cards seat different casts, which is the whole point of a
   * roster longer than a chat.
   */
  seedChats: readonly HostSeedChat[];
  /**
   * Ambient lines the simulation drips into live chats so the page keeps
   * moving. Any speaker can say any of these.
   */
  chatterLines: readonly string[];
}

const en: HostDemoCast = {
  studentNames: [
    "Daniel Katz",
    "Ella Peretz",
    "Maya Chen",
    "Leo Rivera",
    "Noa Shapiro",
    "Omar Haddad",
    "Grace Kim",
    "Liam O'Connor",
    "Tamar Golan",
    "Sofia Alvarez",
    "Emma Davis",
    "Yoni Adler",
    "Priya Patel",
    "Avi Rosen",
    "Mia Levi",
    "Noah Park",
    "Dana Klein",
    "Sam Barak",
  ],
  seedChats: [
    {
      size: 2,
      status: "active",
      endReason: null,
      lines: [
        { seat: 0, text: "ok be honest. was it you" },
        { seat: 1, text: "was WHAT me" },
        { seat: 0, text: "you know exactly what" },
        { seat: 1, text: "I was nowhere near it. ask literally anyone" },
        { seat: 0, text: "everyone says they saw you there 👀" },
        { seat: 1, text: "then everyone needs their eyes checked" },
      ],
    },
    {
      size: 3,
      status: "active",
      endReason: null,
      lines: [
        { seat: 0, text: "I call this meeting to order" },
        { seat: 1, text: "you can't just CALL meetings" },
        { seat: 2, text: "too late, we're all here" },
        { seat: 0, text: "first item: someone's been spreading rumors" },
        { seat: 1, text: "wasn't me" },
        {
          seat: 2,
          text: "wasn't me either. weird how fast you answered though",
        },
        { seat: 1, text: "WEIRD?? I'll remember this" },
      ],
    },
    {
      size: 2,
      status: "ended",
      endReason: "student",
      lines: [
        { seat: 0, text: "so are we allies or not" },
        { seat: 1, text: "depends what I get out of it" },
        { seat: 0, text: "half of everything and my eternal respect" },
        { seat: 1, text: "make it all of everything and we have a deal" },
        { seat: 0, text: "…fine. but I keep the title" },
        { seat: 1, text: "deal 🤝" },
        { seat: 0, text: "history will say this was my idea btw" },
      ],
    },
    {
      size: 4,
      status: "ended",
      endReason: "teacher",
      lines: [
        { seat: 0, text: "everyone remember the plan?" },
        { seat: 1, text: "there was a plan??" },
        { seat: 2, text: "I remember MY plan" },
        { seat: 3, text: "we agreed on nothing. that was the plan" },
        { seat: 0, text: "this is why nothing ever gets done around here" },
        { seat: 1, text: "ok new plan. we all act natural" },
        { seat: 2, text: "you've never acted natural in your life" },
        { seat: 3, text: "agreed. motion carried ✋" },
      ],
    },
  ],
  chatterLines: [
    "wait wait wait. say that again",
    "you can't PROVE anything",
    "ok that's actually genius",
    "I have a plan. it's only slightly terrible",
    "absolutely not. I'm listening though",
    "shhh someone's listening",
    "the history books will side with me",
    "that's your worst idea yet. I love it",
    "meet me at the usual spot after this",
    "I heard a rumor about you btw 👀",
    "source? I made it up",
    "we stick to the story, agreed?",
    "you've changed 😔",
    "plot twist: I knew the whole time",
    "let's vote on it. I vote me",
    "deal. but you owe me",
    "I want that in writing",
    "take that back RIGHT now 😤",
  ],
};

/**
 * Eighteen Israeli first names — Ashkenazi, Mizrahi, Russian-Israeli,
 * Arab-Israeli and Ethiopian-Israeli — sending the same inclusive signal the
 * English list does. First names only, not first-plus-surname: Hebrew
 * surnames would push the chat-card header past its width, and the short-name
 * rule is recorded (DECISIONS.md → "Demo students have short names…").
 * `נועה` is deliberately missing: it's the student demo's prefilled name, and
 * the demo must never show two of the same name side by side.
 */
const he: HostDemoCast = {
  studentNames: [
    "איתי",
    "שירה",
    "אמל",
    "יונתן",
    "אנה",
    "סמיר",
    "תמר",
    "אלכס",
    "אלמז",
    "עומר",
    "נור",
    "שלומי",
    "מיכל",
    "טדסה",
    "ליאור",
    "יסמין",
    "אבישי",
    "נטלי",
  ],
  seedChats: [
    {
      size: 2,
      status: "active",
      endReason: null,
      lines: [
        { seat: 0, text: "טוב, בכנות. זה קרה בגללך?" },
        { seat: 1, text: "בגלל מה בדיוק??" },
        { seat: 0, text: "יש רק דבר אחד שזה יכול להיות" },
        { seat: 1, text: "לא הייתי שם בכלל. אפשר לשאול את כולם" },
        { seat: 0, text: "כולם אומרים שראו אותך שם 👀" },
        { seat: 1, text: "אז כדאי שכולם יבדקו את העיניים" },
      ],
    },
    {
      size: 3,
      status: "active",
      endReason: null,
      lines: [
        { seat: 0, text: "פותחים את הישיבה" },
        { seat: 1, text: "אי אפשר סתם לפתוח ישיבות" },
        { seat: 2, text: "מאוחר מדי, כולנו כבר כאן" },
        { seat: 0, text: "סעיף ראשון: מישהו מפיץ שמועות" },
        { seat: 1, text: "לא אני" },
        { seat: 2, text: "גם לא אני. מעניין כמה מהר ענית" },
        { seat: 1, text: "מעניין?? לא אשכח לך את זה" },
      ],
    },
    {
      size: 2,
      status: "ended",
      endReason: "student",
      lines: [
        { seat: 0, text: "אז אנחנו ביחד או לא?" },
        { seat: 1, text: "תלוי מה יוצא לי מזה" },
        { seat: 0, text: "חצי מהכול, ועוד הערכה נצחית" },
        { seat: 1, text: "שיהיה הכול, ויש עסקה" },
        { seat: 0, text: "…בסדר. אבל התואר נשאר אצלי" },
        { seat: 1, text: "סגור 🤝" },
        { seat: 0, text: "דרך אגב, ההיסטוריה תגיד שזה היה הרעיון שלי" },
      ],
    },
    {
      size: 4,
      status: "ended",
      endReason: "teacher",
      lines: [
        { seat: 0, text: "כולם זוכרים את התוכנית?" },
        { seat: 1, text: "הייתה תוכנית??" },
        { seat: 2, text: "לי יש תוכנית משלי, תודה" },
        { seat: 3, text: "לא הסכמנו על כלום. זו הייתה התוכנית" },
        { seat: 0, text: "בגלל זה שום דבר לא מתקדם כאן" },
        { seat: 1, text: "אוקיי, תוכנית חדשה. כולם מתנהגים רגיל" },
        { seat: 2, text: "אף פעם לא התנהגת רגיל בחיים שלך" },
        { seat: 3, text: "ההצעה התקבלה פה אחד ✋" },
      ],
    },
  ],
  chatterLines: [
    "רגע רגע רגע. אפשר את זה שוב?",
    "אין שום הוכחה לזה",
    "אוקיי, זה בעצם גאוני",
    "יש לי תוכנית. היא רק קצת נוראית",
    "ממש לא. אבל זה מעניין",
    "ששש, מישהו מקשיב",
    "ספרי ההיסטוריה יהיו בצד שלי",
    "זה הרעיון הכי גרוע שלך עד עכשיו. מעולה",
    "ניפגש במקום הרגיל אחרי זה",
    "דרך אגב, שמעתי עליך שמועה 👀",
    "מקור? המצאתי",
    "נשארים עם אותו סיפור, סגור?",
    "השתנית 😔",
    "טוויסט: ידעתי כל הזמן",
    "בואו נצביע. אני בעד עצמי",
    "סגור. אבל אני גובה את זה בהמשך",
    "אני רוצה את זה בכתב",
    "לוקחים את זה בחזרה, עכשיו 😤",
  ],
};

export const hostDemoCasts: Record<Locale, HostDemoCast> = { en, he };
