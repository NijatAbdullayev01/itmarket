/**
 * Local `pnpm dev` binds the storefront/backoffice on 4010/4002 while the
 * shared `.env` still lists the canonical 3010/3002 stack. Mutations send
 * `Origin` from whichever of those the process resolved — allow both.
 */
const LOCAL_DEV_PORT_SIBLINGS: Readonly<Record<string, string>> = {
  '3010': '4010',
  '4010': '3010',
  '3002': '4002',
  '4002': '3002',
};

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function expandLocalDevOrigins(origin: string): string[] {
  const origins = new Set<string>([origin]);

  try {
    const url = new URL(origin);
    const hosts = new Set<string>([url.hostname]);
    if (url.hostname === 'localhost') {
      hosts.add('127.0.0.1');
    } else if (url.hostname === '127.0.0.1') {
      hosts.add('localhost');
    }

    const ports = new Set<string>([url.port]);
    const siblingPort = LOCAL_DEV_PORT_SIBLINGS[url.port];
    if (siblingPort !== undefined && isLoopbackHost(url.hostname)) {
      ports.add(siblingPort);
    }

    for (const hostname of hosts) {
      for (const port of ports) {
        const portSuffix = port.length > 0 ? `:${port}` : '';
        origins.add(`${url.protocol}//${hostname}${portSuffix}`);
      }
    }
  } catch {
    // Ignore invalid configured origins.
  }

  return [...origins];
}
