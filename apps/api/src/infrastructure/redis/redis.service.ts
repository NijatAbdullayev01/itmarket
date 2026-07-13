import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import type { Environment } from '../../config/environment';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly client: Redis;

  constructor(config: ConfigService<Environment, true>) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      connectTimeout: 2_000,
      commandTimeout: 2_000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    this.client.on('error', () => undefined);
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status === 'wait' || this.client.status === 'end') {
      await this.client.connect();
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.ensureConnected();
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async withLease<T>(
    key: string,
    ttlMs: number,
    task: () => Promise<T>,
  ): Promise<{ acquired: boolean; result?: T }> {
    await this.ensureConnected();
    const token = randomUUID();
    const acquired = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    if (acquired !== 'OK') {
      return { acquired: false };
    }
    try {
      return {
        acquired: true,
        result: await task(),
      };
    } finally {
      await this.client
        .eval(
          `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            end
            return 0
          `,
          1,
          key,
          token,
        )
        .catch(() => undefined);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.status === 'ready') {
      await this.client.quit();
      return;
    }
    this.client.disconnect();
  }
}
