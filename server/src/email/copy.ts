import { CHAT_TRANSCRIPT_MAX_LINES } from "@chaverola/shared";
import type { Locale } from "@chaverola/shared";

/*
  Every word the server writes, once per language. Hand-rolled on purpose:
  this is the only prose the server ships, so a typed record buys what
  matters (a missing string is a compile error) without an i18n dependency
  that would make it a silent runtime fallback. See
  docs/decisions/backend-api.md → "react-i18next is the client's i18n layer;
  the server takes no i18n dependency".

  Teacher-typed content — the host's name, the instructions, character names,
  student names, every message — is never translated and never passes through
  here. Only the frame around it does.

  The record is keyed by the activity's own `locale`, frozen at create, so a
  Hebrew class gets a Hebrew transcript however the teacher's mail client is
  set up.
*/

export interface EmailCopy {
  /** The HTML container's `dir` — an attribute, never CSS: Gmail strips
   *  `<html>`, `<body>`, and much of a `<style>` block, but keeps `dir` on
   *  the block elements it does keep. */
  dir: "ltr" | "rtl";
  /** Set alongside `dir`, because older Outlook honors `dir` for character
   *  reordering but not for block alignment. */
  align: "left" | "right";
  /** Mail clients don't load webfonts, so Hebrew gets system faces rather
   *  than the app's Rubik. */
  fontFamily: string;
  /** Prefixed to every non-empty line of the PLAIN-TEXT part. For Hebrew
   *  this is U+200F RIGHT-TO-LEFT MARK, and it is load-bearing — see the
   *  comment on `applyLinePrefix` in transcript.ts before deleting what
   *  looks like an invisible stray character. */
  textLinePrefix: string;

  subject(hostName: string, joinCode: string): string;
  intro: string;
  hostedBy(name: string): string;
  joinCodeLine(code: string): string;
  instructions(text: string): string;
  /** `3 chats · 6 students` — one line, both bodies. */
  summary(chats: number, students: number): string;
  chatHeading(index: number, total: number): string;
  /** The playbill connective in `Rachel as Brutus 🔪`. Both bodies build the
   *  participant line from it, and the HTML part needs the name and the
   *  connective separable so the character can be bold in its own color. */
  roleConnective: string;
  leftNote: string;
  emptyChatNote: string;
  capNote: string;
}

const SYSTEM_STACK =
  "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
/** No Rubik: the app's Hebrew face is a webfont, and mail clients don't load
 *  those reliably. These are faces a reader already has. */
const HEBREW_STACK =
  "'Segoe UI','Arial Hebrew','Noto Sans Hebrew','Helvetica Neue',Arial,sans-serif";

const en: EmailCopy = {
  dir: "ltr",
  align: "left",
  fontFamily: SYSTEM_STACK,
  textLinePrefix: "",

  subject: (hostName, joinCode) =>
    `${hostName}'s Chaverola activity (code ${joinCode})`,
  intro:
    "Here's every chat from your Chaverola activity. Each block below is one pairing, in the order they happened.",
  hostedBy: (name) => `Hosted by ${name}`,
  joinCodeLine: (code) => `Join code: ${code}`,
  instructions: (text) => `Instructions: ${text}`,
  summary: (chats, students) => {
    const count = (n: number, word: string) =>
      `${n} ${word}${n === 1 ? "" : "s"}`;
    return `${count(chats, "chat")} · ${count(students, "student")}`;
  },
  chatHeading: (index, total) => `Chat ${index} of ${total}`,
  roleConnective: "as",
  leftNote: "(left partway)",
  emptyChatNote: "(No messages in this chat.)",
  capNote: `(Showing the most recent ${CHAT_TRANSCRIPT_MAX_LINES} messages.)`,
};

/** שיחה is feminine, תלמיד masculine, and Hebrew spells small numbers as
 *  words — so the counts are written per noun rather than run through a
 *  shared helper. */
const chatCount = (n: number) =>
  n === 1 ? "שיחה אחת" : n === 2 ? "שתי שיחות" : `${n} שיחות`;
const studentCount = (n: number) =>
  n === 1 ? "תלמיד אחד" : n === 2 ? "שני תלמידים" : `${n} תלמידים`;

const he: EmailCopy = {
  dir: "rtl",
  align: "right",
  fontFamily: HEBREW_STACK,
  // Written as an escape, never as a literal: the character is invisible in
  // an editor, so a literal here is one stray paste away from being
  // undiagnosable. What it's for is on `applyLinePrefix` in transcript.ts.
  textLinePrefix: "\u200F",

  // The brand goes first and stays first. A subject line carries no `dir`,
  // so the mail client guesses the direction from the first strong
  // character: opening with חברולה makes the line right-to-left even when
  // the teacher's name is Latin, and the trailing (קוד 5678) then comes out
  // with mirrored parentheses and in-order digits without a single control
  // character. An RLM at position 0 was rejected — it confuses the
  // column-alignment heuristics some clients use in the message list.
  subject: (hostName, joinCode) =>
    `חברולה · הפעילות של ${hostName} (קוד ${joinCode})`,
  // Shorter than the English on purpose: "each block below is one pairing"
  // explains a layout the reader can see, and שיבוץ is the pairing rail's word
  // for the ACT of assigning students — the same collision that ruled out
  // בתור below. The chat headings already say שיחה. התקיימו rather than רצו:
  // this product's רץ is always a chat that is live right now.
  intro: "הנה כל השיחות מהפעילות שלך בחברולה, לפי הסדר שבו הן התקיימו.",
  // A label, not a verb — so the sentence agrees with nothing, whatever the
  // teacher's name turns out to be.
  hostedBy: (name) => `מנחה: ${name}`,
  // קוד הצטרפות, never קוד כניסה: the client says הצטרפות everywhere (the gate,
  // the setup meta, the homepage), and כניסה is what an Israeli reads on a
  // building keypad. The bare "(קוד 5678)" in the subject matches host.pin.
  joinCodeLine: (code) => `קוד הצטרפות: ${code}`,
  // הוראות, matching the box the teacher typed them into and the label the
  // lobby reads them back under.
  instructions: (text) => `הוראות: ${text}`,
  summary: (chats, students) =>
    `${chatCount(chats)} · ${studentCount(students)}`,
  chatHeading: (index, total) => `שיחה ${index} מתוך ${total}`,
  // The playbill connective, matching the client's card.as (he/common.ts).
  // "בתור" was rejected: תור also means queue, and the pairing rail already
  // owns that word. The student composer deliberately says "לדבר בתור" anyway
  // — he/chat.ts says why at the call site, and that split stays.
  roleConnective: "בתפקיד",
  // יצא, matching the client's "{{name}} יצא מהצ׳אט" — masculine, like the
  // rest of the Hebrew (founder call, 2026-07-27).
  leftNote: "(יצא באמצע)",
  emptyChatNote: "(אין הודעות בשיחה הזאת.)",
  capNote: `(אלה ${CHAT_TRANSCRIPT_MAX_LINES} ההודעות האחרונות.)`,
};

export const EMAIL_COPY: Record<Locale, EmailCopy> = { en, he };
