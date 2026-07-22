import {
  OrderStatus,
  PaymentMethod,
  FulfillmentType,
  type Prisma,
} from '../generated/prisma/client';
import {
  parseDeliverySpeedFromNotes,
  resolveCheckoutDeliveryFee,
} from '../common/administrative-areas';

export type OrderSummarySource = Prisma.OrderGetPayload<{
  include: {
    address: {
      select: {
        recipientName: true;
        phone: true;
        administrativeArea: true;
        addressLine: true;
        notes: true;
      };
    };
    deliveryZone: {
      select: {
        id: true;
        code: true;
        name: true;
      };
    };
    pickupLocation: {
      select: {
        id: true;
        code: true;
        name: true;
      };
    };
    payment: {
      select: {
        method: true;
      };
    };
    items: {
      select: {
        id: true;
        productName: true;
        variantName: true;
        sku: true;
        quantity: true;
        lineTotal: true;
      };
      orderBy: {
        createdAt: 'asc';
      };
    };
    fulfillmentEvents: {
      take: 1;
      orderBy: {
        createdAt: 'asc';
      };
      select: {
        payload: true;
      };
    };
  };
}>;

export const orderSummaryInclude = {
  address: {
    select: {
      recipientName: true,
      phone: true,
      administrativeArea: true,
      addressLine: true,
      notes: true,
    },
  },
  deliveryZone: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  pickupLocation: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  payment: {
    select: {
      method: true,
    },
  },
  items: {
    select: {
      id: true,
      productName: true,
      variantName: true,
      sku: true,
      quantity: true,
      lineTotal: true,
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
  fulfillmentEvents: {
    take: 1,
    orderBy: {
      createdAt: 'asc' as const,
    },
    select: {
      payload: true,
    },
  },
} satisfies Prisma.OrderInclude;

function resolveCheckoutPayment(order: {
  payment: { method: PaymentMethod } | null;
  fulfillmentEvents?: Array<{ payload: unknown }>;
  status: OrderStatus;
}): {
  paymentMethod: PaymentMethod | null;
  installmentMonths: number | null;
} {
  if (order.payment !== null) {
    return {
      paymentMethod: order.payment.method,
      installmentMonths: null,
    };
  }

  const payload = order.fulfillmentEvents?.[0]?.payload;
  if (
    payload !== null &&
    typeof payload === 'object' &&
    !Array.isArray(payload)
  ) {
    const record = payload as Record<string, unknown>;
    const method = record.paymentMethod;
    const months = record.installmentMonths;
    return {
      paymentMethod:
        typeof method === 'string' &&
        (method === PaymentMethod.CASH ||
          method === PaymentMethod.CARD ||
          method === PaymentMethod.INSTALLMENT)
          ? method
          : null,
      installmentMonths: typeof months === 'number' ? months : null,
    };
  }

  if (
    order.status === OrderStatus.CONFIRMED ||
    order.status === OrderStatus.PROCESSING ||
    order.status === OrderStatus.READY_FOR_PICKUP ||
    order.status === OrderStatus.READY_FOR_DELIVERY ||
    order.status === OrderStatus.OUT_FOR_DELIVERY ||
    order.status === OrderStatus.COMPLETED
  ) {
    return {
      paymentMethod: PaymentMethod.CASH,
      installmentMonths: null,
    };
  }

  return {
    paymentMethod: null,
    installmentMonths: null,
  };
}

function resolveOrderPayableSubtotal(order: OrderSummarySource) {
  return order.subtotal.sub(order.discountTotal);
}

function resolveOrderDeliveryFee(order: OrderSummarySource) {
  if (order.fulfillmentType !== FulfillmentType.DELIVERY) {
    return '0.00';
  }

  return resolveCheckoutDeliveryFee({
    zoneFee: order.deliveryFee.toFixed(2),
    subtotal: resolveOrderPayableSubtotal(order).toFixed(2),
    administrativeArea: order.address?.administrativeArea ?? null,
    deliverySpeed: parseDeliverySpeedFromNotes(order.address?.notes),
    fulfillmentType: order.fulfillmentType,
  });
}

function resolveOrderGrandTotal(
  order: OrderSummarySource,
  resolvedDeliveryFee: string,
) {
  return resolveOrderPayableSubtotal(order)
    .add(resolvedDeliveryFee)
    .toFixed(2);
}

type OrderItemMediaSource = {
  id: string;
  objectKey: string;
  altText: string;
  mimeType: string;
  byteSize: number;
  sortOrder?: number;
};

export function mapOrderItemImage(
  variantMedia: OrderItemMediaSource | null | undefined,
  productMedia: OrderItemMediaSource[] | undefined,
) {
  const source = variantMedia ?? productMedia?.[0] ?? null;
  if (source === null) {
    return null;
  }

  return {
    id: source.id,
    objectKey: source.objectKey,
    altText: source.altText,
    mimeType: source.mimeType,
    byteSize: source.byteSize,
    sortOrder: source.sortOrder ?? 0,
  };
}

export function mapOrderSummary(order: OrderSummarySource) {
  const checkoutPayment = resolveCheckoutPayment(order);
  const quantityTotal = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const deliveryFee = resolveOrderDeliveryFee(order);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    fulfillmentType: order.fulfillmentType,
    recipientName: order.address?.recipientName ?? null,
    guestEmail: order.guestEmail,
    guestPhone: order.guestPhone,
    phone: order.address?.phone ?? order.guestPhone,
    administrativeArea: order.address?.administrativeArea ?? null,
    addressLine: order.address?.addressLine ?? null,
    notes: order.address?.notes ?? null,
    deliveryZone: order.deliveryZone,
    pickupLocation: order.pickupLocation,
    paymentMethod: checkoutPayment.paymentMethod,
    installmentMonths: checkoutPayment.installmentMonths,
    itemCount: order.items.length,
    quantityTotal,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      quantity: item.quantity,
      lineTotal: item.lineTotal.toFixed(2),
    })),
    subtotal: resolveOrderPayableSubtotal(order).toFixed(2),
    deliveryFee,
    grandTotal: resolveOrderGrandTotal(order, deliveryFee),
    currency: order.currency as 'AZN',
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
