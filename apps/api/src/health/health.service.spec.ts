import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';
import type { PrismaService } from '../infrastructure/prisma/prisma.service';
import type { RedisService } from '../infrastructure/redis/redis.service';

describe('HealthService', () => {
  it('reports readiness only when both dependencies respond', async () => {
    const prisma = { isHealthy: jest.fn().mockResolvedValue(true) };
    const redis = { ping: jest.fn().mockResolvedValue(true) };
    const service = new HealthService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );

    await expect(service.readiness()).resolves.toEqual({
      status: 'ready',
      dependencies: { database: 'up', redis: 'up' },
    });
  });

  it('fails readiness when a dependency is down', async () => {
    const prisma = { isHealthy: jest.fn().mockResolvedValue(false) };
    const redis = { ping: jest.fn().mockResolvedValue(true) };
    const service = new HealthService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );

    await expect(service.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
