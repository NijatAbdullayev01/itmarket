import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function pm2ReloadOrRestart(appName: string): Promise<void> {
  try {
    await execFileAsync(
      "pm2",
      ["reload", appName, "--update-env"],
      { timeout: 90_000 },
    );
  } catch {
    await execFileAsync(
      "pm2",
      ["restart", appName, "--update-env"],
      { timeout: 90_000 },
    );
  }
}

/**
 * Next.js standalone snapshots `public/` at process start — files written after
 * boot are soft-404 HTML until the process reloads. Banner/brand uploads write
 * into standalone `public/` then bounce storefront + backoffice.
 */
export async function reloadStorefrontForNewPublicAssets(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const storefrontApp =
    process.env.STOREFRONT_PM2_APP?.trim() || "itmarket-storefront";
  const backofficeApp =
    process.env.BACKOFFICE_PM2_APP?.trim() || "itmarket-backoffice";

  for (const appName of [storefrontApp, backofficeApp]) {
    try {
      await pm2ReloadOrRestart(appName);
    } catch {
      // Upload already persisted; operator can reload manually if needed.
    }
  }
}
