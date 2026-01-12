import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment after running: npx playwright install firefox webkit
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  // Use webServer only if servers aren't already running
  // For manual server management, use: npm run test:e2e:with-servers
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true, // Always reuse - use start-e2e-servers.sh to start manually
      timeout: 30 * 1000,
    },
    {
      command: 'cd ../backend && DATABASE_URL=file:./e2e-test.db JWT_SECRET=test-secret PORT=3000 node dist/src/main.js',
      url: 'http://localhost:3000/api/v1/health',
      reuseExistingServer: true, // Always reuse - use start-e2e-servers.sh to start manually
      timeout: 30 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
