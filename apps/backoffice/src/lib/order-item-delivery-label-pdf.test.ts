import { describe, expect, it } from "vitest";

import {
  buildOrderItemDeliveryLabelDocumentDefinition,
  buildOrderItemDeliveryLabelFilename,
  DELIVERY_LABEL_PAGE_MARGINS,
  DELIVERY_LABEL_PAGE_SIZE,
  type OrderItemDeliveryLabelContext,
} from "./order-item-delivery-label-pdf";
import {
  formatOrderDeliveryAddress,
  resolveOrderRecipientName,
  resolveOrderRecipientPhone,
} from "./order-checkout-display";

const sampleOrder: OrderItemDeliveryLabelContext = {
  orderNumber: "ITM-20260718-000015",
  recipientName: "Nicat Abdullayev",
  phone: "+994501234567",
  guestPhone: null,
  administrativeArea: "yasamal",
  addressLine: "Bakı, Nizami küç. 12",
};

describe("order item delivery label pdf", () => {
  it("resolves recipient and delivery address for the label", () => {
    expect(resolveOrderRecipientName(sampleOrder)).toBe("Nicat Abdullayev");
    expect(resolveOrderRecipientPhone(sampleOrder)).toBe("+994501234567");
    expect(formatOrderDeliveryAddress(sampleOrder)).toBe(
      "Yasamal, Bakı, Nizami küç. 12",
    );
  });

  it("builds a stable pdf filename", () => {
    expect(
      buildOrderItemDeliveryLabelFilename(sampleOrder, [
        {
          productName: "iPhone 17 Pro",
          sku: "APP-IP17P-GMS-256G-12G",
        },
      ]),
    ).toBe("ITM-20260718-000015-iphone-17-pro-catdirilma-etiketi.pdf");

    expect(
      buildOrderItemDeliveryLabelFilename(sampleOrder, [
        {
          productName: "iPhone 17 Pro",
          sku: "APP-IP17P-GMS-256G-12G",
        },
        {
          productName: "AirPods Pro",
          sku: "APP-APPRO-2",
        },
      ]),
    ).toBe("ITM-20260718-000015-catdirilma-etiketi.pdf");
  });

  it("builds an A4 delivery label with the required fields", () => {
    const doc = buildOrderItemDeliveryLabelDocumentDefinition({
      order: sampleOrder,
      items: [
        {
          productName: "iPhone 17 Pro",
          variantName: "Gümüşü 256GB / 12GB",
          sku: "APP-IP17P-GMS-256G-12G",
          barcode: "8600123456789",
          quantity: 1,
        },
      ],
    });
    const serialized = JSON.stringify(doc.content);

    expect(doc.pageSize).toBe(DELIVERY_LABEL_PAGE_SIZE);
    expect(DELIVERY_LABEL_PAGE_SIZE).toBe("A4");
    expect(doc.pageMargins).toEqual(DELIVERY_LABEL_PAGE_MARGINS);
    const content = Array.isArray(doc.content) ? doc.content : [doc.content];
    expect(content).toHaveLength(1);
    expect(content[0]).toMatchObject({ unbreakable: true });
    expect(serialized).toContain("IT MARKET");
    expect(serialized).toContain("Alıcı:");
    expect(serialized).toContain("Nicat Abdullayev");
    expect(serialized).toContain("Əlaqə:");
    expect(serialized).toContain("+994501234567");
    expect(serialized).toContain("Sifariş nömrəsi:");
    expect(serialized).toContain("ITM-20260718-000015");
    expect(serialized).toContain("Çatdırılma ünvanı:");
    expect(serialized).toContain("Yasamal, Bakı, Nizami küç. 12");
    expect(serialized).toContain("Məhsulun adı:");
    expect(serialized).toContain("iPhone 17 Pro · Gümüşü 256GB / 12GB");
    expect(serialized).toContain("Barkod:");
    expect(serialized).toContain("8600123456789");
    expect(serialized).toContain("SKU:");
    expect(serialized).toContain("APP-IP17P-GMS-256G-12G");
  });

  it("shows a dash when barcode is missing", () => {
    const doc = buildOrderItemDeliveryLabelDocumentDefinition({
      order: sampleOrder,
      items: [
        {
          productName: "iPhone 17 Pro",
          variantName: "",
          sku: "APP-IP17P-GMS-256G-12G",
          barcode: null,
          quantity: 1,
        },
      ],
    });
    const serialized = JSON.stringify(doc.content);

    expect(serialized).toContain("Barkod:");
    expect(serialized).toContain('"—"');
    expect(serialized).toContain("Məhsulun adı:");
    expect(serialized).toContain("iPhone 17 Pro");
  });

  it("combines multiple order items on one delivery label", () => {
    const doc = buildOrderItemDeliveryLabelDocumentDefinition({
      order: sampleOrder,
      items: [
        {
          productName: "iPhone 17 Pro",
          variantName: "Gümüşü 256GB / 12GB",
          sku: "APP-IP17P-GMS-256G-12G",
          barcode: "8600123456789",
          quantity: 1,
        },
        {
          productName: "AirPods Pro",
          variantName: "Ağ",
          sku: "APP-APPRO-2",
          barcode: "8600987654321",
          quantity: 2,
        },
      ],
    });
    const serialized = JSON.stringify(doc.content);

    expect(serialized).toContain("Məhsul 1:");
    expect(serialized).toContain("iPhone 17 Pro · Gümüşü 256GB / 12GB");
    expect(serialized).toContain("Məhsul 2:");
    expect(serialized).toContain("AirPods Pro · Ağ · 2 ədəd");
    expect(serialized).toContain("APP-APPRO-2");
    expect(serialized).toContain("8600987654321");
  });
});
