import {
  CHARACTER_EMAIL_COLORS,
  CHAT_TRANSCRIPT_MAX_LINES,
} from "@chaverola/shared";

import type { StoredChat } from "../live/matching";
import type { StoredActivity } from "../store/activityStore";
import { resolveCharacter } from "../store/projections";

/*
  The transcript email's body, composed twice from one record — pure, no io.
  The plain-text part is the original (plain-text clients, screen readers,
  the dev log all read it); the HTML part reads like the app: character names
  bold in their roster color, real names muted gray, a hairline between
  chats, and no background color on anything — a teacher may print this, and
  a page of colored blocks is a page of wasted ink. Both parts share their
  wording through the constants below, so they can't drift apart.

  The teacher's live cards render `(Rachel) Brutus 🔪: text` with real names
  (ConversationLines.tsx, showRealNames); both parts keep that format. Names
  come off chat.members (captured at chat start), so a student who left
  mid-chat still resolves — their card label survives them, and their lines
  stay in place.

  Emoji ride through as UTF-8: every modern mail client renders them, and it
  keeps the email matching what the teacher saw live.
*/

/** A visual break between chat blocks — a class of 30 makes 15 of them, so
 *  the eye needs a spine. The HTML part draws a hairline instead. */
const DIVIDER = "──────────";

const INTRO =
  "Here's every chat from your Chaverola activity. Each block below is one pairing, in the order they happened.";
const EMPTY_CHAT_NOTE = "(No messages in this chat.)";
const CAP_NOTE = `(Showing the most recent ${CHAT_TRANSCRIPT_MAX_LINES} messages.)`;
const LEFT_NOTE = "(left partway)";

/** `3 chats · 6 students` — students are the distinct studentIds across the
 *  chats, not seats, so a rematched student counts once. */
