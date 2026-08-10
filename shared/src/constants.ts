import type { ActivitySettings } from "./types";

/*
  Limits and defaults shared by the client's setup form and the server's
  validation — one source of truth so the form can't accept what the server
  rejects. UI-only knobs (when counters appear, etc.) stay in the client.
*/

export const MIN_CHARACTERS = 2;
/**
 * A safety valve, not a rule about the lesson: a shuffled roster is meant to
 * be long (a class of forty in pairs fills forty parts), and nothing about a
 * chat's size is derived from this. Four seats is still the hard chat size.
 */
export const MAX_CHARACTERS = 100;

/** Character names and the hosted-by name — both render in tight chrome. */
export const NAME_MAX_CHARS = 30;

/** A student's own name at the join gate — the form and the socket layer's
 *  fresh-join validation read the same cap. */
export const STUDENT_NAME_MAX_CHARS = 40;

/** Student instructions (a scene, a debate topic, task steps) — counted in
 *  code points like every other char cap. */
export const STUDENT_INSTRUCTIONS_MAX_CHARS = 250;

/** One chat message, counted in code points (a multi-unit emoji is one) —
 *  the composer and the server's `chat:send` guard read the same cap, so
 *  the composer can't accept what the server rejects. */
export const CHAT_MESSAGE_MAX_CHARS = 75;

/** Per-chat transcript cap: oldest lines drop past this. A class period is
 *  ~10 minutes of chat — nobody is building a message archive here. */
export const CHAT_TRANSCRIPT_MAX_LINES = 200;

/**
 * chat:send's sliding window: 10 messages per 10 seconds per socket — loose
 * enough that chained one-word messages never trip it, tight enough that a
 * script gets nowhere. Shared because both sides enforce it: the server
 * drops what exceeds it (silently, the belt against a hostile client), and
 * the composer holds a send that would exceed it and lets it go when the
 * window opens, so an excited kid gets a wait instead of a vanished message.
 * One source, or the client's idea of the limit drifts from the one that
 * actually drops messages.
 */
export const CHAT_SEND_WINDOW_MS = 10_000;
export const CHAT_SEND_WINDOW_LIMIT = 10;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** RFC 5321's practical ceiling for a whole address. */
export const EMAIL_MAX_CHARS = 254;

export interface StepperBounds {
  min: number;
  max: number;
  step: number;
  default: number;
}

export const AUTO_MATCH_SECONDS: StepperBounds = {
  min: 5,
  max: 120,
  step: 5,
  default: 20,
};

export const DEFAULT_ACTIVITY_SETTINGS: ActivitySettings = {
  revealNames: true,
  rematchWarning: true,
  autoMatch: true,
  autoMatchSeconds: AUTO_MATCH_SECONDS.default,
  // A fresh form recommends shuffled: a teacher who names two characters gets
  // the same activity either way, and one who names more almost certainly
  // wants them used. Not the same as the server's wire fallback, which is
  // "inOrder" — see activitySettingsSchema.
  characterMode: "shuffled",
};

/**
 * The demo activity's join code — always works, fully client-simulated, and
 * the server never issues it (nor answers for it: `GET /activities/1234` is
 * a 404 by design).
 */
export const DEMO_JOIN_CODE = "1234";

/** Shape of a student join code. Anything else 404s without a lookup. */
export const JOIN_CODE_PATTERN = /^\d{4}$/;
/**
 * Shape of a host key (base64url; real keys are 24 chars — the range leaves
 * room to lengthen them without touching the client). A 4-digit join code
 * structurally can't match, so it can never unlock the host route.
 */
export const HOST_KEY_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;
