import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  copyNextStandaloneAssets,
  findStandaloneServerDir,
} from "./copy-next-standalone-assets.mjs";

test("findStandaloneServerDir locates nested monorepo server.js", () => {
  const root = mkdtempSync(join(tmpdir(), "standalone-find-"));
  try {
    const serverDir = join(root, "apps", "storefront");
    mkdirSync(serverDir, { recursive: true });
    writeFileSync(join(serverDir, "server.js"), "export {};\n");
    assert.equal(findStandaloneServerDir(root), serverDir);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("copyNextStandaloneAssets copies css into standalone .next/static", () => {
  const appRoot = mkdtempSync(join(tmpdir(), "standalone-copy-"));
  try {
    const cssRel = join("chunks", "app.css");
    mkdirSync(join(appRoot, ".next", "static", "chunks"), { recursive: true });
    writeFileSync(join(appRoot, ".next", "static", cssRel), "body{color:red}");
    mkdirSync(join(appRoot, "public"), { recursive: true });
    writeFileSync(join(appRoot, "public", "favicon.png"), "png");

    const serverDir = join(appRoot, ".next", "standalone", "apps", "storefront");
    mkdirSync(serverDir, { recursive: true });
    writeFileSync(join(serverDir, "server.js"), "export {};\n");

    const result = copyNextStandaloneAssets(appRoot, { distDir: ".next" });
    assert.equal(result.serverDir, serverDir);
    assert.equal(
      readFileSync(join(serverDir, ".next", "static", cssRel), "utf8"),
      "body{color:red}",
    );
    assert.equal(readFileSync(join(serverDir, "public", "favicon.png"), "utf8"), "png");
  } finally {
    rmSync(appRoot, { recursive: true, force: true });
  }
});

test("copyNextStandaloneAssets uses NEXT_DIST_DIR for inner static path", () => {
  const appRoot = mkdtempSync(join(tmpdir(), "standalone-copy-dist-"));
  try {
    const cssRel = join("chunks", "app.css");
    mkdirSync(join(appRoot, ".next-build", "static", "chunks"), { recursive: true });
    writeFileSync(join(appRoot, ".next-build", "static", cssRel), "body{color:navy}");

    const serverDir = join(appRoot, ".next-build", "standalone", "apps", "storefront");
    mkdirSync(serverDir, { recursive: true });
    writeFileSync(join(serverDir, "server.js"), "export {};\n");

    const result = copyNextStandaloneAssets(appRoot, { distDir: ".next-build" });
    assert.equal(result.serverDir, serverDir);
    assert.equal(
      readFileSync(join(serverDir, ".next-build", "static", cssRel), "utf8"),
      "body{color:navy}",
    );
  } finally {
    rmSync(appRoot, { recursive: true, force: true });
  }
});
