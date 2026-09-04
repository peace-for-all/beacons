import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4187",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npm run start -- --host 127.0.0.1 --port 4187",
    url: "http://127.0.0.1:4187/ru",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
