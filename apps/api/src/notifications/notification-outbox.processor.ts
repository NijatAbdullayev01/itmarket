import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { NotificationComposer } from './notification-composer';
import { NotificationDispatcher } from './notification-dispatcher.port';

export const NOTIFICATION_OUTBOX_MAX_ATTEMPTS = 5;
const BACKOFF_BASE_SECONDS = 15;
const BACKOFF_MAX_SECONDS = 60 * 60;
/** Reclaim rows stuck in PROCESSING longer than this (crashed worker). */
const STALE_PROCESSING_MS = 5 * 60 * 1000;

type ClaimableOutboxRow = {
  id: string;
  topic: string;
  reference_type: string;
  reference_id: string;
  payload: Prisma.JsonValue;
  attempt_count: number;
};

@Injectable()
export class NotificationOutboxProcessor {
  private readonly logger = new Logger(NotificationOutboxProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcher,
    private readonly composer: NotificationComposer,
  ) {}

  async processPending(limit: number): Promise<number> {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    const rows = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.$queryRaw<ClaimableOutboxRow[]>`
        SELECT "id", "topic", "reference_type", "reference_id", "payload",
               "attempt_count"
        FROM "notification_outbox"
        WHERE (
          "status" = 'PENDING'
          OR (
            "status" = 'FAILED'
            AND "attempt_count" < ${NOTIFICATION_OUTBOX_MAX_ATTEMPTS}
            AND ("next_attempt_at" IS NULL OR "next_attempt_at" <= NOW())
          )
          OR (
            "status" = 'PROCESSING'
            AND "updated_at" < ${staleBefore}
          )
        )
        ORDER BY "created_at" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;

      if (claimed.length === 0) {
        return claimed;
      }

      const ids = claimed.map((row) => row.id);
      await tx.notificationOutbox.updateMany({
        where: { id: { in: ids } },
        data: { status: 'PROCESSING', nextAttemptAt: null },
      });
      return claimed;
    });

    let processed = 0;
    for (const row of rows) {
      try {
        const recipient = await this.resolveRecipient(row);
        const message = this.composer.composeFromOutbox(
          row.topic,
          row.payload,
          recipient,
        );
        if (message !== null) {
          await this.dispatcher.sendEmail(message);
        } else {
          this.logger.debug(
            `Skipped email for topic=${row.topic} reference=${row.reference_type}:${row.reference_id}`,
          );
        }
        const updated = await this.prisma.notificationOutbox.updateMany({
          where: {
            id: row.id,
            status: 'PROCESSING',
          },
          data: {
            status: 'PROCESSED',
            lastError: null,
            nextAttemptAt: null,
          },
        });
        if (updated.count > 0) {
          processed += 1;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed outbox topic=${row.topic} id=${row.id}`,
          error instanceof Error ? error.stack : String(error),
        );
        const nextAttemptCount = row.attempt_count + 1;
        const retryable = nextAttemptCount < NOTIFICATION_OUTBOX_MAX_ATTEMPTS;
        await this.prisma.notificationOutbox.updateMany({
          where: {
            id: row.id,
            status: 'PROCESSING',
          },
          data: {
            status: 'FAILED',
            attemptCount: nextAttemptCount,
            lastError: message.slice(0, 2000),
            nextAttemptAt: retryable
              ? new Date(
                  Date.now() +
                    notificationOutboxBackoffSeconds(nextAttemptCount) * 1000,
                )
              : null,
          },
        });
      }
    }

    return processed;
  }

  async requeueFailed(id: string): Promise<{ id: string; status: 'PENDING' }> {
    const updated = await this.prisma.notificationOutbox.updateMany({
      where: { id, status: { in: ['FAILED', 'PROCESSING'] } },
      data: {
        status: 'PENDING',
        attemptCount: 0,
        nextAttemptAt: null,
        lastError: null,
      },
    });
    if (updated.count === 0) {
      throw new NotFoundException('Failed notification outbox row not found');
    }
    return { id, status: 'PENDING' };
  }

  private async resolveRecipient(
    row: ClaimableOutboxRow,
  ): Promise<string | null> {
    const payload = isRecord(row.payload) ? row.payload : {};
    const direct = asEmail(payload.email);
    if (direct !== null) {
      return direct;
    }

    if (row.reference_type === 'order') {
      const order = await this.prisma.order.findUnique({
        where: { id: row.reference_id },
        select: {
          customer: { select: { email: true } },
          guestEmail: true,
        },
      });
      return asEmail(order?.customer?.email) ?? asEmail(order?.guestEmail);
    }

    if (row.reference_type === 'payment') {
      const payment = await this.prisma.payment.findUnique({
        where: { id: row.reference_id },
        select: {
          order: {
            select: {
              customer: { select: { email: true } },
              guestEmail: true,
            },
          },
        },
      });
      return (
        asEmail(payment?.order.customer?.email) ??
        asEmail(payment?.order.guestEmail)
      );
    }

    if (row.reference_type === 'credit_application') {
      const application = await this.prisma.creditApplication.findUnique({
        where: { id: row.reference_id },
        select: {
          email: true,
          customer: { select: { email: true } },
        },
      });
      return (
        asEmail(application?.email) ?? asEmail(application?.customer?.email)
      );
    }

    return null;
  }
}

export function notificationOutboxBackoffSeconds(attemptCount: number): number {
  const exponent = Math.max(0, attemptCount - 1);
  return Math.min(
    BACKOFF_BASE_SECONDS * 2 ** exponent,
    BACKOFF_MAX_SECONDS,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const email = value.trim();
  if (email.length === 0 || email.length > 254) {
    return null;
  }
  if (/[\r\n,]/.test(email)) {
    return null;
  }
  // Practical RFC-ish check; reject header-injection characters above.
  if (
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(
      email,
    )
  ) {
    return null;
  }
  return email.toLowerCase();
}
