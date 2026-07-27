import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DEFAULT_ACTIVITY_SETTINGS } from "@chaverola/shared";
import type { Character, Locale } from "@chaverola/shared";

import { formatTranscriptEmail } from "../src/email/transcript";
import type { StoredChat, StoredChatLine } from "../src/live/matching";
import { createSeatState } from "../src/live/seats";
import type { StoredActivity } from "../src/store/activityStore";

/*
  `pnpm preview:email` — render the transcript email over a fixture class and
  write the HTML part to a file, so the design gets eyeballed without sending
  real mail. Each fixture walks the formatter's edges: a four-member chat (one
  message full of markup that must come out inert), a pair where one student
  left partway, and a silent room. Open the printed paths in a browser; a
  print preview from there is the ink check.

  BOTH locales are written every run, deliberately — no flag to pass and
  nothing to remember. Whoever changes the formatter has to look at the
  Hebrew one too, which is where a bidi mistake actually shows up. The Hebrew
  fixture keeps one Latin-named student so the `<bdi>` isolation has something
  to do: her name sits inside Hebrew lines in the cast line and in every line
  she speaks, which is the case that misrenders without it.

  What this script CAN'T show is the plain-text part's per-line RLM — it
  writes the HTML part only, and an RLM is invisible wherever a developer
  would open a .txt anyway (a browser serves text/plain left-to-right; an
  editor shows a box). That mechanism is guarded by the Hebrew test in
  transcript.test.ts instead, which is the right place for it.
*/

let lineId = 0;
function line(studentId: string, text: string): StoredChatLine {
  return { id: `line-${lineId++}`, studentId, text, sentAt: lineId };
}

function chat(over: Partial<StoredChat>): StoredChat {
  return {
    id: `chat-${lineId++}`,
    members: [],
    inactiveStudentIds: [],
    lines: [],
    startedAt: 0,
    status: "ended",
    endReason: "teacher",
    endedBy: null,
    ...over,
  };
}

function member(
  studentId: string,
  name: string,
  character: Character
): StoredChat["members"][number] {
  return { studentId, name, characterId: character.id, character };
}

function activity(over: Partial<StoredActivity>): StoredActivity {
  return {
    joinCode: "4321",
    hostKey: "PREVIEWPREVIEWPREVIEWPRE",
    hostName: "Ms. Rivkin",
    characters: [],
    teacherEmail: "preview@example.com",
    locale: "en",
    settings: { ...DEFAULT_ACTIVITY_SETTINGS },
    createdAt: 0,
    lastSeenAt: 0,
    seats: createSeatState(),
    chats: [],
    lastPartners: {},
    leftoverStudentId: null,
    railNotice: null,
    pausedAt: null,
    transcriptEmail: null,
    ...over,
  };
}

// --- English: Basel, 1897 ---------------------------------------------------

// The roster below AND the labels members captured at chat start —
// identical here, as they are until a mid-activity roster edit.
const EN_CAST = {
  herzl: { id: "herzl", name: "Herzl 🎩" },
  golda: { id: "golda", name: "Golda 🕊️" },
  rivka: { id: "rivka", name: "Rivka 📜" },
  david: { id: "david", name: "David" }, // no emoji on purpose
};

const english = activity({
  hostName: "Ms. Rivkin",
  characters: Object.values(EN_CAST),
  studentInstructions:
    "Basel, 1897. The First Zionist Congress is about to open, and everyone has an opinion.",
  chats: [
    chat({
      members: [
        member("s1", "Ana Fallback", EN_CAST.herzl),
        member("s2", "Ben", EN_CAST.golda),
        member("s3", "Carmel", EN_CAST.rivka),
        member("s4", "Dov", EN_CAST.david),
      ],
      lines: [
        line("s1", "If you will it, it is no dream."),
        line("s2", "Dreams are fine. Budgets are better."),
        line("s2", "Who is paying for this congress, exactly?"),
        line("s3", "I kept the minutes from last time — nobody paid."),
        line(
          "s4",
          "<script>alert('this must render as text')</script> & so on"
        ),
        line("s1", "That is not a real position, Dov."),
      ],
    }),
    chat({
      members: [
        member("s5", "Efrat", EN_CAST.golda),
        member("s6", "Gil", EN_CAST.herzl),
      ],
      inactiveStudentIds: ["s6"],
      lines: [
        line("s6", "I have to go — my delegation is calling."),
        line("s5", "You always say that when you're losing."),
      ],
    }),
    chat({
      members: [
        member("s7", "Hila", EN_CAST.rivka),
        member("s8", "Ido", EN_CAST.david),
      ],
      lines: [],
    }),
  ],
});

// --- Hebrew: תל אביב, ה׳ באייר תש״ח ----------------------------------------

const HE_CAST = {
  herzl: { id: "herzl", name: "הרצל 🎩" },
  golda: { id: "golda", name: "גולדה 🕊️" },
  sharef: { id: "sharef", name: "שרף 📜" },
  david: { id: "david", name: "בן־גוריון" }, // no emoji on purpose
};

const hebrew = activity({
  locale: "he",
  hostName: "רבקה לוי",
  characters: Object.values(HE_CAST),
  studentInstructions:
    "תל אביב, ה׳ באייר תש״ח. עוד כמה שעות מכריזים על המדינה, ואף אחד לא מסכים על הנוסח.",
  chats: [
    chat({
      members: [
        // Dana Fallback is the point of this fixture: a Latin name inside a
        // Hebrew line, in the participant line and in every line she speaks.
        member("s1", "Dana Fallback", HE_CAST.herzl),
        member("s2", "יונתן", HE_CAST.golda),
        member("s3", "כרמל", HE_CAST.sharef),
        member("s4", "דב", HE_CAST.david),
      ],
      lines: [
        line("s1", "אם תרצו, אין זו אגדה."),
        line("s2", "חלומות זה נחמד. תקציב זה יותר טוב."),
        line("s2", "מי בדיוק משלם על ההכרזה הזאת?"),
        line("s3", "שמרתי את הפרוטוקול מהפעם הקודמת — אף אחד לא שילם."),
        line(
          "s4",
          "<script>alert('this must render as text')</script> וכן הלאה"
        ),
        line("s1", "זאת לא עמדה, דב."),
      ],
    }),
    chat({
      members: [
        member("s5", "אפרת", HE_CAST.golda),
        member("s6", "גיל", HE_CAST.herzl),
      ],
      inactiveStudentIds: ["s6"],
      lines: [
        line("s6", "אני חייב לזוז, קוראים לי מהמשלחת."),
        line("s5", "אתה תמיד אומר את זה כשאתה מפסיד."),
      ],
    }),
    chat({
      members: [
        member("s7", "הילה", HE_CAST.sharef),
        member("s8", "עידו", HE_CAST.david),
      ],
      lines: [],
    }),
  ],
});

const FIXTURES: Record<Locale, StoredActivity> = { en: english, he: hebrew };

for (const [locale, fixture] of Object.entries(FIXTURES)) {
  const { subject, html } = formatTranscriptEmail(fixture);
  const out = join(tmpdir(), `chaverola-email-preview-${locale}.html`);
  writeFileSync(out, html, "utf8");
  console.log(`[${locale}] Subject: ${subject}`);
  console.log(`[${locale}] ${out}`);
}
