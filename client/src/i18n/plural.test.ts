import { describe, expect, it } from "vitest";

/*
  The one assumption the whole Hebrew catalog shape rests on, and the only part
  of it that isn't already a compile error.

  `HebrewOf<T>` demands a `_two` for every English `_other` key, and i18next
  picks a plural suffix by asking `Intl.PluralRules`. If this runtime ever
  disagreed about Hebrew's categories, every `_two` string would silently stop
  rendering and the catalogs would still typecheck.
*/
describe("Hebrew plural categories", () => {
  it("are one / two / other — never `many`", () => {
    const rules = new Intl.PluralRules("he");
    expect(rules.resolvedOptions().pluralCategories.sort()).toEqual([
      "one",
      "other",
      "two",
    ]);
  });

  it("select `two` at exactly 2 — the most common count on a teacher's dashboard", () => {
    const rules = new Intl.PluralRules("he");
    expect([1, 2, 3, 10].map((n) => rules.select(n))).toEqual([
      "one",
      "two",
      "other",
      "other",
    ]);
  });
});
