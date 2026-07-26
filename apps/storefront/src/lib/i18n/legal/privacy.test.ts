import { describe, expect, it } from "vitest";

import { getPrivacyPageContent } from "./privacy";

describe("privacy page content", () => {
  it("returns localized titles for az, en, and ru", () => {
    expect(getPrivacyPageContent("az").title).toBe("Məxfilik siyasəti");
    expect(getPrivacyPageContent("en").title).toBe("Privacy policy");
    expect(getPrivacyPageContent("ru").title).toBe(
      "Политика конфиденциальности",
    );
  });

  it("keeps the same section count across locales", () => {
    const az = getPrivacyPageContent("az");
    const en = getPrivacyPageContent("en");
    const ru = getPrivacyPageContent("ru");

    expect(en.sections).toHaveLength(az.sections.length);
    expect(ru.sections).toHaveLength(az.sections.length);
  });

  it("localizes meta and contact labels", () => {
    expect(getPrivacyPageContent("en").meta).toContain("Last updated");
    expect(getPrivacyPageContent("ru").meta).toContain("Последнее обновление");
    expect(getPrivacyPageContent("en").contact.phoneLabel).toBe("Phone");
    expect(getPrivacyPageContent("ru").contact.phoneLabel).toBe("Телефон");
  });
});
