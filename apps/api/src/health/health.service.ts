import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { RedisService } from '../infrastructure/redis/redis.service';

interface DependencyStatus {
  database: 'up' | 'down';
  redis: 'up' | 'down';
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  async readiness(): Promise<{
    status: 'ready';
    dependencies: DependencyStatus;
  }> {
    const [databaseHealthy, redisHealthy] = await Promise.all([
      this.prisma.isHealthy(),
      this.redis.ping(),
    ]);
    const dependencies: DependencyStatus = {
      database: databaseHealthy ? 'up' : 'down',
      redis: redisHealthy ? 'up' : 'down',
    };

    if (!databaseHealthy || !redisHealthy) {
      throw new ServiceUnavailableException({
        code: 'DEPENDENCIES_UNAVAILABLE',
        message: 'Service dependencies are unavailable',
        details: {
          status: 'not_ready',
          dependencies,
        },
      });
    }

    return { status: 'ready', dependencies };
  }
}
