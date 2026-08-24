import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { copyNextStandaloneAssets } from "./copy-next-standalone-assets.mjs";
import { promoteStandaloneDir } from "./stash-next-standalone.mjs";

export const BUILD_DIST_DIR_DEFAULT = ".next-build";
export const LIVE_STANDALONE_DIR = ".next/standalone";

export function resolveBuildDistDir(env = process.env) {
  const raw = env.NEXT_DIST_DIR?.trim();
  const distDir = raw && raw.length > 0 ? raw : BUILD_DIST_DIR_DEFAULT;
  if (distDir.startsWith("/") || distDir.includes("..") || distDir.includes("\\")) {
    throw new Error(`NEXT_DIST_DIR must be a relative directory, got ${distDir}`);
  }
  return distDir;
}

function nextBin(appRoot) {
  const candidates = [
    join(appRoot, "node_modules", ".bin", "next"),
    join(appRoot, "..", "..", "node_modules", ".bin", "next"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return "next";
}

export function buildNextStandalone(appRoot = process.cwd(), env = process.env) {
  const root = resolve(appRoot);
  const distDir = resolveBuildDistDir(env);
  const childEnv = { ...env, NEXT_DIST_DIR: distDir };

  console.log(`build-next-standalone: next build (distDir=${distDir})`);
  const build = spawnSync(nextBin(root), ["build"], {
    cwd: root,
    env: childEnv,
    stdio: "inherit",
  });
  if (build.error) {
    throw build.error;
  }
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }

  const copied = copyNextStandaloneAssets(root, { distDir });
  console.log(
    `build-next-standalone: copied ${distDir}/static (+public) -> ${copied.serverDir}`,
  );

  const builtStandalone = join(root, distDir, "standalone");
  const liveStandalone = join(root, LIVE_STANDALONE_DIR);
  if (resolve(builtStandalone) === resolve(liveStandalone)) {
    return { distDir, liveStandalone, promoted: false };
  }

  promoteStandaloneDir(builtStandalone, liveStandalone);
  console.log(
    `build-next-standalone: promoted ${builtStandalone} -> ${liveStandalone}`,
  );
  return { distDir, liveStandalone, promoted: true };
}

const invokedDirectly =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  buildNextStandalone(process.cwd());
}
