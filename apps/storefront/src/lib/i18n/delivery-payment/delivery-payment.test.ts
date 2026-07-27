import { describe, expect, it } from "vitest";

import { getDeliveryPaymentPageContent } from "./delivery-payment";

describe("delivery-payment page content", () => {
  it("returns localized titles for az, en, and ru", () => {
    expect(getDeliveryPaymentPageContent("az").title).toBe(
      "Çatdırılma və ödəmə",
    );
    expect(getDeliveryPaymentPageContent("en").title).toBe(
      "Delivery and payment",
    );
    expect(getDeliveryPaymentPageContent("ru").title).toBe("Доставка и оплата");
  });

  it("keeps the same section count across locales", () => {
    const az = getDeliveryPaymentPageContent("az");
    const en = getDeliveryPaymentPageContent("en");
    const ru = getDeliveryPaymentPageContent("ru");

    expect(en.sections).toHaveLength(az.sections.length);
    expect(ru.sections).toHaveLength(az.sections.length);
  });

  it("includes a lead and localized contact labels", () => {
    expect(getDeliveryPaymentPageContent("az").lead.length).toBeGreaterThan(40);
    expect(getDeliveryPaymentPageContent("en").contact.phoneLabel).toBe(
      "Phone",
    );
    expect(getDeliveryPaymentPageContent("ru").contact.phoneLabel).toBe(
      "Телефон",
    );
    expect(getDeliveryPaymentPageContent("az").contact.address).toContain(
      "28 may",
    );
  });

  it("states the Baku free-delivery threshold consistently", () => {
    const azText = JSON.stringify(getDeliveryPaymentPageContent("az"));
    const enText = JSON.stringify(getDeliveryPaymentPageContent("en"));
    const ruText = JSON.stringify(getDeliveryPaymentPageContent("ru"));

    expect(azText).toContain("99 AZN");
    expect(enText).toContain("99 AZN");
    expect(ruText).toContain("99 AZN");
  });
});
