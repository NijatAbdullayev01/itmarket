import {
  apiPathOriginAudience,
  isMutationOriginForbidden,
} from './api-origin-audience';

const storefrontOrigins = new Set(['http://localhost:3010']);
const staffOrigins = new Set(['http://localhost:3002']);

describe('apiPathOriginAudience', () => {
  it('classifies staff namespaces including customers (not customer)', () => {
    expect(apiPathOriginAudience('/api/v1/staff/auth/login')).toBe('staff');
    expect(
      apiPathOriginAudience('http://127.0.0.1:3001/api/v1/staff/auth/login'),
    ).toBe('staff');
    expect(apiPathOriginAudience('/api/v1/catalog/products')).toBe('staff');
    expect(apiPathOriginAudience('/api/v1/customers')).toBe('staff');
    expect(apiPathOriginAudience('/api/v1/orders/abc/transitions')).toBe(
      'staff',
    );
    expect(apiPathOriginAudience('/api/v1/staff/payments/storefront-gate')).toBe(
      'staff',
    );
  });

  it('classifies storefront and public payment surfaces', () => {
    expect(apiPathOriginAudience('/api/v1/storefront/cart')).toBe('storefront');
    expect(apiPathOriginAudience('/api/v1/customer/auth/login')).toBe(
      'storefront',
    );
    expect(apiPathOriginAudience('/api/v1/payments/attempts/tok/claim')).toBe(
      'storefront',
    );
  });

  it('classifies provider webhooks separately from public payments', () => {
    expect(apiPathOriginAudience('/api/v1/payments/webhooks/epoint')).toBe(
      'webhook',
    );
    expect(apiPathOriginAudience('/api/v1/payments/webhooks/mock')).toBe(
      'webhook',
    );
  });
});

describe('isMutationOriginForbidden', () => {
  const gate = (
    path: string,
    origin: string | undefined,
    extras: Partial<Parameters<typeof isMutationOriginForbidden>[0]> = {},
  ) =>
    isMutationOriginForbidden({
      method: 'POST',
      path,
      origin,
      fetchSite: undefined,
      storefrontOrigins,
      staffOrigins,
      ...extras,
    });

  it('lets storefront mutate customer/checkout paths', () => {
    expect(gate('/api/v1/customer/auth/login', 'http://localhost:3010')).toBe(
      false,
    );
    expect(gate('/api/v1/storefront/checkout/online', 'http://localhost:3010')).toBe(
      false,
    );
  });

  it('blocks storefront from mutating staff namespaces', () => {
    expect(gate('/api/v1/staff/auth/login', 'http://localhost:3010')).toBe(
      true,
    );
    expect(gate('/api/v1/catalog/products', 'http://localhost:3010')).toBe(
      true,
    );
  });

  it('blocks backoffice from mutating customer/storefront namespaces', () => {
    expect(gate('/api/v1/customer/auth/login', 'http://localhost:3002')).toBe(
      true,
    );
    expect(gate('/api/v1/storefront/cart', 'http://localhost:3002')).toBe(true);
  });

  it('lets backoffice mutate staff namespaces', () => {
    expect(gate('/api/v1/staff/auth/login', 'http://localhost:3002')).toBe(
      false,
    );
  });

  it('rejects first-party browser Origin on payment webhooks', () => {
    expect(
      gate('/api/v1/payments/webhooks/epoint', 'http://localhost:3010'),
    ).toBe(true);
    expect(
      gate('/api/v1/payments/webhooks/epoint', 'http://localhost:3002'),
    ).toBe(true);
  });

  it('allows origin-less provider webhooks', () => {
    expect(gate('/api/v1/payments/webhooks/epoint', undefined)).toBe(false);
  });

  it('still rejects unknown origins on non-webhook mutations', () => {
    expect(gate('/api/v1/staff/auth/login', 'https://evil.example')).toBe(true);
  });
});
