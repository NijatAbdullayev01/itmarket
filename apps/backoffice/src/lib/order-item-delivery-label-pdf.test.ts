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
      buildOrderItemDeliveryLabelFilename(sampleOrder, {
        productName: "iPhone 17 Pro",
        sku: "APP-IP17P-GMS-256G-12G",
      }),
    ).toBe("ITM-20260718-000015-iphone-17-pro-catdirilma-etiketi.pdf");
  });

  it("builds a branded delivery label document", () => {
    const doc = buildOrderItemDeliveryLabelDocumentDefinition({
      order: sampleOrder,
      item: {
        productName: "iPhone 17 Pro",
        variantName: "Gümüşü 256GB / 12GB",
        sku: "APP-IP17P-GMS-256G-12G",
        quantity: 1,
      },
    });
    const serialized = JSON.stringify(doc.content);

    expect(doc.pageSize).toBe(DELIVERY_LABEL_PAGE_SIZE);
    expect(doc.pageMargins).toEqual(DELIVERY_LABEL_PAGE_MARGINS);
    expect(doc.content).toHaveLength(1);
    expect(doc.content[0]).toMatchObject({ unbreakable: true });
    expect(serialized).toContain("IT MARKET");
    expect(serialized).toContain("iPhone 17 Pro");
    expect(serialized).toContain("Gümüşü 256GB / 12GB");
    expect(serialized).toContain("Nicat Abdullayev");
    expect(serialized).toContain("+994501234567");
    expect(serialized).toContain("Yasamal, Bakı, Nizami küç. 12");
    expect(serialized).toContain("ITM-20260718-000015");
  });
});
