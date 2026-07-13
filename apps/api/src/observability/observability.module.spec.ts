import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { MetricsService } from './observability.module';

describe('MetricsService', () => {
  it('exports bounded HTTP labels and operational gauges', async () => {
    const createdAt = new Date(Date.now() - 5_000);
    const prisma = {
      payment: {
        count: jest.fn().mockResolvedValue(2),
        findFirst: jest.fn().mockResolvedValue({ createdAt }),
      },
      stockReservation: {
        count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1),
      },
      notificationOutbox: {
        count: jest.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(1),
        findFirst: jest.fn().mockResolvedValue({ createdAt }),
      },
    } as unknown as PrismaService;
    const metrics = new MetricsService(prisma);

    metrics.observeRequest('get', 200, 0.08);
    metrics.observeRequest('get', 404, 0.5);

    const output = await metrics.render();

    expect(output).toContain(
      'itmarket_http_requests_total{method="GET",status_class="2xx"} 1',
    );
    expect(output).toContain('itmarket_pending_payments 2');
    expect(output).toContain(
      'itmarket_expired_active_inventory_reservations 1',
    );
    expect(output).toContain('itmarket_notification_jobs{status="failed"} 1');
    expect(output).not.toContain('path=');
  });
});
