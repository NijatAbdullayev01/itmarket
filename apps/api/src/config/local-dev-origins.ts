export function expandLocalDevOrigins(origin: string): string[] {
  const origins = new Set<string>([origin]);

  try {
    const url = new URL(origin);
    const portSuffix = url.port ? `:${url.port}` : '';

    if (url.hostname === 'localhost') {
      origins.add(`${url.protocol}//127.0.0.1${portSuffix}`);
    } else if (url.hostname === '127.0.0.1') {
      origins.add(`${url.protocol}//localhost${portSuffix}`);
    }
  } catch {
    // Ignore invalid configured origins.
  }

  return [...origins];
}
