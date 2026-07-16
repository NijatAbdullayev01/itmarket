import { describe, expect, it } from "vitest";

import { formatAzn, formatAznValue, parseAznAmount } from "./format-azn";

describe("formatAzn", () => {
  it("məbləği Azərbaycan manatı kimi deterministik formatlayır", () => {
    const formatted = formatAzn(1249.5);

    expect(formatted.replace(/\u00a0/g, " ")).toBe("1.249,50 ₼");
  });

  it("sonlu olmayan məbləği qəbul etmir", () => {
    expect(() => formatAzn(Number.NaN)).toThrow(TypeError);
  });
});

describe("parseAznAmount", () => {
  it("düzgün string qiyməti parse edir", () => {
    expect(parseAznAmount("1249.50")).toBe(1249.5);
  });

  it("yanlış dəyər üçün null qaytarır", () => {
    expect(parseAznAmount("abc")).toBeNull();
    expect(parseAznAmount(null)).toBeNull();
  });
});

describe("formatAznValue", () => {
  it("düzgün qiyməti formatlayır", () => {
    expect(formatAznValue("80")).toBe("80,00 ₼");
  });

  it("yanlış qiymət üçün null qaytarır", () => {
    expect(formatAznValue("not-a-number")).toBeNull();
  });
});
