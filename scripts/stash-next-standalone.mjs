import {
  existsSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STALE_PREFIX = "standalone.stale.";

export function isDirInUseAsCwd(dir) {
  const target = resolve(dir);
  let procRoot;
  try {
    procRoot = readdirSync("/proc");
  } catch {
    return false;
  }

  for (const pid of procRoot) {
    if (!/^\d+$/.test(pid)) {
      continue;
    }
    try {
      const cwd = readlinkSync(join("/proc", pid, "cwd"));
      if (cwd === target || cwd.startsWith(`${target}/`)) {
        return true;
      }
    } catch {
      // Process exited or cwd is unreadable.
    }
  }
  return false;
}

/**
 * Live PM2 serves from `.next/standalone` and Next.js keeps writing
 * `.next/cache/fetch-cache` there. `rm -rf` / `fs.rmSync` then fail with
 * ENOTEMPTY because new files appear while the tree is being deleted.
 * Rename moves the inode aside so a fresh tree can occupy the live path.
 *
 * Stash siblings of `.next/standalone` into `../.next-stash/` (outside the
 * dist dir). `next build` recursively deletes distDir except top-level cache,
 * so a `standalone.stale.*` left inside `.next` is deleted mid-serve and the
 * same ENOTEMPTY race comes back.
 */
export function defaultStashParent(standaloneDir) {
  const target = resolve(standaloneDir);
  const distDir = dirname(target);
  const distName = basename(distDir);
  if (distName === ".next" || distName.startsWith(".next-")) {
    return join(dirname(distDir), ".next-stash");
  }
  return distDir;
}

export function stashStandaloneDir(dir, now = Date.now()) {
  const target = resolve(dir);
  if (!existsSync(target)) {
    return null;
  }

  const parent = defaultStashParent(target);
  mkdirSync(parent, { recursive: true });

  let stale = join(parent, `${STALE_PREFIX}${process.pid}.${now}`);
  let suffix = 0;
  while (existsSync(stale)) {
    suffix += 1;
    stale = join(parent, `${STALE_PREFIX}${process.pid}.${now}.${suffix}`);
  }

  renameSync(target, stale);
  return stale;
}

/**
 * Move a newly built standalone tree onto the live PM2 path. The running
 * server may recreate `toDir` via its absolute distDir (fetch-cache writes)
 * between stash and rename; retry until the swap sticks.
 */
export function promoteStandaloneDir(fromDir, toDir, now = Date.now()) {
  const from = resolve(fromDir);
  const to = resolve(toDir);
  if (!existsSync(from)) {
    throw new Error(`promoteStandaloneDir: missing ${from}`);
  }
  if (from === to) {
    return to;
  }

  mkdirSync(dirname(to), { recursive: true });

  let lastErr;
  for (let i = 0; i < 10; i += 1) {
    if (existsSync(to)) {
      stashStandaloneDir(to, now + i);
    }
    try {
      renameSync(from, to);
      return to;
    } catch (err) {
      lastErr = err;
      const code = err && typeof err === "object" ? err.code : undefined;
      if (code !== "EEXIST" && code !== "ENOTEMPTY" && code !== "ENOENT") {
        throw err;
      }
      Atomics.wait(
        new Int32Array(new SharedArrayBuffer(4)),
        0,
        0,
        50 * (i + 1),
      );
    }
  }

  throw lastErr;
}

export function listStaleStandaloneDirs(parentDir) {
  const parent = resolve(parentDir);
  if (!existsSync(parent)) {
    return [];
  }

  return readdirSync(parent)
    .filter((name) => name.startsWith(STALE_PREFIX))
    .map((name) => join(parent, name))
    .filter((path) => {
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    });
}

export function rmDirWithRetries(
  dir,
  { attempts = 8, delayMs = 150, maxRetries = 5 } = {},
) {
  const target = resolve(dir);
  if (!existsSync(target)) {
    return;
  }

  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      rmSync(target, {
        recursive: true,
        force: true,
        maxRetries,
        retryDelay: 100,
      });
      return;
    } catch (err) {
      lastErr = err;
      const code = err && typeof err === "object" ? err.code : undefined;
      if (code !== "ENOTEMPTY" && code !== "EBUSY" && code !== "ENOENT") {
        throw err;
      }
      if (code === "ENOENT") {
        return;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs * (i + 1));
    }
  }

  throw lastErr;
}

export function removeStaleStandaloneDir(dir, options) {
  const target = resolve(dir);
  if (!existsSync(target)) {
    return "missing";
  }
  if (isDirInUseAsCwd(target)) {
    return "busy";
  }
  rmDirWithRetries(target, options);
  return "removed";
}

export function purgeStaleStandaloneDirs(parentDir, options) {
  const removed = [];
  const busy = [];
  const failed = [];

  for (const stale of listStaleStandaloneDirs(parentDir)) {
    try {
      const status = removeStaleStandaloneDir(stale, options);
      if (status === "removed" || status === "missing") {
        removed.push(stale);
      } else {
        busy.push(stale);
      }
    } catch (err) {
      failed.push({ path: stale, err });
    }
  }

  return { removed, busy, failed };
}

function printUsage() {
  console.error(
    "usage: stash-next-standalone.mjs [--stash-only | --purge-stale] <path> [<path> ...]",
  );
}

function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes("-h") || argv.includes("--help")) {
    printUsage();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  const purge = argv.includes("--purge-stale");
  const stashOnly = argv.includes("--stash-only");
  const paths = argv.filter(
    (arg) => arg !== "--purge-stale" && arg !== "--stash-only",
  );
  if (paths.length === 0 || (purge && stashOnly)) {
    printUsage();
    process.exit(1);
  }

  if (purge) {
    let hadFailure = false;
    for (const parent of paths) {
      const result = purgeStaleStandaloneDirs(parent);
      for (const stale of result.removed) {
        console.log(`stash-next-standalone: removed ${stale}`);
      }
      for (const stale of result.busy) {
        console.warn(
          `stash-next-standalone: kept ${stale} (in use as process cwd; remove after PM2 reload)`,
        );
      }
      for (const { path, err } of result.failed) {
        hadFailure = true;
        console.error(
          `stash-next-standalone: could not remove ${path}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    if (hadFailure) {
      process.exit(1);
    }
    return;
  }

  for (const dir of paths) {
    if (basename(resolve(dir)) !== "standalone") {
      throw new Error(
        `stash-next-standalone: expected a standalone directory, got ${dir}`,
      );
    }
    const stashed = stashStandaloneDir(dir);
    if (!stashed) {
      continue;
    }
    if (stashOnly) {
      console.log(`stash-next-standalone: moved ${dir} -> ${stashed}`);
      continue;
    }
    try {
      const status = removeStaleStandaloneDir(stashed);
      if (status === "busy") {
        console.warn(
          `stash-next-standalone: kept ${stashed} (in use as process cwd; remove after PM2 reload)`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `stash-next-standalone: kept ${stashed} (${message}; remove after PM2 reload)`,
      );
    }
  }
}

const invokedDirectly =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main();
}
