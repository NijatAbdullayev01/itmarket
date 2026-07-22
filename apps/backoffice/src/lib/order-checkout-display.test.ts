import { describe, expect, it } from "vitest";

import {
  formatOrderCheckoutMeta,
  formatOrderDeliveryAddress,
  formatOrderPaymentMethod,
  orderCheckoutFields,
  resolveOrderDiscountTotal,
} from "./order-checkout-display";

const sampleOrder = {
  orderNumber: "ITM-20260718-000015",
  status: "UNDER_REVIEW",
  paymentStatus: "PENDING",
  fulfillmentStatus: "RESERVED",
  fulfillmentType: "DELIVERY" as const,
  recipientName: "Nicat Abdullayev",
  guestEmail: "nicat@example.com",
  guestPhone: "+994501234567",
  phone: "+994501234567",
  administrativeArea: "yasamal",
  addressLine: "Bakı, Nizami küç. 12",
  notes: "Zəng edin",
  deliveryZone: { code: "BAKU-STD", name: "Bakı standart" },
  pickupLocation: null,
  paymentMethod: "INSTALLMENT" as const,
  installmentMonths: 6,
  itemCount: 2,
  quantityTotal: 3,
  items: [
    {
      id: "item-1",
      productName: "ThinkPad X1",
      variantName: "512 GB",
      sku: "LEN-X1-512",
      quantity: 2,
      lineTotal: "2400.00",
    },
    {
      id: "item-2",
      productName: "Mouse",
      variantName: "Black",
      sku: "MS-001",
      quantity: 1,
      lineTotal: "54.00",
    },
  ],
  subtotal: "2454.00",
  deliveryFee: "350.00",
  grandTotal: "2804.00",
  createdAt: "2026-07-18T10:00:00.000Z",
};

describe("order checkout display", () => {
  it("formats payment method with installment months", () => {
    expect(formatOrderPaymentMethod("INSTALLMENT", 6)).toBe(
      "Hissə-hissə al · 6 ay",
    );
  });

  it("builds checkout meta for list rows", () => {
    const meta = formatOrderCheckoutMeta(sampleOrder);
    expect(meta.contact).toContain("Nicat Abdullayev");
    expect(meta.contact).toContain("nicat@example.com");
    expect(meta.fulfillment).not.toContain("Bakı standart");
    expect(meta.fulfillment).toContain("Yasamal");
    expect(meta.payment).toContain("6 ay");
    expect(meta.items).toContain("LEN-X1-512");
  });

  it("includes all checkout fields for detail panel", () => {
    const fields = orderCheckoutFields({
      ...sampleOrder,
      administrativeArea: "gence",
    });
    const labels = fields.map((field) => field.label);
    expect(labels).toEqual([
      "Sifariş nömrəsi",
      "Tarix",
      "Alıcı",
      "Telefon",
      "E-poçt",
      "Təhvil alma növü",
      "Rayon / şəhər",
      "Ünvan",
      "Qeyd",
      "Ödəniş üsulu",
      "Məhsul sayı",
      "Cəmi",
      "Çatdırılma",
    ]);
    expect(
      fields.find((field) => field.label === "Təhvil alma növü")?.value,
    ).toBe("Ünvana çatdırılma");
    expect(
      fields.find((field) => field.label === "Rayon / şəhər")?.value,
    ).toBe("Gəncə");
  });

  it("hides delivery fee for free Baku district delivery", () => {
    const fields = orderCheckoutFields({
      ...sampleOrder,
      deliveryFee: "0.00",
      grandTotal: sampleOrder.subtotal,
    });
    const labels = fields.map((field) => field.label);
    expect(labels).not.toContain("Çatdırılma");
  });

  it("resolves administrative area slugs to az labels", () => {
    const fields = orderCheckoutFields({
      ...sampleOrder,
      administrativeArea: "bineqedi",
    });
    expect(
      fields.find((field) => field.label === "Rayon / şəhər")?.value,
    ).toBe("Binəqədi");
  });

  it("formats delivery address for item labels", () => {
    expect(
      formatOrderDeliveryAddress({
        administrativeArea: "yasamal",
        addressLine: "Bakı, Nizami küç. 12",
      }),
    ).toBe("Yasamal, Bakı, Nizami küç. 12");
  });

  it("resolves total discount from order or item lines", () => {
    expect(
      resolveOrderDiscountTotal({
        discountTotal: "120.00",
        items: [{ discountTotal: "80.00" }],
      }),
    ).toBe("120.00");
    expect(
      resolveOrderDiscountTotal({
        discountTotal: "0.00",
        items: [{ discountTotal: "80.00" }, { discountTotal: "40.00" }],
      }),
    ).toBe("120.00");
  });
});
