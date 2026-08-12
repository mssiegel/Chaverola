import { afterEach, describe, expect, it, vi } from "vitest";

import {
  defaultActivityDraft,
  DEFAULT_ACTIVITY_SETTINGS,
  MAX_CHARACTERS,
  readActivityDraft,
  toCreateActivityRequest,
  validateActivityDraft,
  type ActivityDraft,
} from "./activitySetup";

function draftWith(overrides: Partial<ActivityDraft>): ActivityDraft {
  return {
    ...defaultActivityDraft(),
    characters: [{ name: "Caesar's ghost" }, { name: "Brutus" }],
    hostName: "Ms. Cohen",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validateActivityDraft", () => {
  it("passes a complete draft", () => {
    expect(validateActivityDraft(draftWith({}))).toEqual([]);
  });

  it("requires two filled characters, pointing at the first empty row", () => {
    const problems = validateActivityDraft(
      draftWith({ characters: [{ name: "Brutus" }, { name: "   " }] })
    );
    expect(problems.map((p) => p.field)).toContain("character-1");
  });

  it("flags a duplicate name (trimmed, case-insensitive) on the later row", () => {
    const problems = validateActivityDraft(
      draftWith({ characters: [{ name: "Brutus" }, { name: " BRUTUS " }] })
    );
    expect(problems.map((p) => p.field)).toEqual(["character-1"]);
  });

  it("requires the hosted-by name", () => {
    const problems = validateActivityDraft(draftWith({ hostName: "  " }));
    expect(problems.map((p) => p.field)).toEqual(["hostName"]);
  });

  it("accepts an empty email but rejects a malformed one", () => {
    expect(validateActivityDraft(draftWith({ teacherEmail: "" }))).toEqual([]);
    const problems = validateActivityDraft(
      draftWith({ teacherEmail: "not.an.email" })
    );
    expect(problems.map((p) => p.field)).toEqual(["teacherEmail"]);
  });
});

describe("readActivityDraft (sessionStorage sanitizing)", () => {
  it("falls back to a fresh draft on corrupt JSON", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => "not json at all {{",
    });
    expect(readActivityDraft()).toEqual(defaultActivityDraft());
  });

  it("clamps and snaps out-of-range stored values", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () =>
        JSON.stringify({
          characters: [
            { name: "x".repeat(99) },
            // Overflowing the roster takes a hundred names now, not five.
            ...Array.from({ length: MAX_CHARACTERS + 3 }, (_, i) => ({
              name: `Extra ${i}`,
            })),
          ],
          // Off, against a default of on: the whole point is that
          // sanitizeDraft READS this rather than rebuilding it. A key it
          // forgets to copy resets on the next refresh, and a language lock
          // that quietly flips back between typing and hosting is a failure
          // nobody would see.
          lockLocale: false,
          settings: { autoMatchSeconds: 7, characterMode: "sideways" },
        }),
    });
    const draft = readActivityDraft();
    expect(draft.lockLocale).toBe(false);
    expect(draft.characters).toHaveLength(MAX_CHARACTERS);
    expect(draft.characters[0]!.name).toHaveLength(30);
    // 7 snaps onto the 5-step grid that counts from 5.
    expect(draft.settings.autoMatchSeconds).toBe(5);
    // A mode that isn't one heals rather than reaching a deal.
    expect(draft.settings.characterMode).toBe(
      DEFAULT_ACTIVITY_SETTINGS.characterMode
    );
  });
});

describe("toCreateActivityRequest", () => {
  it("trims names, keeps any emoji inside them, and sends no ids", () => {
    const request = toCreateActivityRequest(
      draftWith({
        characters: [{ name: " Caesar's Ghost 👻 " }, { name: "Brutus!" }],
      }),
      "en"
    );
    // Exact object equality doubles as the no-ids check: the server mints
    // character ids, so the wire carries nothing but the name.
    expect(request.characters).toEqual([
      { name: "Caesar's Ghost 👻" },
      { name: "Brutus!" },
    ]);
  });

  it("drops abandoned rows and omits blank optional fields", () => {
    const request = toCreateActivityRequest(
      draftWith({
        characters: [{ name: "Ada" }, { name: "  " }, { name: "Ben" }],
        studentInstructions: "   ",
        teacherEmail: "",
      }),
      "en"
    );
    expect(request.characters.map((c) => c.name)).toEqual(["Ada", "Ben"]);
    // Omitted, not "" — the wire contract never sends blank optionals.
    expect("studentInstructions" in request).toBe(false);
    expect("teacherEmail" in request).toBe(false);
  });

  it("sends the student instructions trimmed", () => {
    const request = toCreateActivityRequest(
      draftWith({
        studentInstructions: "  Rome, 44 BC.  ",
        teacherEmail: "a@b.co",
      }),
      "en"
    );
    expect(request.studentInstructions).toBe("Rome, 44 BC.");
    expect(request.teacherEmail).toBe("a@b.co");
  });
});
