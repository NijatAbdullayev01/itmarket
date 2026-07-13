import { describe, expect, it } from "vitest";

import { formatAzn } from "./format-azn";

describe("formatAzn", () => {
  it("məbləği Azərbaycan manatı kimi deterministik formatlayır", () => {
    const formatted = formatAzn(1249.5);

    expect(formatted.replace(/\u00a0/g, " ")).toBe("1.249,50 ₼");
  });

  it("sonlu olmayan məbləği qəbul etmir", () => {
    expect(() => formatAzn(Number.NaN)).toThrow(TypeError);
  });
});
