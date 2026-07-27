import { describe, expect, it } from "vitest";

import { getInstallmentPageContent } from "./installment";

describe("installment page content", () => {
  it("returns localized titles for az, en, and ru", () => {
    expect(getInstallmentPageContent("az").title).toBe("Hissə-hissə ödəniş");
    expect(getInstallmentPageContent("en").title).toBe("Installment payments");
    expect(getInstallmentPageContent("ru").title).toBe("Оплата в рассрочку");
  });

  it("keeps the same section count across locales", () => {
    const az = getInstallmentPageContent("az");
    const en = getInstallmentPageContent("en");
    const ru = getInstallmentPageContent("ru");

    expect(en.sections).toHaveLength(az.sections.length);
    expect(ru.sections).toHaveLength(az.sections.length);
  });

  it("includes a lead and localized contact labels", () => {
    expect(getInstallmentPageContent("az").lead.length).toBeGreaterThan(40);
    expect(getInstallmentPageContent("en").contact.phoneLabel).toBe("Phone");
    expect(getInstallmentPageContent("ru").contact.phoneLabel).toBe("Телефон");
    expect(getInstallmentPageContent("az").contact.address).toContain("28 may");
  });

  it("mentions partner banks consistently", () => {
    const azText = JSON.stringify(getInstallmentPageContent("az"));
    const enText = JSON.stringify(getInstallmentPageContent("en"));
    const ruText = JSON.stringify(getInstallmentPageContent("ru"));

    for (const text of [azText, enText, ruText]) {
      expect(text).toContain("Birbank");
      expect(text).toContain("Tam Kart");
      expect(text).toContain("Leobank");
    }
  });
});
