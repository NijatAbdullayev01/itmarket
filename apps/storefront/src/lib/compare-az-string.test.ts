import { describe, expect, it } from "vitest";
import { compareAzStrings, compareByAzName } from "@itmarket/ui";

describe("compareAzStrings", () => {
  it("puts Q before L, matching the Azerbaijani alphabet (not Latin)", () => {
    expect(compareAzStrings("QNAP", "Lenovo")).toBeLessThan(0);
    expect(
      ["Lenovo", "QNAP", "Kingston"].sort(compareAzStrings),
    ).toEqual(["Kingston", "QNAP", "Lenovo"]);
  });

  it("follows the official Latin Azerbaijani letter order", () => {
    const alphabet = [
      "A",
      "B",
      "C",
      "Ç",
      "D",
      "E",
      "Ə",
      "F",
      "G",
      "Ğ",
      "H",
      "X",
      "I",
      "İ",
      "J",
      "K",
      "Q",
      "L",
      "M",
      "N",
      "O",
      "Ö",
      "P",
      "R",
      "S",
      "Ş",
      "T",
      "U",
      "Ü",
      "V",
      "W",
      "Y",
      "Z",
    ];

    expect([...alphabet].reverse().sort(compareAzStrings)).toEqual(alphabet);
  });

  it("treats case as the same primary rank so Apple and apple stay together", () => {
    expect(compareAzStrings("Apple", "apple")).not.toBe(0);
    expect(["samsung", "Apple", "apple"].sort(compareAzStrings)).toEqual([
      "Apple",
      "apple",
      "samsung",
    ]);
  });

  it("keeps digits and punctuation before letters", () => {
    expect(compareAzStrings("3M", "Apple")).toBeLessThan(0);
  });

  it("is a pure total order (same input always yields the same result)", () => {
    const names = [
      "Lenovo",
      "QNAP",
      "HPE",
      "EnGenius",
      "Vertiv",
      "HyperX",
      "Apple",
      "Samsung",
    ];
    const first = [...names].sort(compareAzStrings);
    const second = [...names].reverse().sort(compareAzStrings);

    expect(second).toEqual(first);
    expect(first.indexOf("QNAP")).toBeLessThan(first.indexOf("Lenovo"));
  });
});

describe("compareByAzName", () => {
  it("sorts brand records the same way the catalog facet list must", () => {
    const brands = [
      { id: "2", name: "Lenovo", slug: "lenovo" },
      { id: "1", name: "QNAP", slug: "qnap" },
      { id: "3", name: "HPE", slug: "hpe" },
    ];

    expect([...brands].sort(compareByAzName).map((entry) => entry.slug)).toEqual([
      "hpe",
      "qnap",
      "lenovo",
    ]);
  });
});
