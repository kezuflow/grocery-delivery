import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  snapshotPathTemplate: "{testDir}/__snapshots__/{projectName}/{arg}{ext}",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "tablet",
      use: { viewport: { width: 820, height: 1180 } },
    },
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: [
    {
      command: "node e2e/fixture-api.mjs",
      port: 8790,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm exec next dev -p 3100",
      env: { ...process.env, API_BASE_URL: "http://127.0.0.1:8790", WEB_E2E_FIXTURES: "1" },
      port: 3100,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
