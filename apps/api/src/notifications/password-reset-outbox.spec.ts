import { issuePasswordResetPathForOutbox } from './password-reset-outbox';

describe('issuePasswordResetPathForOutbox', () => {
  it('returns null for missing or inactive customers', async () => {
    const prisma = {
      customer: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(),
    };

    await expect(
      issuePasswordResetPathForOutbox(prisma as never, 'cust-1'),
    ).resolves.toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      active: false,
    });
    await expect(
      issuePasswordResetPathForOutbox(prisma as never, 'cust-1'),
    ).resolves.toBeNull();
  });

  it('creates a hashed reset row and returns an in-memory path only', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue({ id: 'reset-1' });
    const prisma = {
      customer: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cust-1',
          active: true,
        }),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          customerPasswordReset: { updateMany, create },
        }),
      ),
    };

    const path = await issuePasswordResetPathForOutbox(
      prisma as never,
      'cust-1',
    );

    expect(path).toMatch(/^\/account\/reset-password\?token=/);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 'cust-1',
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
    const storedHash = create.mock.calls[0][0].data.tokenHash as string;
    expect(path).not.toContain(storedHash);
  });
});
