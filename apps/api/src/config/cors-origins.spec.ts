import { parseCorsOrigins } from './cors-origins';

describe('parseCorsOrigins', () => {
  it('splits comma-separated origins and dedupes', () => {
    expect(
      parseCorsOrigins(
        'https://admin.it-market.org, https://mail.it-market.org,https://admin.it-market.org',
      ),
    ).toEqual([
      'https://admin.it-market.org',
      'https://mail.it-market.org',
    ]);
  });

  it('returns empty for blank input', () => {
    expect(parseCorsOrigins('  ,  ')).toEqual([]);
  });
});
