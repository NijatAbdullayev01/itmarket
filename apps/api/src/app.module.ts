import {
  MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CustomerModule } from './customer/customer.module';
import {
  CORRELATION_ID_HEADER,
  CorrelationIdMiddleware,
  isValidCorrelationId,
} from './common/correlation-id.middleware';
import { validateEnvironment } from './config/environment';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { InventoryModule } from './inventory/inventory.module';
import { JobsModule } from './jobs/jobs.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { PosModule } from './pos/pos.module';
import { ReportsModule } from './reports/reports.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { StorefrontModule } from './storefront/storefront.module';
import { ObservabilityModule } from './observability/observability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnvironment,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (request, response) => {
          const header = request.headers[CORRELATION_ID_HEADER];
          const supplied = Array.isArray(header) ? header[0] : header;
          const correlationId =
            supplied !== undefined && isValidCorrelationId(supplied)
              ? supplied
              : randomUUID();
          response.setHeader(CORRELATION_ID_HEADER, correlationId);
          return correlationId;
        },
        customProps: (request) => {
          const releaseSha = process.env.RELEASE_SHA?.trim();
          return releaseSha === undefined || releaseSha.length === 0
            ? { correlationId: request.id }
            : { correlationId: request.id, releaseSha };
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.token',
            'req.body.secret',
            'req.body.email',
            'req.body.phone',
            'req.body.recipientName',
            'req.body.addressLine',
            'req.body.notes',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    CustomerModule,
    AuditModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
    FulfillmentModule,
    PaymentsModule,
    CashRegisterModule,
    PosModule,
    ReportsModule,
    StorefrontModule,
    JobsModule,
    HealthModule,
    ObservabilityModule,
  ],
  controllers: [AppController],
  providers: [AppService, CorrelationIdMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
