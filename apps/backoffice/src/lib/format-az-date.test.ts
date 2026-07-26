import { describe, expect, it } from "vitest";

import { formatAzDate, formatAzDateTime } from "./format-az-date";

describe("formatAzDate", () => {
  it("ISO tarix-saatını Asia/Baku ilə DD.MM.YYYY formatlayır", () => {
    expect(formatAzDate("2026-07-26T11:13:11.265Z")).toBe("26.07.2026");
  });

  it("YYYY-MM-DD kalendar gününü timezone sürüşməsi olmadan göstərir", () => {
    expect(formatAzDate("2026-07-26")).toBe("26.07.2026");
  });
});

describe("formatAzDateTime", () => {
  it("DD.MM.YYYY, HH:mm (Asia/Baku, 24 saat) formatlayır", () => {
    expect(formatAzDateTime("2026-07-26T11:13:11.265Z")).toBe(
      "26.07.2026, 15:13",
    );
  });
});
