import { defineConfig, devices } from "@playwright/test";

const port = 5177;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /docs-shots\.spec\.ts$/,
    },
    {
      name: "docs-shots",
      testMatch: /docs-shots\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], screenshot: "off" },
    },
    {
      name: "docs-shots-mobile",
      testMatch: /docs-shots\.spec\.ts$/,
      use: { ...devices["Pixel 5"], screenshot: "off" },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter demo dev",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter demo-vue dev",
      url: "http://127.0.0.1:5178",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
