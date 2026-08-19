import {
  type INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { ApiExceptionFilter } from './common/api-exception.filter';
import type { Environment } from './config/environment';
import { expandLocalDevOrigins } from './config/local-dev-origins';
import { parseCorsOrigins } from './config/cors-origins';
import { isMutationOriginForbidden } from './security/api-origin-audience';

const API_DOCS_PATH_PREFIX = '/api/docs';
const AUTH_PATH_SEGMENTS = [
  '/api/v1/staff/auth',
  '/api/v1/customer/auth',
  '/api/v1/customer',
];
const API_CONTENT_SECURITY_POLICY =
  "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

/**
 * Apply Express `trust proxy` hop count used for `req.ip` / rate limits.
 * Shared by bootstrap and e2e so tests exercise the same path as production.
 */
export function applyTrustProxy(app: INestApplication, hops: number): void {
  const instance = app.getHttpAdapter().getInstance() as {
    set?: (setting: string, value: unknown) => void;
  };
  if (typeof instance.set === 'function') {
    instance.set('trust proxy', hops);
  }
}

export function configureApplication(app: INestApplication): OpenAPIObject {
  const config = app.get(ConfigService<Environment, true>);
  applyTrustProxy(app, config.get('TRUST_PROXY_HOPS', { infer: true }));
  const storefrontOrigins = new Set<string>(
    parseCorsOrigins(config.get('STOREFRONT_ORIGIN', { infer: true })),
  );
  const staffOrigins = new Set<string>(
    parseCorsOrigins(config.get('BACKOFFICE_ORIGIN', { infer: true })),
  );
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    for (const origin of [...storefrontOrigins]) {
      for (const expanded of expandLocalDevOrigins(origin)) {
        storefrontOrigins.add(expanded);
      }
    }
    for (const origin of [...staffOrigins]) {
      for (const expanded of expandLocalDevOrigins(origin)) {
        staffOrigins.add(expanded);
      }
    }
  }
  const allowedOrigins = new Set<string>([
    ...storefrontOrigins,
    ...staffOrigins,
  ]);
  const releaseSha = config.get('RELEASE_SHA', { infer: true });
  app.enableShutdownHooks();
  app.enableCors({
    origin: [...allowedOrigins],
    credentials: true,
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.append('Vary', 'Origin');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    if (!request.path.startsWith(API_DOCS_PATH_PREFIX)) {
      response.setHeader(
        'Content-Security-Policy',
        API_CONTENT_SECURITY_POLICY,
      );
    }
    if (
      AUTH_PATH_SEGMENTS.some((path) => request.path.startsWith(path)) ||
      request.get('cookie') !== undefined ||
      request.get('authorization') !== undefined
    ) {
      response.setHeader('Cache-Control', 'no-store');
    }
    if (releaseSha !== undefined) {
      response.setHeader('X-Release-SHA', releaseSha);
    }
    if (config.get('NODE_ENV', { infer: true }) === 'production') {
      response.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    const originForbidden = isMutationOriginForbidden({
      method: request.method,
      path: request.path,
      origin: request.get('origin'),
      fetchSite: request.get('sec-fetch-site'),
      storefrontOrigins,
      staffOrigins,
    });
    if (originForbidden) {
      response.status(403).json({
        code: 'ORIGIN_FORBIDDEN',
        message: 'Request origin is not allowed',
        details: null,
        correlationId: request.id,
      });
      return;
    }
    next();
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  const openApiConfig = new DocumentBuilder()
    .setTitle('ITMarket API')
    .setDescription('ITMarket service API')
    .setVersion('1.0.0')
    .addServer('/api/v1')
    .addCookieAuth('itmarket_staff_access', {
      type: 'apiKey',
      in: 'cookie',
      name: 'itmarket_staff_access',
      description: 'Signed, short-lived, HTTP-only staff access cookie',
    })
    .addCookieAuth('itmarket_customer_session', {
      type: 'apiKey',
      in: 'cookie',
      name: 'itmarket_customer_session',
      description: 'Opaque, HTTP-only customer session cookie',
    })
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/openapi.json',
    });
  }
  return document;
}
