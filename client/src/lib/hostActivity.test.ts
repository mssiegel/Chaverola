import { describe, expect, it } from "vitest";

import type { HostedActivity } from "@/types/activity";

import { DEFAULT_ACTIVITY_SETTINGS } from "./activitySetup";
import {
  activityFromLiveDraft,
  mergeExternalSettings,
  validateLiveDraft,
  type LiveActivityDraft,
} from "./hostActivity";

const baseActivity: HostedActivity = {
  joinCode: "4321",
  locale: "en",
  hostName: "Ms. Cohen",
  characters: [
    { id: "caesar", name: "Caesar's ghost 👻" },
    { id: "brutus", name: "Brutus" },
  ],
  settings: { ...DEFAULT_ACTIVITY_SETTINGS },
};

function liveDraft(overrides: Partial<LiveActivityDraft>): LiveActivityDraft {
  return {
    characters: [
      { id: "caesar", name: "Caesar's ghost 👻" },
      { id: "brutus", name: "Brutus" },
    ],
    hostName: "Ms. Cohen",
    teacherEmail: "",
    studentInstructions: "",
    settings: { ...DEFAULT_ACTIVITY_SETTINGS },
    ...overrides,
  };
}

describe("validateLiveDraft", () => {
  it("keeps a committed character from being renamed to nothing", () => {
    const draft = liveDraft({
      characters: [
        { id: "caesar", name: "  " },
        { id: "brutus", name: "Brutus" },
        { id: "cleo", name: "Cleopatra" },
      ],
    });
    const problems = validateLiveDraft(draft, new Set(["caesar", "brutus"]));
    expect(problems.map((p) => p.field)).toEqual(["character-0"]);
  });

  it("lets a never-committed added row sit empty", () => {
    const draft = liveDraft({
      characters: [
        { id: "caesar", name: "Caesar's ghost" },
        { id: "brutus", name: "Brutus" },
        { id: "live-character-9", name: "" },
      ],
    });
    expect(validateLiveDraft(draft, new Set(["caesar", "brutus"]))).toEqual([]);
  });
});

describe("activityFromLiveDraft", () => {
  it("keeps every drafted id, trims names, and drops empty added rows", () => {
    const draft = liveDraft({
      characters: [
        { id: "caesar", name: "  Julius  " },
        { id: "live-character-9", name: "" },
      ],
      studentInstructions: "  Rome, 44 BC  ",
    });
    const activity = activityFromLiveDraft(draft, baseActivity);
    expect(activity.characters).toEqual([{ id: "caesar", name: "Julius" }]);
    expect(activity.studentInstructions).toBe("Rome, 44 BC");
    expect(activity.joinCode).toBe("4321");
  });
});

describe("mergeExternalSettings", () => {
  const settings = () => ({ ...DEFAULT_ACTIVITY_SETTINGS });

  it("merges a key that changed outside the panel", () => {
    const prev = settings();
    const next = { ...settings(), autoMatch: true };
    const draft = settings();
    expect(mergeExternalSettings(prev, next, draft)).toEqual({
      ...settings(),
      autoMatch: true,
    });
  });

  it("returns null for the panel's own commit echoing back", () => {
    // The panel committed autoMatch: true itself — the draft already agrees.
    const prev = settings();
    const next = { ...settings(), autoMatch: true };
    const draft = { ...settings(), autoMatch: true };
    expect(mergeExternalSettings(prev, next, draft)).toBeNull();
  });

  it("returns null when nothing changed at all", () => {
    expect(
      mergeExternalSettings(settings(), settings(), settings())
    ).toBeNull();
  });

  it("keeps a pending draft edit on a different key", () => {
    const prev = settings();
    const next = { ...settings(), autoMatch: true };
    const draft = { ...settings(), rematchWarning: false };
    expect(mergeExternalSettings(prev, next, draft)).toEqual({
      ...settings(),
      autoMatch: true,
      rematchWarning: false,
    });
  });

  it("merges every externally changed key at once", () => {
    const prev = settings();
    const next = { ...settings(), autoMatch: true, revealNames: false };
    const draft = settings();
    expect(mergeExternalSettings(prev, next, draft)).toEqual({
      ...settings(),
      autoMatch: true,
      revealNames: false,
    });
  });
});
