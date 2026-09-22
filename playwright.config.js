const { defineConfig } = require("@playwright/test");

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8081";
const serverURL = new URL(baseURL);
const externalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1";
if (!externalServer && (serverURL.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(serverURL.hostname))) {
  throw new Error("Use a loopback HTTP URL, or explicitly set PLAYWRIGHT_EXTERNAL_SERVER=1");
}
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

module.exports = defineConfig({
  testDir: "./tests/ui",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 2 : undefined,
  outputDir: "test-results",
  use: {
    baseURL,
    headless: true,
    colorScheme: "light",
    viewport: { width: 1440, height: 1400 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  webServer: externalServer
    ? undefined
    : {
        command: `python3 .github/scripts/serve_site.py --port ${serverURL.port || 80} --host ${serverURL.hostname}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 15_000,
      },
  reporter: process.env.CI ? "github" : "list",
});
