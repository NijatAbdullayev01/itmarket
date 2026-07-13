import { hasPermissions, PasswordHasher, Permission } from './auth.module';

describe('auth security primitives', () => {
  it('hashes passwords with a random salt and verifies them', async () => {
    const hasher = new PasswordHasher();
    const first = await hasher.hash('a-long-development-password');
    const second = await hasher.hash('a-long-development-password');

    expect(first).not.toBe(second);
    await expect(
      hasher.verify('a-long-development-password', first),
    ).resolves.toBe(true);
    await expect(hasher.verify('incorrect-password', first)).resolves.toBe(
      false,
    );
  });

  it('requires every explicit permission', () => {
    const granted = [Permission.CATALOG_READ, Permission.CATALOG_WRITE];
    expect(hasPermissions(granted, [Permission.CATALOG_READ])).toBe(true);
    expect(
      hasPermissions(granted, [
        Permission.CATALOG_READ,
        Permission.STOCK_ADJUSTMENT,
      ]),
    ).toBe(false);
  });
});
