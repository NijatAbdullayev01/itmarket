import { createHmac } from 'node:crypto';

import { catalogRevalidateSecret } from './catalog-revalidate-secret';

describe('catalogRevalidateSecret', () => {
  const appSecret = 'test-secret-at-least-32-characters-long';

  it('derives a purpose-bound HMAC instead of returning APP_SECRET', () => {
    const derived = catalogRevalidateSecret(appSecret, '');
    expect(derived).not.toBe(appSecret);
    expect(derived).toBe(
      createHmac('sha256', appSecret)
        .update('itmarket.catalog-revalidate.v1')
        .digest('hex'),
    );
  });

  it('uses a dedicated override when it is long enough', () => {
    const dedicated = 'a-dedicated-revalidate-secret-at-least-32-chars';
    expect(catalogRevalidateSecret(appSecret, dedicated)).toBe(dedicated);
  });
});
