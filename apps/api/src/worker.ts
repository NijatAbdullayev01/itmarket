import './config/load-env';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

/**
 * Background worker process: same AppModule as the API, without HTTP listen.
 * Recurring jobs run via JobsService when JOBS_ENABLED=true (default).
 */
export async function bootstrapWorker(): Promise<void> {
  if (process.env.JOBS_ENABLED === undefined) {
    process.env.JOBS_ENABLED = 'true';
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const logger = app.get(Logger);
  logger.log('Worker process ready (Redis-lease recurring jobs)');
}

void bootstrapWorker().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      level: 'fatal',
      message: 'Worker startup failed',
      error: error instanceof Error ? error.message : String(error),
    })}\n`,
  );
  process.exitCode = 1;
});
