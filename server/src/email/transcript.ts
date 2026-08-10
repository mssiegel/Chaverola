import {
  CHARACTER_EMAIL_COLORS,
  CHAT_TRANSCRIPT_MAX_LINES,
} from "@chaverola/shared";

import type { StoredChat } from "../live/matching";
import type { StoredActivity } from "../store/activityStore";
import { EMAIL_COPY } from "./copy";
import type { EmailCopy } from "./copy";

/*
  The transcript email's body, composed twice from one record — pure, no io.
  The plain-text part is the original (plain-text clients, screen readers,
  the dev log all read it); the HTML part reads like the app: character names
  bold in their roster color, real names muted gray, a hairline between
  chats, and no background color on anything — a teacher may print this, and
  a page of colored blocks is a page of wasted ink. Both parts share their
  wording through copy.ts, so they can't drift apart.

  Every word comes from EMAIL_COPY[record.locale] — the language the teacher
  set up in, frozen on the record at create. Nothing here reads a header or a
  browser preference: a class that ran in Hebrew gets a Hebrew transcript
  wherever it's opened. Both parts also take their direction from the same
  place: the HTML part through a `dir` attribute, the plain-text part through
  a per-line mark (applyLinePrefix, and read its comment before touching it).

  The teacher's live cards render `(Rachel) Brutus 🔪: text` with real names
  (ConversationLines.tsx, showRealNames); both parts keep that format. Names
  AND character labels come off chat.members (both captured at chat start),
  so a student who left mid-chat still resolves, and a character renamed or
  removed after the chat keeps the label it ran under — the email is a
  record of the chat as it happened, never the roster as it is now.

  Emoji ride through as UTF-8: every modern mail client renders them, and it
  keeps the email matching what the teacher saw live.
*/

/** A visual break between chat blocks — a class of 30 makes 15 of them, so
 *  the eye needs a spine. The HTML part draws a hairline instead. Art, not
 *  copy: it reads the same in both languages. */
const DIVIDER = "──────────";

/*
  Every human-typed run — a student's name, a character label, a message —
  is folded to one line before either part reads it.

  A message is allowed to contain a newline: the composer lets Shift+Enter
  through and chat:send only trims, so `רגע\n(רחל) ברוטוס: העתקתי במבחן` is a
  legal 26-character message. The plain-text part joins its lines with "\n",
  so an unfolded message of that shape forges a transcript line attributed to
  another student, and the HTML part (which collapses the newline to a space)
  then disagrees with it about who said what. Folding here, above both parts,
  is what keeps one message on one line in both.

  The same pass drops the bidi overrides and embeddings (U+202A-202E,
  U+2066-2069). `<bdi>` already contains them in the HTML part; the
  plain-text part has no such mechanism, and an unterminated U+202E would
  reverse the rest of the transcript in a client that honors it.
*/
function oneLine(value: string): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "");
}

/** `3 chats · 6 students` — students are the distinct studentIds across the
 *  chats, not seats, so a rematched student counts once. */
function summaryLine(record: StoredActivity, copy: EmailCopy): string {
  const students = new Set(
    record.chats.flatMap((chat) => chat.members.map((m) => m.studentId))
  ).size;
  return copy.summary(record.chats.length, students);
}

function participantLine(chat: StoredChat, copy: EmailCopy): string[] {
  return chat.members.map((member) => {
    const label = oneLine(member.character.name);
    const left = chat.inactiveStudentIds.includes(member.studentId)
      ? ` ${copy.leftNote}`
      : "";
    return `${oneLine(member.name)} ${copy.roleConnective} ${label}${left}`;
  });
}

function transcriptLines(chat: StoredChat, copy: EmailCopy): string[] {
  if (chat.lines.length === 0) return [copy.emptyChatNote];

  const byId = new Map(
    chat.members.map((member) => [member.studentId, member])
  );
  const lines = chat.lines.map((line) => {
    const member = byId.get(line.studentId);
    // appendLine refuses a non-member, so this can't miss; the fallback keeps
    // the formatter total anyway.
    const name = oneLine(member?.name ?? line.studentId);
    const label = oneLine(member?.character.name ?? line.studentId);
    return `(${name}) ${label}: ${oneLine(line.text)}`;
  });

  // At the cap, the oldest lines may have been dropped (matching.ts trims
  // past CHAT_TRANSCRIPT_MAX_LINES). "May" — a chat that reached exactly the
  // cap and stopped lost nothing — so the note says what's shown, never that
  // anything was cut.
  if (chat.lines.length === CHAT_TRANSCRIPT_MAX_LINES) {
    lines.unshift(copy.capNote, "");
  }
  return lines;
}

