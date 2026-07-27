import { describe, expect, it } from "vitest";

import { getAboutPageContent } from "./about";

describe("about page content", () => {
  it("returns localized titles for az, en, and ru", () => {
    expect(getAboutPageContent("az").title).toBe("Şirkət haqqında");
    expect(getAboutPageContent("en").title).toBe("About us");
    expect(getAboutPageContent("ru").title).toBe("О компании");
  });

  it("keeps the same section count across locales", () => {
    const az = getAboutPageContent("az");
    const en = getAboutPageContent("en");
    const ru = getAboutPageContent("ru");

    expect(en.sections).toHaveLength(az.sections.length);
    expect(ru.sections).toHaveLength(az.sections.length);
  });

  it("includes a lead and localized contact labels", () => {
    expect(getAboutPageContent("az").lead.length).toBeGreaterThan(40);
    expect(getAboutPageContent("en").contact.phoneLabel).toBe("Phone");
    expect(getAboutPageContent("ru").contact.phoneLabel).toBe("Телефон");
    expect(getAboutPageContent("az").contact.address).toContain("28 may");
  });
});
