import type { Locale } from "@/lib/locale";
import type { ChatScenario, Participant } from "@/types/chat";

/*
  The homepage hero's live sample chat. A visitor lands mid-argument with a
  partner who has feelings about being measured — short, funny,
  classroom-appropriate lines that show the roleplay format at a glance.
  Played by the same demo engine as the student chatbox demo (`useChatDemo`),
  so typing in the hero gets a reply.

  English casts the Moon against Neil Armstrong; Hebrew casts the Kinneret
  against the man who reports its level every winter. Same joke, same beat
  structure, no shared sentence — see DECISIONS.md → "The Hebrew demo is
  re-cast, never translated".

  Two deliberate limits, in both languages (see DECISIONS.md → "The hero demo
  goes quiet after two Armstrong lines"):
  - After the visitor's zinger, the partner sends exactly two one-sentence
    lines. The teacher preview mirrors this same feed and always shows its
    newest lines, so a longer script buries the zinger in both views.
  - `ambientLines` is empty on purpose — no idle chatter. Once the script
    ends, the room waits for the visitor to answer.

  Names: the demo's fiction is that the visitor is borrowing a student's seat.
  The teacher card names that student, never "You" — the teacher assigns
  chats and is not a player. Real names stay short to keep the card header
  tight. See DECISIONS.md → "Demo students have short names, and the teacher
  is never one of them".

  The homepage copy names these characters, and it reads them from
  `heroCopyNames` below rather than repeating them — so a recast can't leave
  the page describing a chat that isn't on it. Copy changes still go through
  the humanizer pass (see AGENTS.md).
*/

/**
 * The names the homepage prose interpolates. Emoji-free and short, because the
 * copy wants "Neil" and "the Moon" where the roster carries "Neil Armstrong 🚀"
 * and "the Moon 🌕" — hence a record of its own rather than reaching into the
 * participants below.
 */
export interface HeroCopyNames {
  /** The character the visitor plays. */
  self: string;
  /** The partner's full character name. */
  peer: string;
  /** The partner, as prose refers to them in passing. */
  peerShort: string;
  /** The demo student whose seat the visitor is borrowing. */
  seat: string;
}

export const heroCopyNames: Record<Locale, HeroCopyNames> = {
  en: {
    self: "the Moon",
    peer: "Neil Armstrong",
    peerShort: "Neil",
    seat: "Dana K",
  },
  he: {
    self: "הכנרת",
    peer: "מד המים",
    // No shorter form in Hebrew: "המד" reads like a typo, so prose uses the
    // whole name in both slots.
    peerShort: "מד המים",
    // Female on purpose — `home:teacherView.note` says "עם השם שלה".
    seat: "דנה",
  },
};

const moon: Participant = {
  id: "self-moon",
  character: { id: "moon", name: "the Moon 🌕" },
  realName: "Dana K",
};

const armstrong: Participant = {
  id: "peer-armstrong",
  character: { id: "armstrong", name: "Neil Armstrong 🚀" },
  realName: "Sam A",
};

const kinneret: Participant = {
  id: "self-kinneret",
  character: { id: "kinneret", name: "הכנרת 🌊" },
  realName: "דנה",
};

// No emoji, unlike the English pair: the hero is the first roster a visitor
// ever sees, and one plain name in it says a teacher doesn't have to add one.
const waterGauge: Participant = {
  id: "peer-water-gauge",
  character: { id: "water-gauge", name: "מד המים" },
  realName: "יובל",
};

export const heroChatScenarios: Record<Locale, ChatScenario> = {
  en: {
    id: "hero",
    self: moon,
    peers: [armstrong],
    seedMessages: [
      { senderId: armstrong.id, text: "that's one small step for man…" },
      { senderId: moon.id, text: "HEY. watch where you're stepping" },
      {
        senderId: armstrong.id,
        text: "oh. sorry. kind of a big moment for me",
      },
      { senderId: moon.id, text: "you could've knocked first 😤" },
    ],
    script: [
      {
        senderId: armstrong.id,
        // No flag emoji here: Windows renders 🇺🇸 as the letters "US".
        text: "i brought you a very nice flag tho",
        delayMs: 4200,
      },
      {
        senderId: armstrong.id,
        text: "also like 600 million people are watching us rn, so maybe act natural 📺",
        delayMs: 4200,
      },
    ],
    ambientLines: [],
    replyLines: [
      "haha ok fair",
      "that's exactly what a moon would say",
      "wait till mission control hears this 😂",
      "noted. adding it to the mission report 📋",
      "you're pretty chatty for a rock",
      "10/10 would land here again",
    ],
  },
  he: {
    id: "hero",
    self: kinneret,
    peers: [waterGauge],
    // The gauge addresses the Kinneret in the feminine throughout, because
    // the lake is feminine. That is character dialogue, not app copy, so it
    // sits outside the masculine-second-person house style.
    seedMessages: [
      {
        senderId: waterGauge.id,
        text: "מפלס הכנרת עלה היום בשני סנטימטרים.",
      },
      { senderId: kinneret.id, text: "רגע. מדדת אותי בלי לשאול?" },
      { senderId: waterGauge.id, text: "סליחה. זה רגע גדול בשבילי." },
      { senderId: kinneret.id, text: "לפחות תגיד שלום קודם 😤" },
    ],
    script: [
      {
        senderId: waterGauge.id,
        text: "הבאתי לך גשם, אם זה עוזר",
        delayMs: 4200,
      },
      {
        senderId: waterGauge.id,
        text: "וגם, כל מהדורת החדשות מחכה למספר הזה, אז תיראי טוב 📺",
        delayMs: 4200,
      },
    ],
    ambientLines: [],
    replyLines: [
      "חחח טוב, מקובל",
      "בדיוק מה שאגם היה אומר",
      "חכי שרשות המים תשמע על זה 😂",
      "רשמתי. נכנס לדוח החורף 📋",
      "את די פטפטנית בשביל גוף מים",
      "עשר מתוך עשר, אחזור למדוד 💧",
    ],
  },
};
