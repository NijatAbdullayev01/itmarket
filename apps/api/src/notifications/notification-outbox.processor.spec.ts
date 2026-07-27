import {
  NOTIFICATION_OUTBOX_MAX_ATTEMPTS,
  notificationOutboxBackoffSeconds,
  NotificationOutboxProcessor,
} from './notification-outbox.processor';

describe('notificationOutboxBackoffSeconds', () => {
  it('uses exponential backoff capped at one hour', () => {
    expect(notificationOutboxBackoffSeconds(1)).toBe(15);
    expect(notificationOutboxBackoffSeconds(2)).toBe(30);
    expect(notificationOutboxBackoffSeconds(3)).toBe(60);
    expect(notificationOutboxBackoffSeconds(10)).toBe(3600);
  });
});

describe('NotificationOutboxProcessor', () => {
  it('retries failed rows until max attempts then stops scheduling', async () => {
    const row = {
      id: 'outbox-1',
      topic: 'orders.created',
      reference_type: 'order',
      reference_id: 'order-1',
      payload: { email: 'guest@example.test' },
      attempt_count: NOTIFICATION_OUTBOX_MAX_ATTEMPTS - 1,
      status: 'FAILED' as const,
    };

    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $queryRaw: jest.fn().mockResolvedValue([row]),
          notificationOutbox: { updateMany },
        }),
      ),
      notificationOutbox: { updateMany },
      order: { findUnique: jest.fn() },
      payment: { findUnique: jest.fn() },
    };
    const dispatcher = {
      sendEmail: jest.fn().mockRejectedValue(new Error('smtp down')),
    };
    const composer = {
      composeFromOutbox: jest.fn().mockReturnValue({
        to: 'guest@example.test',
        subject: 'x',
        text: 'y',
      }),
    };

    const processor = new NotificationOutboxProcessor(
      prisma as never,
      dispatcher as never,
      composer as never,
    );

    await expect(processor.processPending(10)).resolves.toBe(0);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PROCESSING' }),
        data: expect.objectContaining({
          status: 'FAILED',
          attemptCount: NOTIFICATION_OUTBOX_MAX_ATTEMPTS,
          nextAttemptAt: null,
          lastError: 'smtp down',
        }),
      }),
    );
  });

  it('requeues a failed or stuck processing row to PENDING', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const processor = new NotificationOutboxProcessor(
      {
        notificationOutbox: { updateMany },
      } as never,
      {} as never,
      {} as never,
    );

    await expect(processor.requeueFailed('outbox-1')).resolves.toEqual({
      id: 'outbox-1',
      status: 'PENDING',
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'outbox-1', status: { in: ['FAILED', 'PROCESSING'] } },
      data: {
        status: 'PENDING',
        attemptCount: 0,
        nextAttemptAt: null,
        lastError: null,
      },
    });
  });
});
