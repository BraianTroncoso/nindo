import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests run against the real static export in out/, not the dev server —
 * that is the artefact Vercel serves, so that is what we check.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.artifacts",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    ...devices["Desktop Chrome"],
    // Locally, use the Chrome already installed rather than downloading a
    // second browser. CI installs Playwright's own chromium, so let it use that.
    channel: process.env.CI ? undefined : "chrome",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npx serve out -l 4173 --single",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
