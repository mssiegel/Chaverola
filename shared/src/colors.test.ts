import { describe, expect, it } from "vitest";
import { CHARACTER_COLOR_VARS, CHARACTER_EMAIL_COLORS } from "./colors";

describe("character palette", () => {
  it("keeps the CSS-var and email arrays the same length", () => {
    expect(CHARACTER_EMAIL_COLORS.length).toBe(CHARACTER_COLOR_VARS.length);
  });
});
