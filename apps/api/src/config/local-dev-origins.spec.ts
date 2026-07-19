import { expandLocalDevOrigins } from './local-dev-origins';

describe('expandLocalDevOrigins', () => {
  it('adds 127.0.0.1 alias for localhost origins', () => {
    expect(expandLocalDevOrigins('http://localhost:3002')).toEqual([
      'http://localhost:3002',
      'http://127.0.0.1:3002',
    ]);
  });

  it('adds localhost alias for 127.0.0.1 origins', () => {
    expect(expandLocalDevOrigins('http://127.0.0.1:3100')).toEqual([
      'http://127.0.0.1:3100',
      'http://localhost:3100',
    ]);
  });
});
