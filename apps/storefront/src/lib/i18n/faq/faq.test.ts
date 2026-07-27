import { describe, expect, it } from "vitest";

import { getFaqPageContent } from "./faq";

describe("faq page content", () => {
  it("returns localized titles for az, en, and ru", () => {
    expect(getFaqPageContent("az").title).toBe("Tez-tez verilən suallar");
    expect(getFaqPageContent("en").title).toBe("Frequently asked questions");
    expect(getFaqPageContent("ru").title).toBe("Часто задаваемые вопросы");
  });

  it("keeps the same section count across locales", () => {
    const az = getFaqPageContent("az");
    const en = getFaqPageContent("en");
    const ru = getFaqPageContent("ru");

    expect(en.sections).toHaveLength(az.sections.length);
    expect(ru.sections).toHaveLength(az.sections.length);
  });

  it("includes a lead and localized contact labels", () => {
    expect(getFaqPageContent("az").lead.length).toBeGreaterThan(40);
    expect(getFaqPageContent("en").contact.phoneLabel).toBe("Phone");
    expect(getFaqPageContent("ru").contact.phoneLabel).toBe("Телефон");
    expect(getFaqPageContent("az").contact.address).toContain("28 may");
  });

  it("states key commerce facts consistently", () => {
    const azText = JSON.stringify(getFaqPageContent("az"));
    const enText = JSON.stringify(getFaqPageContent("en"));
    const ruText = JSON.stringify(getFaqPageContent("ru"));

    expect(azText).toContain("99 AZN");
    expect(enText).toContain("99 AZN");
    expect(ruText).toContain("99 AZN");
    expect(azText).toContain("14");
    expect(enText).toContain("14");
    expect(ruText).toContain("14");
  });
});
