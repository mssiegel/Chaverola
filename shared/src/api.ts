import type {
  Activity,
  ActivitySettings,
  HostedActivity,
  Locale,
} from "./types";

/*
  The REST wire contract (base URL: VITE_API_URL). All bodies JSON. Every 2xx
  body is a named-member envelope. Optional fields are omitted when absent —
  never null, never "". The server trims all strings.
*/

/** A character as the client submits it — the server mints character ids. */
export interface CharacterInput {
  name: string;
}

/** Body of `POST /activities`. */
export interface CreateActivityRequest {
  /** 1–30 chars after trim. */
  hostName: string;
  /** MIN_CHARACTERS–MAX_CHARACTERS (2–100); names unique (trimmed,
   *  case-insensitive). */
  characters: CharacterInput[];
  /** ≤ STUDENT_INSTRUCTIONS_MAX_CHARS; omit when blank. */
  studentInstructions?: string;
  /** EMAIL_PATTERN, ≤ EMAIL_MAX_CHARS; omit when blank. */
  teacherEmail?: string;
  /**
   * The language the teacher is setting up in. OPTIONAL on the wire and
   * defaulted to DEFAULT_LOCALE server-side, deliberately: `shared/` is in
   * both deploy triggers, so one push races two pipelines, and a required
   * field would 400 every create made by the still-old client for the length
   * of the Vercel deploy — on the one surface a teacher hits at class start.
   */
  locale?: Locale;
  /**
   * Whether joining students are held in `locale` or merely defaulted to it.
   * Optional on the wire for the same deploy-race reason, and defaulted
   * server-side to **false** rather than to the form's own default of true:
   * an old client during the deploy window has no such control, and a teacher
   * who never saw the switch shouldn't get a lock they can't undo. The
   * current client always sends the field.
   */
  lockLocale?: boolean;
  /** Required in full; out-of-bounds values are rejected, not clamped. */
  settings: ActivitySettings;
}

/** `201` from `POST /activities`. The hostKey is never stored client-side. */
export interface CreateActivityResponse {
  activity: HostedActivity;
  hostKey: string;
}

/** `200` from `GET /activities/:joinCode` — the student projection. */
export interface GetActivityResponse {
  activity: Activity;
}

/** `200` from `GET /activities/host/:hostKey` — no hostKey echo. */
export interface GetHostedActivityResponse {
  activity: HostedActivity;
}

export type ApiErrorCode =
  "invalid_json" | "invalid_request" | "not_found" | "capacity" | "internal";

/** One field-level validation problem, zod-style: "characters.1.name". */
export interface ApiFieldIssue {
  path: string;
  message: string;
}

/** The error envelope every non-2xx response uses. */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    issues?: ApiFieldIssue[];
  };
}
