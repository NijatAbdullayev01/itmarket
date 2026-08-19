import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const RELOAD_DEBOUNCE_MS = 2_500;

let reloadTimer: ReturnType<typeof setTimeout> | null = null;

async function pm2ReloadOrRestart(appName: string): Promise<void> {
  try {
    await execFileAsync('pm2', ['reload', appName, '--update-env'], {
      timeout: 90_000,
    });
  } catch {
    await execFileAsync('pm2', ['restart', appName, '--update-env'], {
      timeout: 90_000,
    });
  }
}

/**
 * Next.js standalone snapshots `public/` at process start — files written after
 * boot soft-404 as HTML until the process reloads. Local catalog uploads must
 * bounce storefront (and backoffice for admin `<img>` previews).
 *
 * Debounced so gallery multi-upload only reloads once.
 */
export function scheduleReloadAppsForNewPublicAssets(): void {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  if (reloadTimer !== null) {
    clearTimeout(reloadTimer);
  }

  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    void reloadAppsForNewPublicAssets();
  }, RELOAD_DEBOUNCE_MS);
}

export async function reloadAppsForNewPublicAssets(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // Live stack uses PM2 even while API stays NODE_ENV=development (see
  // deploy/ecosystem.config.cjs).
  const storefrontApp =
    process.env.STOREFRONT_PM2_APP?.trim() || 'itmarket-storefront';
  const backofficeApp =
    process.env.BACKOFFICE_PM2_APP?.trim() || 'itmarket-backoffice';

  for (const appName of [storefrontApp, backofficeApp]) {
    try {
      await pm2ReloadOrRestart(appName);
    } catch {
      // Upload already persisted; operator can reload manually if needed.
    }
  }
}
