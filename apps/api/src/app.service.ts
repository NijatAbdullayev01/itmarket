import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from './config/environment';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  getMetadata(): {
    name: '@itmarket/api';
    version: '0.0.1';
    apiVersion: 'v1';
    environment: Environment['NODE_ENV'];
    status: 'ok';
    releaseSha: string | null;
  } {
    return {
      name: '@itmarket/api',
      version: '0.0.1',
      apiVersion: 'v1',
      environment: this.config.get('NODE_ENV', { infer: true }),
      status: 'ok',
      releaseSha: this.config.get('RELEASE_SHA', { infer: true }) ?? null,
    };
  }
}
