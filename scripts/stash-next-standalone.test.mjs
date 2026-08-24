import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  defaultStashParent,
  isDirInUseAsCwd,
  listStaleStandaloneDirs,
  promoteStandaloneDir,
  purgeStaleStandaloneDirs,
  removeStaleStandaloneDir,
  stashStandaloneDir,
} from "./stash-next-standalone.mjs";

test("stashStandaloneDir is a no-op when the directory is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "standalone-stash-missing-"));
  try {
    assert.equal(stashStandaloneDir(join(root, "standalone")), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("stashStandaloneDir moves the tree so the original path is free", () => {
  const root = mkdtempSync(join(tmpdir(), "standalone-stash-move-"));
  const target = join(root, "standalone");
  try {
    const cache = join(target, "apps", "storefront", ".next", "cache", "fetch-cache");
    mkdirSync(cache, { recursive: true });
    writeFileSync(join(cache, "entry"), "cached");

    const stashed = stashStandaloneDir(target);
    assert.ok(stashed);
    assert.equal(existsSync(target), false);
    assert.equal(existsSync(join(stashed, "apps", "storefront", ".next", "cache", "fetch-cache", "entry")), true);
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "server.js"), "fresh\n");
    assert.equal(readdirSync(target).join(), "server.js");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("stashStandaloneDir succeeds while another process writes into the tree", async () => {
  const root = mkdtempSync(join(tmpdir(), "standalone-stash-busy-"));
  const target = join(root, "standalone");
  const cache = join(target, "apps", "storefront", ".next", "cache", "fetch-cache");
  mkdirSync(cache, { recursive: true });
  writeFileSync(join(cache, "keep"), "x");

  const writer = spawn(
    process.execPath,
    [
      "-e",
      `
        const { writeFileSync, mkdirSync } = require("node:fs");
        const dir = process.argv[1];
        mkdirSync(dir, { recursive: true });
        let i = 0;
        setInterval(() => {
          try {
            writeFileSync(dir + "/f" + i + ".tmp", "w");
            i += 1;
          } catch {}
        }, 5);
      `,
      cache,
    ],
    { stdio: "ignore" },
  );

  try {
    await new Promise((resolve) => setTimeout(resolve, 25));
    const stashed = stashStandaloneDir(target);
    assert.ok(stashed);
    assert.equal(existsSync(target), false);
    assert.ok(existsSync(stashed));
  } finally {
    writer.kill("SIGKILL");
    await new Promise((resolve) => {
      writer.once("exit", resolve);
    });
    rmSync(root, { recursive: true, force: true });
  }
});

test("purgeStaleStandaloneDirs removes stashed siblings and ignores the live tree", () => {
  const root = mkdtempSync(join(tmpdir(), "standalone-stash-purge-"));
  try {
    mkdirSync(join(root, "standalone"), { recursive: true });
    writeFileSync(join(root, "standalone", "server.js"), "live\n");
    const stale = join(root, "standalone.stale.1.2");
    mkdirSync(stale, { recursive: true });
    writeFileSync(join(stale, "old.js"), "old\n");

    assert.deepEqual(listStaleStandaloneDirs(root), [stale]);
    const result = purgeStaleStandaloneDirs(root);
    assert.deepEqual(result.removed, [stale]);
    assert.deepEqual(result.busy, []);
    assert.deepEqual(result.failed, []);
    assert.equal(existsSync(stale), false);
    assert.equal(existsSync(join(root, "standalone", "server.js")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("removeStaleStandaloneDir keeps a tree that is another process cwd", async () => {
  const root = mkdtempSync(join(tmpdir(), "standalone-stash-cwd-"));
  const stale = join(root, "standalone.stale.cwd");
  mkdirSync(stale, { recursive: true });

  const holder = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    cwd: stale,
    stdio: "ignore",
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(isDirInUseAsCwd(stale), true);
    assert.equal(removeStaleStandaloneDir(stale), "busy");
    assert.equal(existsSync(stale), true);
  } finally {
    holder.kill("SIGKILL");
    await new Promise((resolve) => {
      holder.once("exit", resolve);
    });
    rmSync(root, { recursive: true, force: true });
  }
});

test("stashStandaloneDir of .next/standalone lands in .next-stash", () => {
  const app = mkdtempSync(join(tmpdir(), "standalone-stash-outside-"));
  const target = join(app, ".next", "standalone");
  try {
    mkdirSync(join(target, "apps", "storefront"), { recursive: true });
    writeFileSync(join(target, "apps", "storefront", "server.js"), "live\n");

    const stashed = stashStandaloneDir(target);
    assert.ok(stashed);
    assert.equal(existsSync(target), false);
    assert.equal(defaultStashParent(target), join(app, ".next-stash"));
    assert.equal(stashed.startsWith(join(app, ".next-stash")), true);
    assert.equal(existsSync(join(app, ".next", "standalone")), false);
    assert.equal(existsSync(join(stashed, "apps", "storefront", "server.js")), true);
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
});

test("promoteStandaloneDir swaps a new tree onto the live path", () => {
  const app = mkdtempSync(join(tmpdir(), "standalone-promote-"));
  try {
    const live = join(app, ".next", "standalone");
    const built = join(app, ".next-build", "standalone");
    mkdirSync(join(live, "apps", "storefront"), { recursive: true });
    writeFileSync(join(live, "apps", "storefront", "server.js"), "old\n");
    mkdirSync(join(built, "apps", "storefront"), { recursive: true });
    writeFileSync(join(built, "apps", "storefront", "server.js"), "new\n");

    promoteStandaloneDir(built, live);
    assert.equal(existsSync(built), false);
    assert.equal(readFileSync(join(live, "apps", "storefront", "server.js"), "utf8"), "new\n");
    const stashed = listStaleStandaloneDirs(join(app, ".next-stash"));
    assert.equal(stashed.length, 1);
    assert.equal(
      readFileSync(join(stashed[0], "apps", "storefront", "server.js"), "utf8"),
      "old\n",
    );
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
});

test("promoteStandaloneDir retries when the live path is recreated", async () => {
  const app = mkdtempSync(join(tmpdir(), "standalone-promote-race-"));
  const live = join(app, ".next", "standalone");
  const built = join(app, ".next-build", "standalone");
  const cache = join(live, "apps", "storefront", ".next", "cache", "fetch-cache");
  mkdirSync(join(built, "apps", "storefront"), { recursive: true });
  writeFileSync(join(built, "apps", "storefront", "server.js"), "new\n");
  mkdirSync(cache, { recursive: true });
  writeFileSync(join(cache, "keep"), "x");

  const writer = spawn(
    process.execPath,
    [
      "-e",
      `
        const { mkdirSync, writeFileSync } = require("node:fs");
        const dir = process.argv[1];
        let i = 0;
        setInterval(() => {
          try {
            mkdirSync(dir, { recursive: true });
            writeFileSync(dir + "/f" + i + ".tmp", "w");
            i += 1;
          } catch {}
        }, 5);
      `,
      cache,
    ],
    { stdio: "ignore" },
  );

  try {
    await new Promise((resolve) => setTimeout(resolve, 25));
    promoteStandaloneDir(built, live);
    assert.equal(existsSync(built), false);
    assert.equal(
      readFileSync(join(live, "apps", "storefront", "server.js"), "utf8"),
      "new\n",
    );
  } finally {
    writer.kill("SIGKILL");
    await new Promise((resolve) => {
      writer.once("exit", resolve);
    });
    rmSync(app, { recursive: true, force: true });
  }
});