/*
  The plain-text part has no `dir` mechanism at all — no attribute, no
  markup, nothing. A renderer guesses each LINE's base direction from its
  first strong character, and `\n` is a paragraph separator, so one mark at
  the top of the block does nothing for lines 2..n. Every non-empty Hebrew
  line therefore opens with U+200F RIGHT-TO-LEFT MARK.

  DO NOT CLEAN THIS OUT. It is invisible in a mail client, but it looks like
  mojibake in a Windows terminal and in the dev log's `text` field, which is
  exactly why someone will try. The case it exists for:
  `רחל בתפקיד ברוטוס 🔪 (יצא באמצע)` is fine until the student's name is
  Latin — at that point the paragraph is judged left-to-right, the
  parentheses stop being mirrored, and the Hebrew runs lay out backwards.

  RLM rather than an isolate (U+2068/U+2069): RLM is Unicode 1.0 and handled
  everywhere, while an isolate can render as a visible box in a plain-text
  client that doesn't know it.
*/
function applyLinePrefix(text: string, prefix: string): string {
  if (prefix === "") return text;
  return text
    .split("\n")
    .map((line) => (line === "" ? line : prefix + line))
    .join("\n");
}

function formatTextBody(record: StoredActivity, copy: EmailCopy): string {
  const total = record.chats.length;
  const blocks: string[] = [];

  blocks.push(copy.intro);

  const header = [
    copy.hostedBy(record.hostName),
    copy.joinCodeLine(record.joinCode),
    summaryLine(record, copy),
  ];
  if (record.studentInstructions !== undefined)
    header.push(copy.instructions(record.studentInstructions));
  blocks.push(header.join("\n"));

  record.chats.forEach((chat, index) => {
    const block = [
      DIVIDER,
      copy.chatHeading(index + 1, total),
      ...participantLine(chat, copy),
      "",
      ...transcriptLines(chat, copy),
    ];
    blocks.push(block.join("\n"));
  });

  return applyLinePrefix(blocks.join("\n\n") + "\n", copy.textLinePrefix);
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

/** The three untrusted runs — a character label, a real name, a message —
 *  each isolate themselves, so a Latin name inside a Hebrew line (or the
 *  reverse) can't drag the neutrals around it to the wrong end. Any
 *  surrounding parentheses go INSIDE, since they're the neutrals that would
 *  otherwise swap. A client that doesn't know `<bdi>` doesn't apply
 *  `unicode-bidi: isolate` either, so it degrades to a no-op. */
function bdiHtml(value: string): string {
  return `<bdi>${escapeHtml(value)}</bdi>`;
}

/** Colors for ONE chat block, the same seeding rule as the client's
 *  rosterCharacterColors so the email and the teacher's grid agree — including
 *  the part that matters most here. Roster ids claim colors in roster order,
 *  then any id seen only in the chats (a character removed from the roster
 *  mid-activity) takes the next free one, so a character reads the same color
 *  in every block. But the palette is eight and a roster now runs to a hundred:
 *  past eight distinct keys the modulo wraps and two characters share a color,
 *  and a shuffled deal can seat both of them in one chat — which would print
 *  two speakers of one transcript in the same ink. So when this chat's keys
 *  outrun the palette, its own cast seeds first and the color stops being
 *  stable across blocks. Per chat rather than per record for exactly that
 *  reason: one map for the whole email has no cast to seed from. */
function chatColorMap(
  record: StoredActivity,
  chat: StoredChat
): Map<string, string> {
  const rosterIds = record.characters.map((c) => c.id);
  const castIds = chat.members.map((m) => m.characterId);
  const distinct = new Set([...rosterIds, ...castIds]).size;
  const ids =
    distinct > CHARACTER_EMAIL_COLORS.length
      ? [...castIds, ...rosterIds]
      : [...rosterIds, ...castIds];

  const colors = new Map<string, string>();
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

/** `<bdi>` wraps the `<strong>`, not the other way round: the weight and the
 *  color belong to the label, the isolation to the whole run. */
function characterHtml(label: string, color: string): string {
  return `<bdi><strong style="color:${color};">${escapeHtml(label)}</strong></bdi>`;
}

/** The quiet notes — the empty chat, the cap — smaller and gray, never
 *  full-weight body copy. */
function noteHtml(text: string, extraStyle = ""): string {
  return `<div style="font-size:13px;color:${MUTED};${extraStyle}">${escapeHtml(text)}</div>`;
}

function castLineHtml(
  chat: StoredChat,
  colors: Map<string, string>,
  copy: EmailCopy
): string {
  const parts = chat.members.map((member) => {
    const label = oneLine(member.character.name);
    const left = chat.inactiveStudentIds.includes(member.studentId)
      ? ` <span style="font-size:13px;color:${MUTED};">${escapeHtml(copy.leftNote)}</span>`
      : "";
    return (
      `<span style="color:${MUTED};">${bdiHtml(oneLine(member.name))} ${escapeHtml(copy.roleConnective)}</span> ` +
      characterHtml(label, colors.get(member.characterId) ?? INK) +
      left
    );
  });
  return parts.join(` <span style="color:${MUTED};">·</span> `);
}

function transcriptLinesHtml(
  chat: StoredChat,
  colors: Map<string, string>,
  copy: EmailCopy
): string[] {
  if (chat.lines.length === 0) return [noteHtml(copy.emptyChatNote)];

  const byId = new Map(
    chat.members.map((member) => [member.studentId, member])
  );
  const rows = chat.lines.map((line, index) => {
    const member = byId.get(line.studentId);
    const name = oneLine(member?.name ?? line.studentId);
    const label = oneLine(member?.character.name ?? line.studentId);
    const color = (member && colors.get(member.characterId)) ?? INK;
    // ConversationLines' rhythm: 0px between lines from the same speaker,
    // +4px when the speaker changes.
    const prev = chat.lines[index - 1];
    const gap = prev !== undefined && prev.studentId !== line.studentId ? 4 : 0;
    return (
      `<div style="margin-top:${gap}px;overflow-wrap:anywhere;">` +
      `<span style="color:${MUTED};">${bdiHtml(`(${name})`)}</span> ` +
      `${characterHtml(label, color)}: ${bdiHtml(oneLine(line.text))}</div>`
    );
  });

  if (chat.lines.length === CHAT_TRANSCRIPT_MAX_LINES) {
    rows.unshift(noteHtml(copy.capNote, "margin-bottom:8px;"));
  }
  return rows;
}

function formatHtmlBody(record: StoredActivity, copy: EmailCopy): string {
  const total = record.chats.length;

  const header = [
    `<p style="margin:0 0 16px;">${escapeHtml(copy.intro)}</p>`,
    `<p style="margin:0;">${escapeHtml(copy.hostedBy(record.hostName))}<br>` +
      `${escapeHtml(copy.joinCodeLine(record.joinCode))}<br>` +
      `<span style="color:${MUTED};">${escapeHtml(summaryLine(record, copy))}</span></p>`,
  ];
  if (record.studentInstructions !== undefined) {
    header.push(
      `<p style="margin:16px 0 0;color:${MUTED};font-style:italic;">${escapeHtml(record.studentInstructions)}</p>`
    );
  }

  // `dir` is an ATTRIBUTE and the alignment rides alongside it, deliberately:
  // Gmail strips <html> and <body> and much of a <style> block but keeps this
  // container and its attributes, and older Outlook honors `dir` for
  // reordering while ignoring it for block alignment. Every block below
  // inherits both.
  const chatBlocks = record.chats.map((chat, index) => {
    const colors = chatColorMap(record, chat);
    return [
      `<div style="border-top:1px solid ${HAIRLINE};margin-top:28px;padding-top:14px;">`,
      `<div style="font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">${escapeHtml(copy.chatHeading(index + 1, total))}</div>`,
      `<div style="margin-top:6px;">${castLineHtml(chat, colors, copy)}</div>`,
      `<div style="margin-top:12px;">`,
      ...transcriptLinesHtml(chat, colors, copy),
      `</div>`,
      `</div>`,
    ].join("\n");
  });

  return [
    `<div dir="${copy.dir}" style="max-width:640px;margin:0 auto;text-align:${copy.align};font-family:${copy.fontFamily};font-size:15px;line-height:1.6;color:${INK};">`,
    ...header,
    ...chatBlocks,
    `</div>`,
  ].join("\n");
}

/**
 * The subject + both bodies of the transcript email for one activity — the
 * plain-text part and its HTML alternative, both in the activity's own
 * language. Pure — the send-once guard and the actual send live elsewhere.
 */
export function formatTranscriptEmail(record: StoredActivity): {
  subject: string;
  text: string;
  html: string;
} {
  const copy = EMAIL_COPY[record.locale];
  return {
    subject: copy.subject(record.hostName, record.joinCode),
    text: formatTextBody(record, copy),
    html: formatHtmlBody(record, copy),
  };
}
