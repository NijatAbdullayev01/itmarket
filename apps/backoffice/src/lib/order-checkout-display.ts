import {
  fulfillmentTypeLabels,
  parseAznAmount,
  resolveAdministrativeAreaLabel,
  type ProductMedia,
} from "@itmarket/ui";

export type OrderCheckoutItem = {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  lineTotal: string;
  unitPrice?: string;
  discountTotal?: string;
  barcode?: string | null;
  image?: ProductMedia | null;
};

export type OrderCheckoutSummary = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  recipientName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  phone: string | null;
  administrativeArea: string | null;
  addressLine: string | null;
  notes: string | null;
  deliveryZone: { code: string; name: string } | null;
  pickupLocation: { code: string; name: string } | null;
  paymentMethod: "CASH" | "CARD" | "INSTALLMENT" | null;
  installmentMonths: number | null;
  itemCount: number;
  quantityTotal: number;
  items: OrderCheckoutItem[];
  subtotal: string;
  deliveryFee: string;
  discountTotal?: string;
  taxTotal?: string;
  grandTotal: string;
  createdAt: string;
};

const paymentMethodLabels: Record<
  NonNullable<OrderCheckoutSummary["paymentMethod"]>,
  string
> = {
  CASH: "Nağd / çatdırılma zamanı",
  CARD: "Kartla ödəniş",
  INSTALLMENT: "Hissə-hissə al",
};

export function formatOrderPaymentMethod(
  method: OrderCheckoutSummary["paymentMethod"],
  installmentMonths: number | null,
) {
  if (method === null) {
    return "—";
  }
  const label = paymentMethodLabels[method];
  if (method === "INSTALLMENT" && installmentMonths !== null) {
    return `${label} · ${installmentMonths} ay`;
  }
  return label;
}

export function formatOrderFulfillmentType(
  type: OrderCheckoutSummary["fulfillmentType"],
) {
  return fulfillmentTypeLabels[type];
}

export function formatOrderAdministrativeArea(value: string | null) {
  if (!value?.trim()) {
    return "—";
  }
  return resolveAdministrativeAreaLabel(value);
}

export function resolveOrderRecipientName(
  order: Pick<OrderCheckoutSummary, "recipientName">,
) {
  const name = order.recipientName?.trim();
  return name && name.length > 0 ? name : "Guest";
}

export function resolveOrderRecipientPhone(
  order: Pick<OrderCheckoutSummary, "phone" | "guestPhone">,
) {
  const phone = order.phone?.trim() || order.guestPhone?.trim();
  return phone && phone.length > 0 ? phone : "—";
}

export function formatOrderDeliveryAddress(
  order: Pick<OrderCheckoutSummary, "administrativeArea" | "addressLine">,
) {
  const area = formatOrderAdministrativeArea(order.administrativeArea);
  const line = order.addressLine?.trim() ?? "";

  if (area !== "—" && line.length > 0) {
    return `${area}, ${line}`;
  }
  if (line.length > 0) {
    return line;
  }
  if (area !== "—") {
    return area;
  }
  return "—";
}

export function formatOrderItemLabel(item: OrderCheckoutItem) {
  const variantSuffix =
    item.variantName.trim().length > 0 ? ` · ${item.variantName}` : "";
  return `${item.productName}${variantSuffix} · ${item.sku} · ${item.quantity} ədəd`;
}

export function formatOrderCheckoutMeta(order: OrderCheckoutSummary) {
  const contactParts = [
    order.recipientName ?? "Guest",
    order.phone ?? order.guestPhone,
    order.guestEmail,
  ].filter((value): value is string => Boolean(value && value.trim()));

  const fulfillmentParts = [
    formatOrderFulfillmentType(order.fulfillmentType),
    order.fulfillmentType === "PICKUP"
      ? (order.pickupLocation?.name ?? null)
      : null,
    formatOrderAdministrativeArea(order.administrativeArea),
  ].filter((value): value is string => Boolean(value && value.trim()));

  return {
    contact: contactParts.join(" · "),
    fulfillment: fulfillmentParts.join(" · "),
    payment: formatOrderPaymentMethod(
      order.paymentMethod,
      order.installmentMonths,
    ),
    items:
      order.items.length > 0
        ? order.items.map(formatOrderItemLabel).join(" · ")
        : `${order.itemCount} sətir · ${order.quantityTotal} ədəd`,
  };
}

export function resolveOrderDiscountTotal(
  order: Pick<OrderCheckoutSummary, "discountTotal"> & {
    items?: Array<Pick<OrderCheckoutItem, "discountTotal">>;
  },
) {
  const orderDiscount = parseAznAmount(order.discountTotal ?? "0.00") ?? 0;
  if (orderDiscount > 0) {
    return order.discountTotal ?? orderDiscount.toFixed(2);
  }

  const itemDiscountTotal = (order.items ?? []).reduce((sum, item) => {
    return sum + (parseAznAmount(item.discountTotal ?? "0.00") ?? 0);
  }, 0);

  if (itemDiscountTotal > 0) {
    return itemDiscountTotal.toFixed(2);
  }

  return order.discountTotal ?? "0.00";
}

export function orderCheckoutFields(order: OrderCheckoutSummary) {
  const deliveryFeeAmount = parseAznAmount(order.deliveryFee) ?? 0;
  const showDeliveryFee =
    order.fulfillmentType === "DELIVERY" && deliveryFeeAmount > 0;

  return [
    { label: "Sifariş nömrəsi", value: order.orderNumber },
    { label: "Tarix", value: new Date(order.createdAt).toLocaleString("az-AZ") },
    { label: "Alıcı", value: order.recipientName ?? "Guest" },
    { label: "Telefon", value: order.phone ?? order.guestPhone ?? "—" },
    { label: "E-poçt", value: order.guestEmail ?? "—" },
    {
      label: "Təhvil alma növü",
      value: formatOrderFulfillmentType(order.fulfillmentType),
    },
    ...(order.fulfillmentType === "PICKUP"
      ? [
          {
            label: "Pickup məntəqəsi",
            value: order.pickupLocation?.name ?? "—",
          },
        ]
      : []),
    {
      label: "Rayon / şəhər",
      value: formatOrderAdministrativeArea(order.administrativeArea),
    },
    { label: "Ünvan", value: order.addressLine ?? "—" },
    { label: "Qeyd", value: order.notes?.trim() ? order.notes : "—" },
    {
      label: "Ödəniş üsulu",
      value: formatOrderPaymentMethod(
        order.paymentMethod,
        order.installmentMonths,
      ),
    },
    {
      label: "Məhsul sayı",
      value: `${order.quantityTotal} ədəd`,
    },
    { label: "Cəmi", value: order.subtotal },
    ...(showDeliveryFee
      ? [{ label: "Çatdırılma", value: order.deliveryFee }]
      : []),
  ];
}
