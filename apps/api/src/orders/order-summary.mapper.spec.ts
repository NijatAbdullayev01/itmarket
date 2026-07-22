import {
  FulfillmentType,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '../generated/prisma/client';
import { mapOrderSummary } from './order-summary.mapper';

function buildOrder(overrides: {
  subtotal?: string;
  discountTotal?: string;
  deliveryFee?: string;
  grandTotal?: string;
  administrativeArea?: string | null;
  notes?: string | null;
}) {
  const subtotal = new Prisma.Decimal(overrides.subtotal ?? '22.00');
  const discountTotal = new Prisma.Decimal(overrides.discountTotal ?? '0.00');
  const deliveryFee = new Prisma.Decimal(overrides.deliveryFee ?? '5.00');
  const grandTotal = new Prisma.Decimal(overrides.grandTotal ?? '27.00');

  return {
    id: 'order-1',
    orderNumber: 'ITM-20260722-000006',
    status: OrderStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
    fulfillmentStatus: 'PENDING',
    fulfillmentType: FulfillmentType.DELIVERY,
    guestEmail: 'guest@example.com',
    guestPhone: '+994501234567',
    currency: 'AZN',
    subtotal,
    discountTotal,
    deliveryFee,
    grandTotal,
    createdAt: new Date('2026-07-22T10:00:00.000Z'),
    updatedAt: new Date('2026-07-22T10:00:00.000Z'),
    address: {
      recipientName: 'Test User',
      phone: '+994501234567',
      administrativeArea: overrides.administrativeArea ?? 'yasamal',
      addressLine: 'Test address',
      notes: overrides.notes ?? null,
    },
    deliveryZone: {
      id: 'zone-1',
      code: 'BAKU-STD',
      name: 'Bakı standart',
    },
    pickupLocation: null,
    payment: null,
    items: [
      {
        id: 'item-1',
        productName: 'Test product',
        variantName: 'Default',
        sku: 'TEST-001',
        quantity: 1,
        lineTotal: subtotal,
      },
    ],
    fulfillmentEvents: [],
  } as Parameters<typeof mapOrderSummary>[0];
}

describe('mapOrderSummary', () => {
  it('excludes stored zone delivery fee from grand total for free Baku delivery', () => {
    const summary = mapOrderSummary(
      buildOrder({
        subtotal: '22.00',
        deliveryFee: '5.00',
        grandTotal: '27.00',
        administrativeArea: 'yasamal',
      }),
    );

    expect(summary.deliveryFee).toBe('0.00');
    expect(summary.grandTotal).toBe('22.00');
    expect(summary.subtotal).toBe('22.00');
  });

  it('keeps paid delivery in grand total outside Baku', () => {
    const summary = mapOrderSummary(
      buildOrder({
        subtotal: '22.00',
        deliveryFee: '5.00',
        grandTotal: '27.00',
        administrativeArea: 'gence',
      }),
    );

    expect(summary.deliveryFee).toBe('5.00');
    expect(summary.grandTotal).toBe('27.00');
  });
});
