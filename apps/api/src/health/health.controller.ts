import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  @ApiOkResponse({ description: 'The API process is alive' })
  liveness(): { status: 'ok' } {
    return this.health.liveness();
  }

  @Get('ready')
  @ApiOkResponse({ description: 'PostgreSQL and Redis are reachable' })
  @ApiServiceUnavailableResponse({
    description: 'At least one required dependency is unavailable',
  })
  readiness(): Promise<{
    status: 'ready';
    dependencies: { database: 'up' | 'down'; redis: 'up' | 'down' };
  }> {
    return this.health.readiness();
  }
}
