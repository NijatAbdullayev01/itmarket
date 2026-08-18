import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Next.js `output: "standalone"` traces the server into `.next/standalone`
 * but does not copy `.next/static` or `public`. Without those, `/_next/static/*`
 * is handled as an app route and returns HTML (`text/html`) — browsers then
 * refuse the stylesheet (`nosniff`) and the storefront renders unstyled.
 */
export function findStandaloneServerDir(standaloneRoot) {
  if (!existsSync(standaloneRoot)) {
    return null;
  }

  const stack = [standaloneRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = readdirSync(dir, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && entry.name === "server.js")) {
      return dir;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "node_modules") {
        continue;
      }
      stack.push(join(dir, entry.name));
    }
  }
  return null;
}

export function copyNextStandaloneAssets(appRoot = process.cwd()) {
  const root = resolve(appRoot);
  const staticSrc = join(root, ".next/static");
  const publicSrc = join(root, "public");
  const standaloneRoot = join(root, ".next/standalone");

  if (!existsSync(staticSrc)) {
    throw new Error(`copy-next-standalone-assets: missing ${staticSrc}`);
  }
  if (!existsSync(standaloneRoot)) {
    throw new Error(
      `copy-next-standalone-assets: missing ${standaloneRoot} (output: "standalone" required)`,
    );
  }

  const serverDir = findStandaloneServerDir(standaloneRoot);
  if (!serverDir) {
    throw new Error(
      "copy-next-standalone-assets: server.js not found under .next/standalone",
    );
  }

  const staticDest = join(serverDir, ".next", "static");
  mkdirSync(join(serverDir, ".next"), { recursive: true });
  rmSync(staticDest, { recursive: true, force: true });
  cpSync(staticSrc, staticDest, { recursive: true });

  if (existsSync(publicSrc)) {
    const publicDest = join(serverDir, "public");
    mkdirSync(publicDest, { recursive: true });
    cpSync(publicSrc, publicDest, { recursive: true });
  }

  return { serverDir, staticDest };
}

const invokedDirectly =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const result = copyNextStandaloneAssets(process.cwd());
  console.log(
    `copy-next-standalone-assets: copied .next/static (+public) -> ${result.serverDir}`,
  );
}
