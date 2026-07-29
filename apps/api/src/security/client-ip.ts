import type { Request } from 'express';

export type ClientIpRequest = {
  ip?: string | undefined;
  socket?: { remoteAddress?: string | null | undefined } | undefined;
};

/**
 * Client IP for rate limits and audit. Relies only on Express `trust proxy`
 * (see TRUST_PROXY_HOPS) — never parse vendor headers (CF-Connecting-IP, etc.).
 */
export function getClientIp(request: ClientIpRequest): string {
  const raw =
    (typeof request.ip === 'string' && request.ip.trim() !== ''
      ? request.ip.trim()
      : undefined) ??
    (typeof request.socket?.remoteAddress === 'string' &&
    request.socket.remoteAddress.trim() !== ''
      ? request.socket.remoteAddress.trim()
      : undefined);

  if (raw === undefined) {
    return 'unknown';
  }

  // Express may yield IPv4-mapped IPv6 (:ffff:203.0.113.9).
  if (raw.startsWith('::ffff:')) {
    return raw.slice('::ffff:'.length);
  }

  return raw;
}

/** Typed convenience for Nest/Express Request. */
export function getClientIpFromRequest(request: Request): string {
  return getClientIp(request);
}
