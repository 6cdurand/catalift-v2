import { defineConfig, devices } from "@playwright/test";
import { E2E_AUTH_BYPASS, E2E_JWT_SECRET } from "./tests/e2e/auth-helpers";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // Enable the proxy's e2e auth bridge so the SERVER-side gate can verify the
    // Playwright mock session. These are dev-only: src/proxy.ts hard-disables
    // the bridge whenever NODE_ENV === "production".
    env: {
      E2E_AUTH_BYPASS,
      E2E_JWT_SECRET,
    },
  },
});
