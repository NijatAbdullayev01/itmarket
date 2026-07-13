import { describe, expect, it } from "vitest";

import { formatAzn } from "./format-azn";

describe("formatAzn", () => {
  it("hesabat məbləğini manatla sabit formatlayır", () => {
    const formatted = formatAzn(80);

    expect(formatted.replace(/\u00a0/g, " ")).toBe("80,00 ₼");
  });

  it("sonsuz məbləği qəbul etmir", () => {
    expect(() => formatAzn(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});
