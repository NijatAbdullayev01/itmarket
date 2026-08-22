import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("loadMonorepoEnv", () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    vi.resetModules();
  });

  it("does not fill .env 3010 origin when parallel-dev API_ORIGIN is already 4000", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sf-env-parallel-"));
    writeFileSync(
      join(dir, ".env"),
      [
        "API_ORIGIN=http://localhost:3001",
        "STOREFRONT_ORIGIN=http://localhost:3010",
        "BACKOFFICE_ORIGIN=http://localhost:3002",
        "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1",
        "TWITTER_SITE=@from-file",
      ].join("\n"),
      "utf8",
    );
    process.chdir(dir);
    (process.env as Record<string, string | undefined>).NODE_ENV =
      "development";
    process.env.API_ORIGIN = "http://localhost:4000";
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000/api/v1";
    delete process.env.STOREFRONT_ORIGIN;
    delete process.env.BACKOFFICE_ORIGIN;

    const { loadMonorepoEnv } = await import("./load-env");
    loadMonorepoEnv();

    expect(process.env.API_ORIGIN).toBe("http://localhost:4000");
    expect(process.env.STOREFRONT_ORIGIN).toBe("http://localhost:4010");
    expect(process.env.BACKOFFICE_ORIGIN).toBe("http://localhost:4002");
    expect(process.env.NEXT_PUBLIC_API_URL).toBe(
      "http://localhost:4000/api/v1",
    );
    expect(process.env.TWITTER_SITE).toBe("@from-file");
  });
});
