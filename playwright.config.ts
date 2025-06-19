import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  outputDir: 'test-results/',
  
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'security-tests',
      testMatch: /.*security\.spec\.ts/,
    },
    {
      name: 'unit-tests',
      testMatch: /.*\.spec\.ts/,
      testIgnore: /.*security\.spec\.ts/,
    },
  ],
}); 