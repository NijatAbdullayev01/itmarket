import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["line"]] : "line",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "pnpm --filter @itmarket/storefront exec next dev --port 3100 --hostname 127.0.0.1",
      url: "http://127.0.0.1:3100/cart",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter @itmarket/backoffice exec next dev --port 3102 --hostname 127.0.0.1",
      url: "http://127.0.0.1:3102",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "storefront-chromium",
      testMatch: /storefront\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:3100",
      },
    },
    {
      name: "backoffice-chromium",
      testMatch: /backoffice\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:3102",
      },
    },
  ],
});
