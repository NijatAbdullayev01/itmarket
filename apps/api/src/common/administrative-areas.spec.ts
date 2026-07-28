import {
  BAKU_FREE_DELIVERY_MINIMUM_AZN,
  BAKU_STANDARD_DELIVERY_FEE_AZN,
  EXPRESS_DELIVERY_SURCHARGE_AZN,
  resolveCheckoutDeliveryFee,
} from './administrative-areas';

describe('resolveCheckoutDeliveryFee', () => {
  it('charges Baku standard delivery below the free threshold', () => {
    expect(
      resolveCheckoutDeliveryFee({
        zoneFee: '10.00',
        freeDeliveryMinimum: '500.00',
        subtotal: '499.99',
        administrativeArea: 'yasamal',
        deliverySpeed: 'STANDARD',
        fulfillmentType: 'DELIVERY',
      }),
    ).toBe('10.00');
  });

  it('makes Baku standard delivery free at or above the threshold', () => {
    expect(
      resolveCheckoutDeliveryFee({
        zoneFee: '10.00',
        freeDeliveryMinimum: '500.00',
        subtotal: '500.00',
        administrativeArea: 'yasamal',
        deliverySpeed: 'STANDARD',
        fulfillmentType: 'DELIVERY',
      }),
    ).toBe('0.00');
  });

  it('defaults Baku threshold to 500 AZN when zone minimum is missing', () => {
    expect(BAKU_FREE_DELIVERY_MINIMUM_AZN).toBe(500);
    expect(BAKU_STANDARD_DELIVERY_FEE_AZN).toBe(10);
    expect(
      resolveCheckoutDeliveryFee({
        zoneFee: '10.00',
        freeDeliveryMinimum: null,
        subtotal: '500.00',
        administrativeArea: 'nesimi',
        deliverySpeed: 'STANDARD',
        fulfillmentType: 'DELIVERY',
      }),
    ).toBe('0.00');
  });

  it('adds express surcharge on top of the Baku standard fee', () => {
    expect(
      resolveCheckoutDeliveryFee({
        zoneFee: '10.00',
        freeDeliveryMinimum: '500.00',
        subtotal: '100.00',
        administrativeArea: 'yasamal',
        deliverySpeed: 'EXPRESS',
        fulfillmentType: 'DELIVERY',
      }),
    ).toBe((10 + EXPRESS_DELIVERY_SURCHARGE_AZN).toFixed(2));

    expect(
      resolveCheckoutDeliveryFee({
        zoneFee: '10.00',
        freeDeliveryMinimum: '500.00',
        subtotal: '600.00',
        administrativeArea: 'yasamal',
        deliverySpeed: 'EXPRESS',
        fulfillmentType: 'DELIVERY',
      }),
    ).toBe(EXPRESS_DELIVERY_SURCHARGE_AZN.toFixed(2));
  });

  it('keeps delivery paid outside Baku even above the Baku threshold', () => {
    expect(
      resolveCheckoutDeliveryFee({
        zoneFee: '8.00',
        freeDeliveryMinimum: '500.00',
        subtotal: '900.00',
        administrativeArea: 'gence',
        deliverySpeed: 'STANDARD',
        fulfillmentType: 'DELIVERY',
      }),
    ).toBe('8.00');
  });

  it('returns zero for pickup', () => {
    expect(
      resolveCheckoutDeliveryFee({
        zoneFee: '10.00',
        freeDeliveryMinimum: '500.00',
        subtotal: '100.00',
        administrativeArea: 'yasamal',
        fulfillmentType: 'PICKUP',
      }),
    ).toBe('0.00');
  });
});
