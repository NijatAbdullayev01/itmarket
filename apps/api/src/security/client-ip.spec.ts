import express from 'express';
import request from 'supertest';

import { getClientIp } from './client-ip';

describe('getClientIp', () => {
  it('returns unknown when ip and socket are missing', () => {
    expect(getClientIp({})).toBe('unknown');
  });

  it('prefers request.ip over socket remoteAddress', () => {
    expect(
      getClientIp({
        ip: '203.0.113.10',
        socket: { remoteAddress: '127.0.0.1' },
      }),
    ).toBe('203.0.113.10');
  });

  it('normalizes IPv4-mapped IPv6', () => {
    expect(getClientIp({ ip: '::ffff:203.0.113.11' })).toBe('203.0.113.11');
  });

  it('ignores X-Forwarded-For when trust proxy hops are 0', async () => {
    const app = express();
    app.set('trust proxy', 0);
    app.get('/ip', (req, res) => {
      res.json({ ip: getClientIp(req) });
    });

    const response = await request(app)
      .get('/ip')
      .set('X-Forwarded-For', '203.0.113.9');

    expect((response.body as { ip: string }).ip).not.toBe('203.0.113.9');
  });

  it('uses the trusted hop from X-Forwarded-For when hops are 1', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.get('/ip', (req, res) => {
      res.json({ ip: getClientIp(req) });
    });

    const response = await request(app)
      .get('/ip')
      .set('X-Forwarded-For', '203.0.113.9');

    expect((response.body as { ip: string }).ip).toBe('203.0.113.9');
  });

  it('does not let forged left XFF entries win when hops are 1', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.get('/ip', (req, res) => {
      res.json({ ip: getClientIp(req) });
    });

    // Rightmost hop is the one Express trusts with hops=1 (proxy-appended).
    const response = await request(app)
      .get('/ip')
      .set('X-Forwarded-For', '198.51.100.1, 203.0.113.9');

    expect((response.body as { ip: string }).ip).toBe('203.0.113.9');
  });
});
