import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DEFAULT_ACTIVITY_SETTINGS } from "@chaverola/shared";

import { formatTranscriptEmail } from "../src/email/transcript";
import type { StoredChat, StoredChatLine } from "../src/live/matching";
import { createSeatState } from "../src/live/seats";
import type { StoredActivity } from "../src/store/activityStore";

/*
  `pnpm preview:email` — render the transcript email over a fixture class and
  write the HTML part to a file, so the design gets eyeballed without sending
  real mail. The fixture walks the formatter's edges: a four-member chat (one
  message full of markup that must come out inert), a pair where one student
  left partway, and a silent room. Open the printed path in a browser; a
  print preview from there is the ink check.
*/

let lineId = 0;
function line(studentId: string, text: string): StoredChatLine {
  return { id: `line-${lineId++}`, studentId, text, sentAt: lineId };
}

// The roster below AND the labels members captured at chat start —
// identical here, as they are until a mid-activity roster edit.
const CHARACTERS = {
  herzl: { id: "herzl", name: "Herzl 🎩" },
  golda: { id: "golda", name: "Golda 🕊️" },
  rivka: { id: "rivka", name: "Rivka 📜" },
  david: { id: "david", name: "David" }, // no emoji on purpose
};

function member(
  studentId: string,
  name: string,
  characterId: keyof typeof CHARACTERS
): StoredChat["members"][number] {
  return { studentId, name, characterId, character: CHARACTERS[characterId] };
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

const fixture: StoredActivity = {
  joinCode: "4321",
  hostKey: "PREVIEWPREVIEWPREVIEWPRE",
  hostName: "Ms. Rivkin",
  characters: Object.values(CHARACTERS),
  studentInstructions:
    "Basel, 1897. The First Zionist Congress is about to open, and everyone has an opinion.",
  teacherEmail: "preview@example.com",
  locale: "en",
  settings: { ...DEFAULT_ACTIVITY_SETTINGS },
  createdAt: 0,
  lastSeenAt: 0,
  seats: createSeatState(),
  chats: [
    chat({
      members: [
        member("s1", "Ana Fallback", "herzl"),
        member("s2", "Ben", "golda"),
        member("s3", "Carmel", "rivka"),
        member("s4", "Dov", "david"),
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
      members: [member("s5", "Efrat", "golda"), member("s6", "Gil", "herzl")],
      inactiveStudentIds: ["s6"],
      lines: [
        line("s6", "I have to go — my delegation is calling."),
        line("s5", "You always say that when you're losing."),
      ],
    }),
    chat({
      members: [member("s7", "Hila", "rivka"), member("s8", "Ido", "david")],
      lines: [],
    }),
  ],
  lastPartners: {},
  leftoverStudentId: null,
  railNotice: null,
  pausedAt: null,
  transcriptEmail: null,
};

const { subject, html } = formatTranscriptEmail(fixture);
const out = join(tmpdir(), "chaverola-email-preview.html");
writeFileSync(out, html, "utf8");
console.log(`Subject: ${subject}`);
console.log(out);
