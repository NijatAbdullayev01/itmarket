import { describe, expect, it } from "vitest";

import { formatAzDate, formatAzDateTime } from "./format-az-date";

describe("formatAzDate", () => {
  it("ISO tarix-saatını Asia/Baku ilə DD.MM.YYYY formatlayır", () => {
    // 11:13 UTC → Bakıda eyni gün
    expect(formatAzDate("2026-07-26T11:13:11.265Z")).toBe("26.07.2026");
  });

  it("YYYY-MM-DD kalendar gününü timezone sürüşməsi olmadan göstərir", () => {
    expect(formatAzDate("2026-07-26")).toBe("26.07.2026");
  });

  it("keçərsiz dəyərdə fallback qaytarır", () => {
    expect(formatAzDate("not-a-date")).toBe("");
    expect(formatAzDate(null, "—")).toBe("—");
  });
});

describe("formatAzDateTime", () => {
  it("DD.MM.YYYY, HH:mm (Asia/Baku, 24 saat) formatlayır", () => {
    // 11:13 UTC → 15:13 Bakı (UTC+4, yayda da +4)
    expect(formatAzDateTime("2026-07-26T11:13:11.265Z")).toBe(
      "26.07.2026, 15:13",
    );
  });

  it("keçərsiz dəyərdə fallback qaytarır", () => {
    expect(formatAzDateTime("")).toBe("");
    expect(formatAzDateTime(undefined, "—")).toBe("—");
  });
});
