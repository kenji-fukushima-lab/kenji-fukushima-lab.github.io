const { defineConfig } = require("@playwright/test");

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

module.exports = defineConfig({
  testDir: "./tests/ui",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 2 : undefined,
  outputDir: "test-results",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8080",
    headless: true,
    viewport: { width: 1440, height: 1400 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  webServer: {
    command: "python3 -m http.server 8080 --directory _site",
    url: "http://127.0.0.1:8080/",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
  reporter: process.env.CI ? "github" : "list",
});
