import { existsSync } from "fs";
import path from "path";

/**
 * Finds `apps/` for the monorepo (never a nested `.next/standalone/apps` tree).
 */
export function findMonorepoAppsDir(cwd = process.cwd()): string | null {
  let current = path.resolve(cwd);
  for (let i = 0; i < 10; i++) {
    const candidateApps = path.join(current, "apps");
    const outsideNext = !candidateApps.includes(`${path.sep}.next${path.sep}`);
    if (
      outsideNext &&
      existsSync(path.join(candidateApps, "backoffice", "package.json")) &&
      existsSync(path.join(candidateApps, "storefront", "package.json"))
    ) {
      return candidateApps;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

/**
 * Public dirs for assets that must be readable by both backoffice and
 * storefront (hero banners, brand logos, …).
 *
 * Covers:
 * - `next dev` cwd `apps/backoffice`
 * - PM2 standalone cwd `apps/backoffice/.next/standalone/apps/backoffice`
 *
 * Writes into source `public/` trees (survive rebuild) and live standalone
 * `public/` trees when present (what PM2 serves immediately).
 */
export function resolveDualAppPublicDirectories(
  publicSubpath: string,
  cwd = process.cwd(),
): string[] {
  const dirs: string[] = [];
  const seen = new Set<string>();
  const add = (dir: string) => {
    const normalized = path.normalize(dir);
    if (seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    dirs.push(normalized);
  };

  add(path.join(cwd, "public", publicSubpath));

  const appsDir = findMonorepoAppsDir(cwd);
  if (appsDir === null) {
    add(path.join(cwd, "..", "storefront", "public", publicSubpath));
    return dirs;
  }

  for (const app of ["backoffice", "storefront"] as const) {
    add(path.join(appsDir, app, "public", publicSubpath));
    add(
      path.join(
        appsDir,
        app,
        ".next",
        "standalone",
        "apps",
        app,
        "public",
        publicSubpath,
      ),
    );
  }

  return dirs;
}
