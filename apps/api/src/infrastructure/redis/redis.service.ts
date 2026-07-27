import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import type { Environment } from '../../config/environment';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly client: Redis;
  private readonly redisUrl: string;
  private subscriber: Redis | null = null;
  private readonly channelHandlers = new Map<
    string,
    Set<(message: string) => void>
  >();

  constructor(config: ConfigService<Environment, true>) {
    this.redisUrl = config.get('REDIS_URL', { infer: true });
    this.client = new Redis(this.redisUrl, {
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

  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.ensureConnected();
      await this.client.publish(channel, message);
    } catch {
      // Live fan-out is best-effort; persistence still succeeds via Postgres.
    }
  }

  async subscribe(
    channel: string,
    handler: (message: string) => void,
  ): Promise<() => Promise<void>> {
    const handlers = this.channelHandlers.get(channel) ?? new Set();
    handlers.add(handler);
    this.channelHandlers.set(channel, handlers);

    await this.ensureSubscriber();
    if (handlers.size === 1 && this.subscriber !== null) {
      await this.subscriber.subscribe(channel);
    }

    return async () => {
      const current = this.channelHandlers.get(channel);
      if (current === undefined) {
        return;
      }
      current.delete(handler);
      if (current.size > 0) {
        return;
      }
      this.channelHandlers.delete(channel);
      if (this.subscriber !== null) {
        await this.subscriber.unsubscribe(channel).catch(() => undefined);
      }
    };
  }

  private async ensureSubscriber(): Promise<void> {
    if (this.subscriber !== null) {
      if (
        this.subscriber.status === 'wait' ||
        this.subscriber.status === 'end'
      ) {
        await this.subscriber.connect();
      }
      return;
    }

    this.subscriber = new Redis(this.redisUrl, {
      lazyConnect: true,
      connectTimeout: 2_000,
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
    });
    this.subscriber.on('error', () => undefined);
    this.subscriber.on('message', (channel, message) => {
      const handlers = this.channelHandlers.get(channel);
      if (handlers === undefined) {
        return;
      }
      for (const handler of handlers) {
        handler(message);
      }
    });
    await this.subscriber.connect();
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

  async putOnce(key: string, ttlMs: number): Promise<void> {
    await this.ensureConnected();
    await this.client.set(key, '1', 'PX', ttlMs);
  }

  /** Returns true when the key existed and was deleted (first consumer wins). */
  async consumeOnce(key: string): Promise<boolean> {
    try {
      await this.ensureConnected();
      return (await this.client.del(key)) === 1;
    } catch {
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.subscriber !== null) {
      if (this.subscriber.status === 'ready') {
        await this.subscriber.quit().catch(() => undefined);
      } else {
        this.subscriber.disconnect();
      }
      this.subscriber = null;
    }
    if (this.client.status === 'ready') {
      await this.client.quit();
      return;
    }
    this.client.disconnect();
  }
}
