import { describe, expect, it } from "vitest";

import { MAX_CHAT_SEATS } from "@chaverola/shared";

import type { Participant } from "@/types/chat";

import {
  assignCharacterColors,
  rosterCharacterColors,
  selfFirstCharacterColors,
} from "./characterColor";

function participant(characterId: string): Participant {
  return {
    id: `student-${characterId}`,
    realName: characterId,
    character: { id: characterId, name: characterId },
  };
}

describe("assignCharacterColors", () => {
  it("assigns tokens by first appearance and keeps repeats stable", () => {
    const colors = assignCharacterColors(["hero", "rival", "hero", "friend"]);
    expect(colors.get("hero")).toBe("var(--char-1)");
    expect(colors.get("rival")).toBe("var(--char-2)");
    expect(colors.get("friend")).toBe("var(--char-3)");
  });

  it("wraps around after the eight tokens", () => {
    const keys = ["k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8", "k9"];
    const colors = assignCharacterColors(keys);
    expect(colors.get("k9")).toBe("var(--char-1)");
  });
});

describe("rosterCharacterColors", () => {
  it("gives a character the same color in chats with opposite cast order", () => {
    const roster = [
      { id: "hero", name: "hero" },
      { id: "rival", name: "rival" },
    ];
    const chatA = rosterCharacterColors(roster, [
      participant("hero"),
      participant("rival"),
    ]);
    const chatB = rosterCharacterColors(roster, [
      participant("rival"),
      participant("hero"),
    ]);
    // The rule the teacher's grid rests on: roster order wins, so `dealCast`
    // shuffling a chat's cast never flips a character's color between cards.
    expect(chatA.get("hero")).toBe("var(--char-1)");
    expect(chatA.get("rival")).toBe("var(--char-2)");
    expect(chatB.get("hero")).toBe("var(--char-1)");
    expect(chatB.get("rival")).toBe("var(--char-2)");
  });

  it("keeps a card's speakers distinct when the roster outruns the palette", () => {
    // Roster positions 0 and 8 wrap onto the same token, and a shuffled deal
    // can seat both in one chat. Past the palette the card seeds first, so the
    // card stays readable.
    const roster = Array.from({ length: 100 }, (_, i) => ({
      id: `c${i}`,
      name: `c${i}`,
    }));
    const colors = rosterCharacterColors(roster, [
      participant("c0"),
      participant("c8"),
    ]);
    expect(colors.get("c0")).not.toBe(colors.get("c8"));
  });

  it("counts a removed character against the palette, not just the roster", () => {
    // A roster of exactly eight fits, but the card also carries the character
    // a mid-activity removal left frozen on it — nine keys, so it wraps. The
    // test is distinct keys, not roster length.
    const roster = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i}`,
      name: `c${i}`,
    }));
    const colors = rosterCharacterColors(roster, [
      participant("c0"),
      participant("removed"),
    ]);
    expect(colors.get("c0")).not.toBe(colors.get("removed"));
  });

  it("gives every speaker on a full card its own color", () => {
    // What a full chat rests on: no two names on the card share a color, so a
    // teacher reading the busiest card can still tell who said what.
    const roster = Array.from({ length: MAX_CHAT_SEATS }, (_, i) => ({
      id: `c${i}`,
      name: `c${i}`,
    }));
    const participants = roster.map((c) => participant(c.id));
    const colors = rosterCharacterColors(roster, participants);
    const used = new Set(participants.map((p) => colors.get(p.character.id)));
    expect(used.size).toBe(participants.length);
  });

  it("gives a full card its own colors when the roster outruns the palette", () => {
    // The same full card in the wrapping branch, where the card seeds first.
    // It holds only because the cast fills tokens 1..MAX_CHAT_SEATS exactly and
    // the wrap lands on roster characters seated elsewhere — that boundary is
    // the whole reason a chat stops at MAX_CHAT_SEATS.
    const roster = Array.from({ length: MAX_CHAT_SEATS + 4 }, (_, i) => ({
      id: `c${i}`,
      name: `c${i}`,
    }));
    const participants = roster
      .slice(0, MAX_CHAT_SEATS)
      .map((c) => participant(c.id));
    const colors = rosterCharacterColors(roster, participants);
    const used = new Set(participants.map((p) => colors.get(p.character.id)));
    expect(used.size).toBe(participants.length);
  });
});

describe("selfFirstCharacterColors", () => {
  it("always seeds the viewer's own character green", () => {
    const self = participant("hero");
    const colors = selfFirstCharacterColors(self, [
      participant("rival"),
      self,
      participant("friend"),
    ]);
    // The recorded rule: "you" are always green (--char-1), peers follow in
    // participant order.
    expect(colors.get("hero")).toBe("var(--char-1)");
    expect(colors.get("rival")).toBe("var(--char-2)");
    expect(colors.get("friend")).toBe("var(--char-3)");
  });
});
