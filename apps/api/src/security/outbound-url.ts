/**
 * Shared outbound URL guards (SSRF). Used for SEO LLM egress and similar
 * server-side fetches that must not target private/link-local/metadata hosts.
 */

const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./, // CGNAT 100.64/10
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

export function isBlockedOutboundHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (
    host.length === 0 ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.internal') ||
    host.includes('*') ||
    host.includes('/') ||
    host.includes(':')
  ) {
    return true;
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(host));
  }
  if (host.includes('::') || /^[0-9a-f:]+$/i.test(host)) {
    return true;
  }
  return false;
}

export type AssertSafeOutboundHttpsUrlOptions = {
  /** When set, hostname must be one of these (lowercase). */
  allowedHosts?: readonly string[];
  /** Optional allowlist of exact origin prefixes (scheme+host+optional path root). */
  requireHttps?: boolean;
};

/**
 * Validate a configured egress base URL before fetch. Throws Error with a
 * stable message for env validation / BadRequest mapping.
 */
export function assertSafeOutboundHttpsUrl(
  rawUrl: string,
  options: AssertSafeOutboundHttpsUrlOptions = {},
): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Outbound URL is not a valid absolute URL');
  }

  const requireHttps = options.requireHttps !== false;
  if (requireHttps && parsed.protocol !== 'https:') {
    throw new Error('Outbound URL must use https');
  }
  if (
    !requireHttps &&
    parsed.protocol !== 'https:' &&
    parsed.protocol !== 'http:'
  ) {
    throw new Error('Outbound URL must use http(s)');
  }
  if (parsed.username !== '' || parsed.password !== '') {
    throw new Error('Outbound URL must not include credentials');
  }
  if (parsed.hostname.length === 0) {
    throw new Error('Outbound URL hostname is required');
  }
  if (isBlockedOutboundHostname(parsed.hostname)) {
    throw new Error('Outbound URL hostname is not allowed');
  }
  if (
    options.allowedHosts !== undefined &&
    options.allowedHosts.length > 0 &&
    !options.allowedHosts.includes(parsed.hostname.toLowerCase())
  ) {
    throw new Error('Outbound URL host is not in the allowlist');
  }
  return parsed;
}

/** Default SEO LLM providers (OpenAI-compatible HTTPS APIs). */
export const SEO_AI_ALLOWED_HOSTS = [
  'generativelanguage.googleapis.com',
  'api.openai.com',
  'api.anthropic.com',
] as const;

export function assertSafeSeoAiBaseUrl(rawUrl: string): URL {
  return assertSafeOutboundHttpsUrl(rawUrl, {
    allowedHosts: SEO_AI_ALLOWED_HOSTS,
    requireHttps: true,
  });
}
