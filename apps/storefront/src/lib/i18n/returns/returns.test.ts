import { describe, expect, it } from "vitest";

import { getReturnsPageContent } from "./returns";

describe("returns page content", () => {
  it("returns localized titles for az, en, and ru", () => {
    expect(getReturnsPageContent("az").title).toBe("Geri qaytarma");
    expect(getReturnsPageContent("en").title).toBe("Returns");
    expect(getReturnsPageContent("ru").title).toBe("Возврат");
  });

  it("keeps the same section count across locales", () => {
    const az = getReturnsPageContent("az");
    const en = getReturnsPageContent("en");
    const ru = getReturnsPageContent("ru");

    expect(en.sections).toHaveLength(az.sections.length);
    expect(ru.sections).toHaveLength(az.sections.length);
  });

  it("includes a lead and localized contact labels", () => {
    expect(getReturnsPageContent("az").lead.length).toBeGreaterThan(40);
    expect(getReturnsPageContent("en").contact.phoneLabel).toBe("Phone");
    expect(getReturnsPageContent("ru").contact.phoneLabel).toBe("Телефон");
    expect(getReturnsPageContent("az").contact.address).toContain("28 may");
  });

  it("states the 14-day return window consistently", () => {
    const azText = JSON.stringify(getReturnsPageContent("az"));
    const enText = JSON.stringify(getReturnsPageContent("en"));
    const ruText = JSON.stringify(getReturnsPageContent("ru"));

    expect(azText).toContain("14");
    expect(enText).toContain("14");
    expect(ruText).toContain("14");
  });
});
