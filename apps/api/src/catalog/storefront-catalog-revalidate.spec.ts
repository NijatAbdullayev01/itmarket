import { createHmac } from 'node:crypto';

import {
  revalidateStorefrontCatalog,
} from './storefront-catalog-revalidate';

describe('revalidateStorefrontCatalog', () => {
  const previousOrigin = process.env.STOREFRONT_ORIGIN;
  const previousSecret = process.env.APP_SECRET;
  const previousRevalidate = process.env.CATALOG_REVALIDATE_SECRET;

  beforeEach(() => {
    process.env.STOREFRONT_ORIGIN = 'http://localhost:3010';
    process.env.APP_SECRET = 'test-secret-at-least-32-characters-long';
    delete process.env.CATALOG_REVALIDATE_SECRET;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (previousOrigin === undefined) {
      delete process.env.STOREFRONT_ORIGIN;
    } else {
      process.env.STOREFRONT_ORIGIN = previousOrigin;
    }
    if (previousSecret === undefined) {
      delete process.env.APP_SECRET;
    } else {
      process.env.APP_SECRET = previousSecret;
    }
    if (previousRevalidate === undefined) {
      delete process.env.CATALOG_REVALIDATE_SECRET;
    } else {
      process.env.CATALOG_REVALIDATE_SECRET = previousRevalidate;
    }
  });

  it('POSTs paths and tags to the storefront revalidate route', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await revalidateStorefrontCatalog({
      paths: ['/products/samsung-s26-ultura'],
      tags: ['catalog', 'product:samsung-s26-ultura'],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3010/api/revalidate-catalog');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'content-type': 'application/json',
      'x-revalidate-secret': createHmac('sha256', 'test-secret-at-least-32-characters-long')
        .update('itmarket.catalog-revalidate.v1')
        .digest('hex'),
    });
    expect(JSON.parse(String(init.body))).toEqual({
      paths: ['/products/samsung-s26-ultura'],
      tags: ['catalog', 'product:samsung-s26-ultura'],
    });
  });

  it('swallows network failures', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('storefront down')) as unknown as typeof fetch;

    await expect(
      revalidateStorefrontCatalog({ paths: ['/products/x'] }),
    ).resolves.toBeUndefined();
  });
});
