const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/ui",
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8080",
    headless: true,
    viewport: { width: 1440, height: 1400 },
  },
  reporter: process.env.CI ? "github" : "list",
});
