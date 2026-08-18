import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import {
  findMonorepoAppsDir,
  resolveDualAppPublicDirectories,
} from "./resolve-dual-app-public-dirs";

describe("resolveDualAppPublicDirectories", () => {
  const root = mkdtempSync(path.join(tmpdir(), "itmarket-dual-public-"));

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("finds monorepo apps from apps/backoffice cwd", () => {
    const apps = path.join(root, "apps");
    mkdirSync(path.join(apps, "backoffice"), { recursive: true });
    mkdirSync(path.join(apps, "storefront"), { recursive: true });
    writeFileSync(path.join(apps, "backoffice", "package.json"), "{}");
    writeFileSync(path.join(apps, "storefront", "package.json"), "{}");

    const boCwd = path.join(apps, "backoffice");
    expect(findMonorepoAppsDir(boCwd)).toBe(apps);

    const dirs = resolveDualAppPublicDirectories("images/hero", boCwd);
    expect(dirs).toContain(path.join(boCwd, "public", "images", "hero"));
    expect(dirs).toContain(
      path.join(apps, "storefront", "public", "images", "hero"),
    );
    expect(dirs).toContain(
      path.join(
        apps,
        "storefront",
        ".next",
        "standalone",
        "apps",
        "storefront",
        "public",
        "images",
        "hero",
      ),
    );
  });

  it("finds monorepo apps from standalone backoffice cwd", () => {
    const apps = path.join(root, "apps");
    mkdirSync(path.join(apps, "backoffice"), { recursive: true });
    mkdirSync(path.join(apps, "storefront"), { recursive: true });
    writeFileSync(path.join(apps, "backoffice", "package.json"), "{}");
    writeFileSync(path.join(apps, "storefront", "package.json"), "{}");

    const standaloneBo = path.join(
      apps,
      "backoffice",
      ".next",
      "standalone",
      "apps",
      "backoffice",
    );
    mkdirSync(standaloneBo, { recursive: true });
    // Phantom sibling that used to steal uploads — must not win.
    mkdirSync(
      path.join(
        apps,
        "backoffice",
        ".next",
        "standalone",
        "apps",
        "storefront",
        "public",
      ),
      { recursive: true },
    );

    expect(findMonorepoAppsDir(standaloneBo)).toBe(apps);

    const dirs = resolveDualAppPublicDirectories("images/hero", standaloneBo);
    expect(dirs).toContain(path.join(standaloneBo, "public", "images", "hero"));
    expect(dirs).toContain(
      path.join(
        apps,
        "storefront",
        ".next",
        "standalone",
        "apps",
        "storefront",
        "public",
        "images",
        "hero",
      ),
    );
    expect(
      dirs.some((dir) =>
        dir.includes(
          `${path.sep}backoffice${path.sep}.next${path.sep}standalone${path.sep}apps${path.sep}storefront${path.sep}`,
        ),
      ),
    ).toBe(false);
  });
});
