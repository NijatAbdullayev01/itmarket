import './config/load-env';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApplication } from './app.setup';
import type { Environment } from './config/environment';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '64kb' });
  const config = app.get(ConfigService<Environment, true>);
  // TRUST_PROXY_HOPS applied inside configureApplication (shared with e2e).
  app.useLogger(app.get(Logger));
  configureApplication(app);
  const logger = app.get(Logger);
  const seoKey = config.get('SEO_AI_API_KEY', { infer: true });
  logger.log(
    `SEO AI: model=${config.get('SEO_AI_MODEL', { infer: true })} timeoutMs=${config.get('SEO_AI_TIMEOUT_MS', { infer: true })} key=${seoKey !== undefined && seoKey.trim().length > 0 ? 'set' : 'missing'}`,
  );
  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}

void bootstrap().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      level: 'fatal',
      message: 'API startup failed',
      error: error instanceof Error ? error.message : String(error),
    })}\n`,
  );
  process.exitCode = 1;
});
