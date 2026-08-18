import { describe, expect, it } from "vitest";

import { formatAzn, formatAznCompact, formatAznValue, formatListedAznValue, parseAznAmount } from "./format-azn";

describe("formatAzn", () => {
  it("məbləği Azərbaycan manatı kimi deterministik formatlayır", () => {
    const formatted = formatAzn(1249.5);

    expect(formatted.replace(/\u00a0/g, " ")).toBe("1249.50 ₼");
  });

  it("999 və aşağıda həmişə qəpik göstərir", () => {
    expect(formatAzn(999).replace(/\u00a0/g, " ")).toBe("999.00 ₼");
    expect(formatAzn(80).replace(/\u00a0/g, " ")).toBe("80.00 ₼");
  });

  it("1000 və yuxarıda sıfır qəpiyi gizlədir, qəpikli məbləği göstərir", () => {
    expect(formatAzn(1000).replace(/\u00a0/g, " ")).toBe("1000 ₼");
    expect(formatAzn(1000.99).replace(/\u00a0/g, " ")).toBe("1000.99 ₼");
  });

  it("sonlu olmayan məbləği qəbul etmir", () => {
    expect(() => formatAzn(Number.NaN)).toThrow(TypeError);
  });
});

describe("formatAznCompact", () => {
  it("tam manatı qəpiksiz göstərir", () => {
    expect(formatAznCompact(44).replace(/\u00a0/g, " ")).toBe("44 ₼");
    expect(formatAznCompact(44.004).replace(/\u00a0/g, " ")).toBe("44 ₼");
  });

  it("qəpikli məbləği saxlayır", () => {
    expect(formatAznCompact(44.5).replace(/\u00a0/g, " ")).toBe("44.50 ₼");
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
    expect(formatAznValue("80")).toBe("80.00 ₼");
  });

  it("qəpik daxil edildikdə göstərir", () => {
    expect(formatAznValue("80.25")).toBe("80.25 ₼");
  });

  it("yanlış qiymət üçün null qaytarır", () => {
    expect(formatAznValue("not-a-number")).toBeNull();
  });
});

describe("formatListedAznValue", () => {
  it("siyahı qiymətini formatlayır", () => {
    expect(formatListedAznValue("80")).toBe("80.00 ₼");
  });

  it("əlavə olunmayan və ya sıfır qiymət üçün null qaytarır", () => {
    expect(formatListedAznValue(null)).toBeNull();
    expect(formatListedAznValue("0")).toBeNull();
    expect(formatListedAznValue("0.00")).toBeNull();
  });
});
