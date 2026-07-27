import type { Locale } from "@/lib/locale";
import type { ChatScenario, Participant } from "@/types/chat";

/*
  The chats a student gets matched into on the join flow (`/activity/join`).
  They play inside the demo activity's setting — Rome the night before the
  Ides of March in English, Tel Aviv in the hours before the Declaration in
  Hebrew — using characters from that activity's roster, so the lobby's
  "Characters in this activity" chips and the chat agree with each other.
  Unlike the standalone demo scenarios, these start with NO seed messages: a
  fresh match begins as an empty room where the peer starts typing within a
  couple of seconds.

  These two scenarios ARE character-specific, so the Hebrew pair is written
  against the 1948 cast rather than translated off the Roman one. (The host
  page's transcripts in `hostActivityDemo.ts` are the opposite — deliberately
  character-agnostic. Don't mix the two rules up.)
*/

// ---- English: Rome, 44 BC ---------------------------------------------------

const cleopatra: Participant = {
  id: "self-cleopatra",
  character: { id: "cleopatra", name: "Cleopatra 👑" },
  // Placeholder — the join flow swaps in the signed-in student's real name.
  realName: "You",
};

const brutus: Participant = {
  id: "peer-brutus",
  character: { id: "brutus", name: "Brutus 🔪" },
  realName: "Daniel Katz",
};

const caesarsGhost: Participant = {
  id: "peer-caesars-ghost",
  character: { id: "caesars-ghost", name: "Caesar's ghost 👻" },
  realName: "Ella Peretz",
};

const enDuoScenario: ChatScenario = {
  id: "activity-duo",
  self: cleopatra,
  peers: [brutus],
  seedMessages: [],
  script: [
    {
      senderId: brutus.id,
      text: "psst… Cleopatra. you made it 👀",
      delayMs: 1800,
    },
    {
      senderId: brutus.id,
      text: "The whole forum is whispering about tomorrow.",
      delayMs: 3600,
    },
    {
      senderId: brutus.id,
      text: "Whatever you've heard, I had nothing to do with it 😅",
      delayMs: 4400,
    },
  ],
  ambientLines: [
    "The senate is acting SO weird today.",
    "Trust no one. Seriously.",
    "Did Caesar seem… off to you at dinner?",
    "I keep hearing my name in the crowd 😬",
    "Tomorrow is a totally normal day. Right?",
  ],
  replyLines: [
    "Interesting… go on 👀",
    "Shh, not so loud!",
    "That's what everyone in the forum keeps saying.",
    "Bold of you to say that out loud 🗡️",
    "Caesar must never hear of this.",
    "Ha! You sound just like Marc Antony.",
  ],
};

const enGroupScenario: ChatScenario = {
  id: "activity-group",
  self: cleopatra,
  peers: [brutus, caesarsGhost],
  seedMessages: [],
  script: [
    {
      senderId: caesarsGhost.id,
      text: "BOO 👻 …sorry. Force of habit.",
      delayMs: 1800,
    },
    {
      senderId: brutus.id,
      text: "How are you ALREADY a ghost?? It's still the 14th!",
      delayMs: 3800,
    },
    {
      senderId: caesarsGhost.id,
      text: "Spoilers, Brutus. Spoilers. 🔮",
      delayMs: 4200,
    },
  ],
  ambientLines: [
    "The forum is packed tonight.",
    "beware the Ides of March… just saying 👻",
    "Why is everyone bringing knives to a senate meeting??",
    "I miss being alive. The snacks were better.",
    "Antony's speech tomorrow is going to be SO dramatic.",
  ],
  replyLines: [
    "Cleopatra has a point.",
    "The rumors say the same thing 👀",
    "ok THAT was suspicious.",
    "Say it louder for the senators in the back!",
    "History will remember this chat.",
    "👻 agreed.",
  ],
};

// ---- Hebrew: Tel Aviv, ה׳ באייר תש״ח ----------------------------------------

