/*
  Tiny web-storage helpers behind the app's persistence. sessionStorage is the
  default and holds everything per-tab (student session, setup draft,
  hosted-activity hand-off) — one tab, one student, which matters on shared
  classroom computers. localStorage has exactly one tenant: the language the
  visitor picked, which has to outlive the tab.

  Storage can be blocked or hold corrupt JSON on classroom devices, so every
  call absorbs failures: reads fall back to null, writes become no-ops and the
  in-memory state keeps working.
*/

/*
  The store arrives as a thunk, not a value: Safari in private mode throws a
  SecurityError on merely *touching* `localStorage`, so the access itself has
  to happen inside the try.
*/
function readJsonFrom<T>(
  getStore: () => Storage,
  key: string,
  validate: (parsed: unknown) => T | null
): T | null {
  try {
    const raw = getStore().getItem(key);
    if (raw === null) return null;
    return validate(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeJsonTo(
  getStore: () => Storage,
  key: string,
  value: unknown
): void {
  try {
    getStore().setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — callers keep working from memory.
  }
}

/**
 * Read and validate a JSON value from sessionStorage. Returns null when the
 * key is missing, storage is inaccessible, the JSON is corrupt, or `validate`
 * rejects the parsed value.
 */
export function readSessionJson<T>(
  key: string,
  validate: (parsed: unknown) => T | null
): T | null {
  return readJsonFrom(() => sessionStorage, key, validate);
}

export function writeSessionJson(key: string, value: unknown): void {
  writeJsonTo(() => sessionStorage, key, value);
}

/**
 * The same absorb-everything read, over localStorage. A deliberately smaller
 * door than the session helpers: only the remembered language belongs here,
 * because it's the one preference that should survive closing the tab.
 */
export function readLocalJson<T>(
  key: string,
  validate: (parsed: unknown) => T | null
): T | null {
  return readJsonFrom(() => localStorage, key, validate);
}

export function writeLocalJson(key: string, value: unknown): void {
  writeJsonTo(() => localStorage, key, value);
}

export function removeSessionItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

// Tiny guards for the `validate` callbacks above, so each stored shape can
// duck-type itself in a line or two instead of a ladder of typeof checks.

/** True when `value` is an object we can safely index into. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** True when `record[key]` is a string. */
export function hasString(
  record: Record<string, unknown>,
  key: string
): boolean {
  return typeof record[key] === "string";
}

/** True when `record[key]` is a string or absent — for optional fields. */
export function hasOptionalString(
  record: Record<string, unknown>,
  key: string
): boolean {
  return record[key] === undefined || typeof record[key] === "string";
}
