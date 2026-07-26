import { describe, expect, it } from "vitest";

import { lookupRetryDelayMs } from "./lookupRetry";

describe("lookupRetryDelayMs", () => {
  it("climbs 2s → 5s → 10s over the first three failures", () => {
    expect(lookupRetryDelayMs(0)).toBe(2_000);
    expect(lookupRetryDelayMs(1)).toBe(5_000);
    expect(lookupRetryDelayMs(2)).toBe(10_000);
  });

  it("caps at 10s and keeps retrying forever after that", () => {
    expect(lookupRetryDelayMs(3)).toBe(10_000);
    expect(lookupRetryDelayMs(50)).toBe(10_000);
  });
});
