import { describe, expect, it } from "vitest";

import {
  CHARACTER_EMAIL_COLORS,
  CHAT_TRANSCRIPT_MAX_LINES,
  DEFAULT_ACTIVITY_SETTINGS,
} from "@chaverola/shared";

import type { StoredChat, StoredChatLine } from "../live/matching";
import { createSeatState } from "../live/seats";
import type { StoredActivity } from "../store/activityStore";
import { formatTranscriptEmail } from "./transcript";

// Just the composition rules a bug would make silent — the participant line
// (including a departed member and an emoji-less character), the established
// `(name) label: text` line format, the empty-chat line, the cap note, the
// numbered heading, and the subject. On the html part, only the two rules
// the preview can't prove by looking: student text comes out escaped, and a
// character keeps one roster-keyed color across chats. The send-once guard
// is sendTranscript.test.ts; nothing here touches io.

function line(studentId: string, text: string): StoredChatLine {
  return { id: `${studentId}-${text}`, studentId, text, sentAt: 0 };
}

// The roster the record carries AND the labels members captured at chat
// start — identical here, as they are until a mid-activity roster edit.
const CHARACTERS = {
  brutus: { id: "brutus", name: "Brutus 🔪" },
  caesar: { id: "caesar", name: "Caesar 👑" },
  cicero: { id: "cicero", name: "Cicero" }, // no emoji on purpose
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
    id: "chat",
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

function record(chats: StoredChat[]): StoredActivity {
  return {
    joinCode: "5678",
    hostKey: "AAAAAAAAAAAAAAAAAAAAAAAA",
    hostName: "Ms. Cohen",
    characters: Object.values(CHARACTERS),
    studentInstructions: "Rome, 44 BC, the night before the Ides of March.",
    teacherEmail: "cohen@example.com",
    locale: "en",
    lockLocale: false,
    settings: { ...DEFAULT_ACTIVITY_SETTINGS },
    createdAt: 0,
    lastSeenAt: 0,
    seats: createSeatState(),
    chats,
    lastPartners: {},
    leftoverStudentId: null,
    railNotice: null,
    pausedAt: null,
    transcriptEmail: null,
  };
}

describe("formatTranscriptEmail", () => {
  it("names the activity in the subject — host name and join code, no date", () => {
    const { subject } = formatTranscriptEmail(record([]));
    expect(subject).toBe("Ms. Cohen's Chaverola activity (code 5678)");
  });

  it("heads the body with who hosted, the code, and the instructions", () => {
    const { text } = formatTranscriptEmail(record([]));
    expect(text).toContain("Hosted by Ms. Cohen");
    expect(text).toContain("Join code: 5678");
    expect(text).toContain(
      "Instructions: Rome, 44 BC, the night before the Ides of March."
    );
  });

  it("omits the instructions line when none were set", () => {
    const base = record([]);
    delete base.studentInstructions;
    expect(formatTranscriptEmail(base).text).not.toContain("Instructions:");
  });

  it("renders participants and lines in the established teacher format", () => {
    const { text } = formatTranscriptEmail(
      record([
        chat({
          members: [
            member("s1", "Rachel", "brutus"),
            member("s2", "Noa", "caesar"),
          ],
          lines: [line("s1", "Et tu?"), line("s2", "rude")],
        }),
      ])
    );
    // Numbered heading + participants line (realName as label).
    expect(text).toContain("Chat 1 of 1");
    expect(text).toContain("Rachel as Brutus 🔪");
    expect(text).toContain("Noa as Caesar 👑");
    // The line format: (realName) label: text — emoji rides through.
    expect(text).toContain("(Rachel) Brutus 🔪: Et tu?");
    expect(text).toContain("(Noa) Caesar 👑: rude");
  });

  it("marks a member who left mid-chat, and departed members still resolve", () => {
    const { text } = formatTranscriptEmail(
      record([
        chat({
          members: [
            member("s1", "Rachel", "brutus"),
            member("s3", "Dana", "cicero"),
          ],
          inactiveStudentIds: ["s3"],
          // Dana spoke before leaving — the line survives, in place.
          lines: [line("s3", "I'm out"), line("s1", "wait")],
        }),
      ])
    );
    // Cicero has no emoji: bare name, no trailing space before the marker.
    expect(text).toContain("Dana as Cicero (left partway)");
    expect(text).toContain("Rachel as Brutus 🔪");
    expect(text).toContain("(Dana) Cicero: I'm out");
  });

  it("says so for a chat where nobody spoke", () => {
    const { text } = formatTranscriptEmail(
      record([
        chat({
          members: [
            member("s1", "Rachel", "brutus"),
            member("s2", "Noa", "caesar"),
          ],
          lines: [],
        }),
      ])
    );
    expect(text).toContain("(No messages in this chat.)");
  });

  it("notes the cap on a chat sitting at the transcript limit", () => {
    const lines = Array.from({ length: CHAT_TRANSCRIPT_MAX_LINES }, (_, i) =>
      line("s1", `msg ${i}`)
    );
    const { text } = formatTranscriptEmail(
      record([
        chat({
          members: [member("s1", "Rachel", "brutus")],
          lines,
        }),
      ])
    );
    expect(text).toContain(
      `(Showing the most recent ${CHAT_TRANSCRIPT_MAX_LINES} messages.)`
    );
  });

  it("escapes student text in the html — markup comes out visible and inert", () => {
    const { html } = formatTranscriptEmail(
      record([
        chat({
          members: [member("s1", "Rachel <QA>", "brutus")],
          lines: [line("s1", `<script>alert("x")</script> & 1 < 2`)],
        }),
      ])
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; 1 &lt; 2"
    );
    // Names get the same treatment as message text.
    expect(html).toContain("(Rachel &lt;QA&gt;)");
  });

  it("keeps one color per character across chats with opposite cast order", () => {
    const { html } = formatTranscriptEmail(
      record([
        chat({
          members: [
            member("s1", "Rachel", "brutus"),
            member("s2", "Noa", "caesar"),
          ],
          lines: [line("s1", "first")],
        }),
        chat({
          members: [
            member("s2", "Noa", "caesar"),
            member("s1", "Rachel", "brutus"),
          ],
          lines: [line("s2", "second")],
        }),
      ])
    );
    // Collect every colored name in the html: one color per character, and
    // the roster picks it — Brutus is roster #1 even where Caesar spoke first.
    const seen = new Map<string, Set<string>>();
    for (const match of html.matchAll(
      /<strong style="color:(#[0-9a-f]{6});">([^<]+)<\/strong>/g
    )) {
      // `!` — the regex has both groups, so a match always carries them.
      const [, color, name] = match;
      if (!seen.has(name!)) seen.set(name!, new Set());
      seen.get(name!)!.add(color!);
    }
    expect(seen.get("Brutus 🔪")).toEqual(new Set([CHARACTER_EMAIL_COLORS[0]]));
    expect(seen.get("Caesar 👑")).toEqual(new Set([CHARACTER_EMAIL_COLORS[1]]));
  });

  it("writes a Hebrew activity's transcript right to left", () => {
    // One test for the whole Hebrew side, covering only what reading the
    // catalog can't tell you. The catalog itself is compiler-checked, so
    // running the ten assertions above a second time in Hebrew would be
    // testing data rather than code.
    const hebrew: StoredActivity = {
      ...record([
        chat({
          members: [
            member("s1", "רחל", "brutus"),
            // A Latin name in a Hebrew line is the whole reason the RLM and
            // the <bdi>s exist.
            member("s2", "Dana", "caesar"),
          ],
          lines: [line("s2", "et tu")],
        }),
      ]),
      locale: "he",
      hostName: "Ms. Cohen", // Latin host name, Hebrew subject
    };
    const { subject, text, html } = formatTranscriptEmail(hebrew);

    // The brand leads, so a client with no `dir` to read still lays the
    // subject out right-to-left despite the Latin name inside it.
    expect(subject.startsWith("חברולה")).toBe(true);
    expect(subject).toContain("Ms. Cohen");
    expect(subject).toContain("(קוד 5678)");

    expect(html).toContain('dir="rtl"');
    expect(html).toContain("<bdi>(Dana)</bdi>");

    // Every non-empty plain-text line opens with U+200F — a renderer judges
    // each line separately, so one mark at the top would not reach line 2.
    const unmarked = text
      .split("\n")
      .filter((l) => l !== "" && !l.startsWith("\u200F"));
    expect(unmarked).toEqual([]);
    expect(text).toContain("רחל בתפקיד Brutus 🔪");
  });

  it("numbers each chat against the total", () => {
    const twoMembers = {
      members: [
        member("s1", "Rachel", "brutus"),
        member("s2", "Noa", "caesar"),
      ],
      lines: [line("s1", "hi")],
    };
    const { text } = formatTranscriptEmail(
      record([chat(twoMembers), chat(twoMembers), chat(twoMembers)])
    );
    expect(text).toContain("Chat 1 of 3");
    expect(text).toContain("Chat 2 of 3");
    expect(text).toContain("Chat 3 of 3");
  });
});
