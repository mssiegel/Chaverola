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
  characters: [
    { id: "herzl", name: "Herzl 🎩" },
    { id: "golda", name: "Golda 🕊️" },
    { id: "rivka", name: "Rivka 📜" },
    { id: "david", name: "David" }, // no emoji on purpose
  ],
  scenario:
    "Basel, 1897. The First Zionist Congress is about to open, and everyone has an opinion.",
  teacherEmail: "preview@example.com",
  settings: { ...DEFAULT_ACTIVITY_SETTINGS },
  createdAt: 0,
  lastSeenAt: 0,
  seats: createSeatState(),
  chats: [
    chat({
      members: [
        { studentId: "s1", name: "Ana Fallback", characterId: "herzl" },
        { studentId: "s2", name: "Ben", characterId: "golda" },
        { studentId: "s3", name: "Carmel", characterId: "rivka" },
        { studentId: "s4", name: "Dov", characterId: "david" },
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
        { studentId: "s5", name: "Efrat", characterId: "golda" },
        { studentId: "s6", name: "Gil", characterId: "herzl" },
      ],
      inactiveStudentIds: ["s6"],
      lines: [
        line("s6", "I have to go — my delegation is calling."),
        line("s5", "You always say that when you're losing."),
      ],
    }),
    chat({
      members: [
        { studentId: "s7", name: "Hila", characterId: "rivka" },
        { studentId: "s8", name: "Ido", characterId: "david" },
      ],
      lines: [],
    }),
  ],
  lastPartners: {},
  leftoverStudentId: null,
  rematchNotice: null,
  pausedAt: null,
  transcriptEmail: null,
};

const { subject, html } = formatTranscriptEmail(fixture);
const out = join(tmpdir(), "chaverola-email-preview.html");
writeFileSync(out, html, "utf8");
console.log(`Subject: ${subject}`);
console.log(out);