const golda: Participant = {
  id: "self-golda",
  character: { id: "golda", name: "גולדה 🕊️" },
  // Placeholder — the join flow swaps in the signed-in student's real name.
  realName: "You",
};

const benGurion: Participant = {
  id: "peer-ben-gurion",
  character: { id: "ben-gurion", name: "בן־גוריון 📜" },
  realName: "איתי",
};

const herzlsGhost: Participant = {
  id: "peer-herzls-ghost",
  character: { id: "herzls-ghost", name: "הרוח של הרצל 👻" },
  realName: "שירה",
};

const heDuoScenario: ChatScenario = {
  id: "activity-duo",
  self: golda,
  peers: [benGurion],
  seedMessages: [],
  // Ben-Gurion addresses Golda in the feminine: the peer knows exactly who is
  // in the room with them, and the self seat is the same character every time.
  script: [
    {
      senderId: benGurion.id,
      text: "פסססט… גולדה. הגעת 👀",
      delayMs: 1800,
    },
    {
      senderId: benGurion.id,
      text: "כל תל אביב מתלחשת על מחר.",
      delayMs: 3600,
    },
    {
      senderId: benGurion.id,
      text: "מה שלא שמעת, אני לא קשור לזה 😅",
      delayMs: 4400,
    },
  ],
  ambientLines: [
    "הוועד מתנהג ממש מוזר היום.",
    "אל תבטחי באף אחד. ברצינות.",
    "שמת לב שמשהו היה מוזר בהצבעה אתמול?",
    "אני שומע את השם שלי בכל פינה 😬",
    "מחר יום רגיל לגמרי. נכון?",
  ],
  replyLines: [
    "מעניין… תמשיכי 👀",
    "ששש, לא כל כך חזק!",
    "זה בדיוק מה שכולם אומרים ברחוב.",
    "אמיץ מצידך להגיד את זה בקול רם 😳",
    "שהרוח של הרצל לא תשמע על זה.",
    "חחח, את נשמעת בדיוק כמו זאב שרף.",
  ],
};

const heGroupScenario: ChatScenario = {
  id: "activity-group",
  self: golda,
  peers: [benGurion, herzlsGhost],
  seedMessages: [],
  script: [
    {
      senderId: herzlsGhost.id,
      text: "בוווו 👻 …סליחה. הרגל ישן.",
      delayMs: 1800,
    },
    {
      // Basel 1897 promised a state within fifty years. It is 1948.
      senderId: benGurion.id,
      text: "אמרת חמישים שנה. אנחנו בחמישים ואחת 👀",
      delayMs: 3800,
    },
    {
      senderId: herzlsGhost.id,
      text: "עיגלתי, בן־גוריון. עיגלתי 🔮",
      delayMs: 4200,
    },
  ],
  // Nobody is addressed by name or gender here: any of the two peers can send
  // any of these, exactly like the English group's pool.
  ambientLines: [
    "הרחוב מלא אנשים הערב.",
    "אם תרצו, אין זו אגדה… רק אומר 👻",
    "למה כולם מדברים בלחש בבניין הזה??",
    "התגעגעתי להיות בחיים. הקפה היה טוב יותר.",
    "הנאום מחר הולך להיות דרמטי בטירוף.",
  ],
  replyLines: [
    "לגולדה יש נקודה.",
    "השמועות אומרות בדיוק אותו דבר 👀",
    "אוקיי, זה כבר נשמע חשוד.",
    "תגידו את זה חזק יותר, בשביל אלה שמאחור!",
    "ההיסטוריה תזכור את הצ׳אט הזה.",
    "👻 מסכים.",
  ],
};

export const activityChatScenarios: Record<
  Locale,
  { duo: ChatScenario; group: ChatScenario }
> = {
  en: { duo: enDuoScenario, group: enGroupScenario },
  he: { duo: heDuoScenario, group: heGroupScenario },
};

export type ActivityChatScenarioKey =
  keyof (typeof activityChatScenarios)["en"];
