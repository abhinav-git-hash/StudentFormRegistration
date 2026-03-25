// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 0, // No global timeout - lessons may take any amount of time
  use: {
    browserName: 'chromium',
    headless: false, // Always visible so the user can interact
    viewport: { width: 1280, height: 800 },
    storageState: 'storageState.json',
  },
  projects: [
    {
      name: 'bharat-english',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
