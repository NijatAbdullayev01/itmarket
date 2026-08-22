import { expandLocalDevOrigins } from './local-dev-origins';

describe('expandLocalDevOrigins', () => {
  it('adds 127.0.0.1 alias and parallel-dev sibling port for localhost origins', () => {
    expect(expandLocalDevOrigins('http://localhost:3002').sort()).toEqual(
      [
        'http://127.0.0.1:3002',
        'http://127.0.0.1:4002',
        'http://localhost:3002',
        'http://localhost:4002',
      ].sort(),
    );
  });

  it('adds localhost alias for 127.0.0.1 origins without a sibling port', () => {
    expect(expandLocalDevOrigins('http://127.0.0.1:3100').sort()).toEqual(
      ['http://127.0.0.1:3100', 'http://localhost:3100'].sort(),
    );
  });

  it('allows both .env (3010) and pnpm dev (4010) storefront ports', () => {
    expect(expandLocalDevOrigins('http://localhost:4010')).toEqual(
      expect.arrayContaining([
        'http://localhost:4010',
        'http://127.0.0.1:4010',
        'http://localhost:3010',
        'http://127.0.0.1:3010',
      ]),
    );
  });

  it('does not remap non-loopback production origins', () => {
    expect(expandLocalDevOrigins('https://it-market.org')).toEqual([
      'https://it-market.org',
    ]);
  });
});
