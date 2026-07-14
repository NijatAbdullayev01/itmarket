import {
  Injectable,
  Logger,
  Module,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { RedisService } from '../infrastructure/redis/redis.service';
import { PaymentsModule, PaymentsService } from '../payments/payments.module';
import { ReportsModule, ReportsService } from '../reports/reports.module';

const PAYMENT_EXPIRATION_INTERVAL_MS = 30_000;
const NOTIFICATION_OUTBOX_INTERVAL_MS = 15_000;
const REPORT_EXPORT_INTERVAL_MS = 20_000;
const LEASE_SAFETY_BUFFER_MS = 5_000;
const NOTIFICATION_BATCH_SIZE = 25;
const REPORT_EXPORT_BATCH_SIZE = 5;

type PendingOutboxRow = {
  id: string;
  topic: string;
  reference_type: string;
  reference_id: string;
};

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private readonly timers: Array<ReturnType<typeof setInterval>> = [];

  constructor(
    private readonly payments: PaymentsService,
    private readonly reports: ReportsService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.scheduleRecurringJob(
      'payments-expiration',
      PAYMENT_EXPIRATION_INTERVAL_MS,
      async () => {
        await this.payments.expirePendingPayments(new Date());
        await this.payments.reconcilePendingPayments(new Date());
      },
    );
    this.scheduleRecurringJob(
      'notification-outbox',
      NOTIFICATION_OUTBOX_INTERVAL_MS,
      async () => {
        await this.processNotificationOutbox();
      },
    );
    this.scheduleRecurringJob(
      'report-exports',
      REPORT_EXPORT_INTERVAL_MS,
      async () => {
        await this.processReportExports();
      },
    );
  }

  onModuleDestroy(): void {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers.length = 0;
  }

  async processNotificationOutbox(
    limit = NOTIFICATION_BATCH_SIZE,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<PendingOutboxRow[]>`
        SELECT "id", "topic", "reference_type", "reference_id"
        FROM "notification_outbox"
        WHERE "status" = 'PENDING'
        ORDER BY "created_at" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;

      for (const row of rows) {
        this.logger.log(
          `Processed outbox topic=${row.topic} reference=${row.reference_type}:${row.reference_id}`,
        );
        await tx.notificationOutbox.update({
          where: { id: row.id },
          data: { status: 'PROCESSED' },
        });
      }

      return rows.length;
    });
  }

  async processReportExports(
    limit = REPORT_EXPORT_BATCH_SIZE,
  ): Promise<number> {
    const ids = await this.reports.claimPendingExports(limit);
    for (const id of ids) {
      await this.reports.processExport(id);
    }
    return ids.length;
  }

  private scheduleRecurringJob(
    name: string,
    intervalMs: number,
    task: () => Promise<void>,
  ): void {
    const run = () => {
      void this.runWithLease(name, intervalMs + LEASE_SAFETY_BUFFER_MS, task);
    };
    const timer = setInterval(run, intervalMs);
    timer.unref();
    this.timers.push(timer);
    run();
  }

  private async runWithLease(
    name: string,
    leaseMs: number,
    task: () => Promise<void>,
  ): Promise<void> {
    try {
      const lease = await this.redis.withLease(`jobs:${name}`, leaseMs, task);
      if (!lease.acquired) {
        this.logger.debug(
          `Skipped ${name} because another worker holds the lease`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Recurring job ${name} failed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

@Module({
  imports: [PrismaModule, RedisModule, PaymentsModule, ReportsModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
