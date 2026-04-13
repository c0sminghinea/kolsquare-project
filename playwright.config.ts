import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // Sequential — shared server, avoid race conditions
  forbidOnly: !!process.env.CI,
  retries: 2,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["junit", { outputFile: "test-results/results.xml" }],
  ],
  use: {
    baseURL: "https://kolsquare-qa.fly.dev",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "api",
      testDir: "./tests/api",
    },
    {
      name: "ui",
      testDir: "./tests/ui",
      use: {
        browserName: "chromium",
        screenshot: "only-on-failure",
        video: "on-first-retry",
      },
    },
  ],
});
