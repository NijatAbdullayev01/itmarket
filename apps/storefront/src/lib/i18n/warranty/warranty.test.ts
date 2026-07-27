import { describe, expect, it } from "vitest";

import { getWarrantyPageContent } from "./warranty";

describe("warranty page content", () => {
  it("returns localized titles for az, en, and ru", () => {
    expect(getWarrantyPageContent("az").title).toBe("Zəmanət");
    expect(getWarrantyPageContent("en").title).toBe("Warranty");
    expect(getWarrantyPageContent("ru").title).toBe("Гарантия");
  });

  it("keeps the same section count across locales", () => {
    const az = getWarrantyPageContent("az");
    const en = getWarrantyPageContent("en");
    const ru = getWarrantyPageContent("ru");

    expect(en.sections).toHaveLength(az.sections.length);
    expect(ru.sections).toHaveLength(az.sections.length);
  });

  it("includes a lead and localized contact labels", () => {
    expect(getWarrantyPageContent("az").lead.length).toBeGreaterThan(40);
    expect(getWarrantyPageContent("en").contact.phoneLabel).toBe("Phone");
    expect(getWarrantyPageContent("ru").contact.phoneLabel).toBe("Телефон");
    expect(getWarrantyPageContent("az").contact.address).toContain("28 may");
  });

  it("distinguishes warranty from the 14-day return", () => {
    const azText = JSON.stringify(getWarrantyPageContent("az"));
    const enText = JSON.stringify(getWarrantyPageContent("en"));
    const ruText = JSON.stringify(getWarrantyPageContent("ru"));

    expect(azText).toContain("14");
    expect(enText).toContain("14");
    expect(ruText).toContain("14");
    expect(azText.toLowerCase()).toContain("qaytarma");
    expect(enText.toLowerCase()).toContain("return");
  });
});