function summaryLine(record: StoredActivity): string {
  const students = new Set(
    record.chats.flatMap((chat) => chat.members.map((m) => m.studentId))
  ).size;
  const count = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`;
  return `${count(record.chats.length, "chat")} · ${count(students, "student")}`;
}

function participantLine(chat: StoredChat, activity: StoredActivity): string[] {
  return chat.members.map((member) => {
    const label = resolveCharacter(activity, member.characterId).name;
    const left = chat.inactiveStudentIds.includes(member.studentId)
      ? ` ${LEFT_NOTE}`
      : "";
    return `${member.name} as ${label}${left}`;
  });
}

function transcriptLines(chat: StoredChat, activity: StoredActivity): string[] {
  if (chat.lines.length === 0) return [EMPTY_CHAT_NOTE];

  const byId = new Map(
    chat.members.map((member) => [member.studentId, member])
  );
  const lines = chat.lines.map((line) => {
    const member = byId.get(line.studentId);
    // appendLine refuses a non-member, so this can't miss; the fallback keeps
    // the formatter total anyway.
    const name = member?.name ?? line.studentId;
    const label = member
      ? resolveCharacter(activity, member.characterId).name
      : line.studentId;
    return `(${name}) ${label}: ${line.text}`;
  });

  // At the cap, the oldest lines may have been dropped (matching.ts trims
  // past CHAT_TRANSCRIPT_MAX_LINES). "May" — a chat that reached exactly the
  // cap and stopped lost nothing — so the note says what's shown, never that
  // anything was cut.
  if (chat.lines.length === CHAT_TRANSCRIPT_MAX_LINES) {
    lines.unshift(CAP_NOTE, "");
  }
  return lines;
}

function formatTextBody(record: StoredActivity): string {
  const total = record.chats.length;
  const blocks: string[] = [];

  blocks.push(INTRO);

  const header = [
    `Hosted by ${record.hostName}`,
    `Join code: ${record.joinCode}`,
    summaryLine(record),
  ];
  if (record.scenario !== undefined)
    header.push(`Scenario: ${record.scenario}`);
  blocks.push(header.join("\n"));

  record.chats.forEach((chat, index) => {
    const block = [
      DIVIDER,
      `Chat ${index + 1} of ${total}`,
      ...participantLine(chat, record),
      "",
      ...transcriptLines(chat, record),
    ];
    blocks.push(block.join("\n"));
  });

  return blocks.join("\n\n") + "\n";
}

// --- The HTML part ---------------------------------------------------------

const INK = "#111827"; // near-black body text
const MUTED = "#6b7280"; // real names, labels, the quiet notes
const HAIRLINE = "#e5e7eb";

/** Every interpolated value passes through here — student message text above
 *  all, untrusted input that has never been rendered as markup before. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** One color per character id for the whole email: roster ids claim colors
 *  in roster order, then any id seen only in the chats (a character removed
 *  from the roster mid-activity) takes the next free one. The same seeding
 *  rule as the client's rosterCharacterColors, so the email and the
 *  teacher's grid agree. */
function emailColorMap(record: StoredActivity): Map<string, string> {
  const colors = new Map<string, string>();
  const ids = [
    ...record.characters.map((c) => c.id),
    ...record.chats.flatMap((chat) => chat.members.map((m) => m.characterId)),
  ];
  for (const id of ids) {
    if (!colors.has(id)) {
      // The modulo keeps the index in range, so the lookup can't miss.
      colors.set(
        id,
        CHARACTER_EMAIL_COLORS[colors.size % CHARACTER_EMAIL_COLORS.length]!
      );
    }
  }
  return colors;
}

function characterHtml(label: string, color: string): string {
  return `<strong style="color:${color};">${escapeHtml(label)}</strong>`;
}

/** The quiet notes — the empty chat, the cap — smaller and gray, never
 *  full-weight body copy. */
function noteHtml(text: string, extraStyle = ""): string {
  return `<div style="font-size:13px;color:${MUTED};${extraStyle}">${escapeHtml(text)}</div>`;
}

function castLineHtml(
  chat: StoredChat,
  activity: StoredActivity,
  colors: Map<string, string>
): string {
  const parts = chat.members.map((member) => {
    const label = resolveCharacter(activity, member.characterId).name;
    const left = chat.inactiveStudentIds.includes(member.studentId)
      ? ` <span style="font-size:13px;color:${MUTED};">${escapeHtml(LEFT_NOTE)}</span>`
      : "";
    return (
      `<span style="color:${MUTED};">${escapeHtml(member.name)} as</span> ` +
      characterHtml(label, colors.get(member.characterId) ?? INK) +
      left
    );
  });
  return parts.join(` <span style="color:${MUTED};">·</span> `);
}

function transcriptLinesHtml(
  chat: StoredChat,
  activity: StoredActivity,
  colors: Map<string, string>
): string[] {
  if (chat.lines.length === 0) return [noteHtml(EMPTY_CHAT_NOTE)];

  const byId = new Map(
    chat.members.map((member) => [member.studentId, member])
  );
  const rows = chat.lines.map((line, index) => {
    const member = byId.get(line.studentId);
    const name = member?.name ?? line.studentId;
    const label = member
      ? resolveCharacter(activity, member.characterId).name
      : line.studentId;
    const color = (member && colors.get(member.characterId)) ?? INK;
    // ConversationLines' rhythm: 0px between lines from the same speaker,
    // +4px when the speaker changes.
    const prev = chat.lines[index - 1];
    const gap = prev !== undefined && prev.studentId !== line.studentId ? 4 : 0;
    return (
      `<div style="margin-top:${gap}px;overflow-wrap:anywhere;">` +
      `<span style="color:${MUTED};">(${escapeHtml(name)})</span> ` +
      `${characterHtml(label, color)}: ${escapeHtml(line.text)}</div>`
    );
  });

  if (chat.lines.length === CHAT_TRANSCRIPT_MAX_LINES) {
    rows.unshift(noteHtml(CAP_NOTE, "margin-bottom:8px;"));
  }
  return rows;
}

function formatHtmlBody(record: StoredActivity): string {
  const colors = emailColorMap(record);
  const total = record.chats.length;

  const header = [
    `<p style="margin:0 0 16px;">${escapeHtml(INTRO)}</p>`,
    `<p style="margin:0;">${escapeHtml(`Hosted by ${record.hostName}`)}<br>` +
      `${escapeHtml(`Join code: ${record.joinCode}`)}<br>` +
      `<span style="color:${MUTED};">${escapeHtml(summaryLine(record))}</span></p>`,
  ];
  if (record.scenario !== undefined) {
    header.push(
      `<p style="margin:16px 0 0;color:${MUTED};font-style:italic;">${escapeHtml(record.scenario)}</p>`
    );
  }

  const chatBlocks = record.chats.map((chat, index) =>
    [
      `<div style="border-top:1px solid ${HAIRLINE};margin-top:28px;padding-top:14px;">`,
      `<div style="font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">Chat ${index + 1} of ${total}</div>`,
      `<div style="margin-top:6px;">${castLineHtml(chat, record, colors)}</div>`,
      `<div style="margin-top:12px;">`,
      ...transcriptLinesHtml(chat, record, colors),
      `</div>`,
      `</div>`,
    ].join("\n")
  );

  return [
    `<div style="max-width:640px;margin:0 auto;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${INK};">`,
    ...header,
    ...chatBlocks,
    `</div>`,
  ].join("\n");
}

/**
 * The subject + both bodies of the transcript email for one activity — the
 * plain-text part and its HTML alternative. Pure — the send-once guard and
 * the actual send live elsewhere.
 */
export function formatTranscriptEmail(record: StoredActivity): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `${record.hostName}'s Chaverola activity (code ${record.joinCode})`;
  return {
    subject,
    text: formatTextBody(record),
    html: formatHtmlBody(record),
  };
}
