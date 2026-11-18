import { defineConfig } from "@playwright/test";
const env = {
  SERVINEXO_VITE_CACHE: "e2e",
  SERVINEXO_WEB_ORIGIN: "http://127.0.0.1:5194",
  SERVINEXO_CONTRACTOR_ORIGIN: "http://127.0.0.1:5195",
  SERVINEXO_ADMIN_ORIGIN: "http://127.0.0.1:5196",
  SERVINEXO_API_ORIGIN: "http://127.0.0.1:5197",
  SERVINEXO_API_PORT: "5197",
  SERVINEXO_STATE_FILE: ".artifacts/e2e-state.json",
};
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  use: {
    baseURL: env.SERVINEXO_WEB_ORIGIN,
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  },
  webServer: [
    {
      command: "npm run dev:api",
      url: env.SERVINEXO_API_ORIGIN + "/health",
      env,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev:web -- --port 5194 --strictPort",
      url: env.SERVINEXO_WEB_ORIGIN,
      env,
      reuseExistingServer: false,
    },
    {
      command:
        "npm run dev --workspace @servinexo/contractor -- --port 5195 --strictPort",
      url: env.SERVINEXO_CONTRACTOR_ORIGIN,
      env,
      reuseExistingServer: false,
    },
    {
      command:
        "npm run dev --workspace @servinexo/admin -- --port 5196 --strictPort",
      url: env.SERVINEXO_ADMIN_ORIGIN,
      env,
      reuseExistingServer: false,
    },
  ],
});
