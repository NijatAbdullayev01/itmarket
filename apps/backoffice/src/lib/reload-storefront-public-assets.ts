import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Next.js standalone snapshots `public/` at process start — files written after
 * boot are soft-404 HTML until the storefront process reloads.
 */
export async function reloadStorefrontForNewPublicAssets(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const appName =
    process.env.STOREFRONT_PM2_APP?.trim() || "itmarket-storefront";

  try {
    await execFileAsync(
      "pm2",
      ["reload", appName, "--update-env"],
      { timeout: 90_000 },
    );
  } catch {
    try {
      await execFileAsync(
        "pm2",
        ["restart", appName, "--update-env"],
        { timeout: 90_000 },
      );
    } catch {
      // Upload already persisted; operator can reload manually if needed.
    }
  }
}
