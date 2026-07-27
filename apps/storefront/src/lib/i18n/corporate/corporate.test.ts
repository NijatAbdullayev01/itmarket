import { describe, expect, it } from "vitest";

import {
  buildCorporateInquiryHref,
  getCorporatePageContent,
} from "./corporate";

describe("corporate page content", () => {
  it("returns localized titles for az, en, and ru", () => {
    expect(getCorporatePageContent("az").title).toBe("Korporativ satışlar");
    expect(getCorporatePageContent("en").title).toBe("Corporate sales");
    expect(getCorporatePageContent("ru").title).toBe("Корпоративные продажи");
  });

  it("keeps benefit and step counts aligned across locales", () => {
    const az = getCorporatePageContent("az");
    const en = getCorporatePageContent("en");
    const ru = getCorporatePageContent("ru");

    expect(en.benefits).toHaveLength(az.benefits.length);
    expect(ru.benefits).toHaveLength(az.benefits.length);
    expect(en.steps).toHaveLength(az.steps.length);
    expect(ru.steps).toHaveLength(az.steps.length);
    expect(az.benefits.map((b) => b.icon)).toEqual(
      en.benefits.map((b) => b.icon),
    );
  });

  it("builds a mailto inquiry link", () => {
    const href = buildCorporateInquiryHref(
      "info@it-market.org",
      "Korporativ satış sorğusu",
    );
    expect(href).toContain("mailto:info@it-market.org");
    expect(href).toContain(
      encodeURIComponent("Korporativ satış sorğusu"),
    );
  });
});
