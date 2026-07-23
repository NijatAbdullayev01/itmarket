import {
  decodeGuestCustomerCursor,
  encodeGuestCustomerCursor,
} from './guest-customers-query';

describe('guest customer cursor encoding', () => {
  it('round-trips lastOrderAt and identityKey', () => {
    const lastOrderAt = new Date('2026-07-23T12:34:56.789Z');
    const identityKey = 'e:guest@example.com';
    const encoded = encodeGuestCustomerCursor(lastOrderAt, identityKey);
    expect(decodeGuestCustomerCursor(encoded)).toEqual({
      lastOrderAt,
      identityKey,
    });
  });

  it('rejects malformed cursors', () => {
    expect(decodeGuestCustomerCursor('not-valid')).toBeNull();
    expect(decodeGuestCustomerCursor('')).toBeNull();
    expect(
      decodeGuestCustomerCursor(
        Buffer.from('not-a-date\nkey', 'utf8').toString('base64url'),
      ),
    ).toBeNull();
  });
});
