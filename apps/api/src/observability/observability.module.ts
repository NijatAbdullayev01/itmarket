import {
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  HttpException,
  Injectable,
  Module,
  NestInterceptor,
  NotFoundException,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { tap, type Observable } from 'rxjs';
import type { Environment } from '../config/environment';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

const LATENCY_BUCKETS_SECONDS = [0.05, 0.1, 0.25, 0.4, 1, 2.5, 5];

type RequestMetric = {
  count: number;
  durationSeconds: number;
  buckets: number[];
};

@Injectable()
export class MetricsService {
  private readonly requests = new Map<string, RequestMetric>();

  constructor(private readonly prisma: PrismaService) {}

  observeRequest(method: string, statusCode: number, durationSeconds: number) {
    const statusClass = `${Math.floor(statusCode / 100)}xx`;
    const key = `${method.toUpperCase()}:${statusClass}`;
    const metric = this.requests.get(key) ?? {
      count: 0,
      durationSeconds: 0,
      buckets: LATENCY_BUCKETS_SECONDS.map(() => 0),
    };
    metric.count += 1;
    metric.durationSeconds += durationSeconds;
    LATENCY_BUCKETS_SECONDS.forEach((bucket, index) => {
      if (durationSeconds <= bucket) {
        metric.buckets[index] = (metric.buckets[index] ?? 0) + 1;
      }
    });
    this.requests.set(key, metric);
  }

  async render(): Promise<string> {
    const now = new Date();
    const [
      pendingPayments,
      oldestPendingPayment,
      activeReservations,
      expiredActiveReservations,
      pendingJobs,
      failedJobs,
      oldestPendingJob,
    ] = await Promise.all([
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      this.prisma.stockReservation.count({ where: { status: 'ACTIVE' } }),
      this.prisma.stockReservation.count({
        where: { status: 'ACTIVE', expiresAt: { lt: now } },
      }),
      this.prisma.notificationOutbox.count({ where: { status: 'PENDING' } }),
      this.prisma.notificationOutbox.count({ where: { status: 'FAILED' } }),
      this.prisma.notificationOutbox.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    const lines = [
      '# HELP itmarket_http_requests_total Completed HTTP requests.',
      '# TYPE itmarket_http_requests_total counter',
    ];
    for (const [key, metric] of [...this.requests.entries()].sort()) {
      const [method, statusClass] = key.split(':');
      const labels = `method="${method}",status_class="${statusClass}"`;
      lines.push(`itmarket_http_requests_total{${labels}} ${metric.count}`);
    }
    lines.push(
      '# HELP itmarket_http_request_duration_seconds HTTP request duration.',
      '# TYPE itmarket_http_request_duration_seconds histogram',
    );
    for (const [key, metric] of [...this.requests.entries()].sort()) {
      const [method, statusClass] = key.split(':');
      const labels = `method="${method}",status_class="${statusClass}"`;
      LATENCY_BUCKETS_SECONDS.forEach((bucket, index) => {
        lines.push(
          `itmarket_http_request_duration_seconds_bucket{${labels},le="${bucket}"} ${metric.buckets[index]}`,
        );
      });
      lines.push(
        `itmarket_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${metric.count}`,
        `itmarket_http_request_duration_seconds_sum{${labels}} ${metric.durationSeconds}`,
        `itmarket_http_request_duration_seconds_count{${labels}} ${metric.count}`,
      );
    }
    lines.push(
      '# HELP itmarket_pending_payments Current pending payments.',
      '# TYPE itmarket_pending_payments gauge',
      `itmarket_pending_payments ${pendingPayments}`,
      '# HELP itmarket_oldest_pending_payment_age_seconds Age of the oldest pending payment.',
      '# TYPE itmarket_oldest_pending_payment_age_seconds gauge',
      `itmarket_oldest_pending_payment_age_seconds ${ageSeconds(now, oldestPendingPayment?.createdAt)}`,
      '# HELP itmarket_active_inventory_reservations Current active stock reservations.',
      '# TYPE itmarket_active_inventory_reservations gauge',
      `itmarket_active_inventory_reservations ${activeReservations}`,
      '# HELP itmarket_expired_active_inventory_reservations Active reservations past expiry.',
      '# TYPE itmarket_expired_active_inventory_reservations gauge',
      `itmarket_expired_active_inventory_reservations ${expiredActiveReservations}`,
      '# HELP itmarket_notification_jobs Notification outbox jobs by state.',
      '# TYPE itmarket_notification_jobs gauge',
      `itmarket_notification_jobs{status="pending"} ${pendingJobs}`,
      `itmarket_notification_jobs{status="failed"} ${failedJobs}`,
      '# HELP itmarket_oldest_pending_job_age_seconds Age of the oldest pending outbox job.',
      '# TYPE itmarket_oldest_pending_job_age_seconds gauge',
      `itmarket_oldest_pending_job_age_seconds ${ageSeconds(now, oldestPendingJob?.createdAt)}`,
      '',
    );
    return lines.join('\n');
  }
}

@Injectable()
class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<Request>();
    const startedAt = process.hrtime.bigint();
    let recorded = false;
    const record = (statusCode: number) => {
      if (recorded) return;
      recorded = true;
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      this.metrics.observeRequest(request.method, statusCode, durationSeconds);
    };
    return next.handle().pipe(
      tap({
        next: () => record(response.statusCode),
        error: (error: unknown) => {
          record(error instanceof HttpException ? error.getStatus() : 500);
        },
      }),
    );
  }
}

@ApiTags('observability')
@Controller({ path: 'observability', version: '1' })
class ObservabilityController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  @Get('metrics')
  @ApiExcludeEndpoint()
  async scrape(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const expected = this.config.get('METRICS_TOKEN', { infer: true });
    const supplied = request.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (
      expected === undefined ||
      supplied === undefined ||
      !safeTokenEqual(expected, supplied)
    ) {
      throw new NotFoundException();
    }
    response.type('text/plain; version=0.0.4; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    return this.metrics.render();
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [ObservabilityController],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class ObservabilityModule {}

function ageSeconds(now: Date, timestamp: Date | undefined): number {
  return timestamp === undefined
    ? 0
    : Math.max(0, Math.floor((now.getTime() - timestamp.getTime()) / 1000));
}

function safeTokenEqual(expected: string, supplied: string): boolean {
  const left = createHash('sha256').update(expected).digest();
  const right = createHash('sha256').update(supplied).digest();
  return timingSafeEqual(left, right);
}
