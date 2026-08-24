import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BUILD_DIST_DIR_DEFAULT,
  resolveBuildDistDir,
} from "./build-next-standalone.mjs";

test("resolveBuildDistDir defaults to .next-build so live .next/standalone is untouched", () => {
  assert.equal(resolveBuildDistDir({}), BUILD_DIST_DIR_DEFAULT);
  assert.equal(resolveBuildDistDir({ NEXT_DIST_DIR: "" }), BUILD_DIST_DIR_DEFAULT);
  assert.equal(resolveBuildDistDir({ NEXT_DIST_DIR: " .next-build " }), ".next-build");
});

test("resolveBuildDistDir rejects absolute and parent paths", () => {
  assert.throws(() => resolveBuildDistDir({ NEXT_DIST_DIR: "/tmp/out" }), /relative/);
  assert.throws(() => resolveBuildDistDir({ NEXT_DIST_DIR: "../out" }), /relative/);
});
