import { describe, expect, it } from "vitest";

import { redactAnalyticsUrl } from "./analytics";

const at = (path: string) => `https://chaverola.com${path}`;
// Shaped like the real thing: 24 chars of base64url from the server's minter.
const HOST_KEY = "bD6Q5Rqe8OuVnSn9ItNyLT3S";

describe("redactAnalyticsUrl", () => {
  it("never reports a hostKey", () => {
    const out = redactAnalyticsUrl(at(`/activity/host/${HOST_KEY}`));
    expect(out).not.toContain(HOST_KEY);
    expect(out).toBe(at("/activity/host/:hostKey"));
  });

  it("redacts the hostKey under a locale prefix too", () => {
    const out = redactAnalyticsUrl(at(`/he/activity/host/${HOST_KEY}`));
    expect(out).not.toContain(HOST_KEY);
    expect(out).toBe(at("/he/activity/host/:hostKey"));
  });

  it("redacts a live join code", () => {
    expect(redactAnalyticsUrl(at("/activity/join/8317"))).toBe(
      at("/activity/join/:joinCode")
    );
  });

  it("keeps the demo's public 1234 so pitch traffic stays countable", () => {
    expect(redactAnalyticsUrl(at("/activity/host/1234"))).toBe(
      at("/activity/host/1234")
    );
    expect(redactAnalyticsUrl(at("/he/activity/join/1234"))).toBe(
      at("/he/activity/join/1234")
    );
  });

  it("leaves plain routes alone and keeps the locale split", () => {
    expect(redactAnalyticsUrl(at("/"))).toBe(at("/"));
    expect(redactAnalyticsUrl(at("/he"))).toBe(at("/he"));
    // A trailing slash is the same page, and must not become "/he/".
    expect(redactAnalyticsUrl(at("/he/"))).toBe(at("/he"));
    expect(redactAnalyticsUrl(at("/activity/create"))).toBe(
      at("/activity/create")
    );
    expect(redactAnalyticsUrl(at("/he/activity/join"))).toBe(
      at("/he/activity/join")
    );
  });

  it("drops the query and hash, whatever arrived in them", () => {
    expect(redactAnalyticsUrl(at("/?utm_source=x&token=secret#frag"))).toBe(
      at("/")
    );
    expect(redactAnalyticsUrl(at(`/activity/host/${HOST_KEY}?fast`))).toBe(
      at("/activity/host/:hostKey")
    );
  });
});
