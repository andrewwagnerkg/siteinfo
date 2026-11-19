import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright runs against the production build served by `astro preview`.
 * Locally the site is built first; in CI the workflow builds it in a separate step.
 *
 * The site is served under BASE_PATH (default /siteinfo), so baseURL includes it.
 * In tests use relative paths without a leading slash: page.goto('ru/news/').
 */
const PORT = 4321;
const BASE_PATH = (process.env.BASE_PATH || '/siteinfo').replace(/\/+$/, '');
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}/`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: isCI ? `npm run preview -- --port ${PORT}` : `npm run build && npm run preview -- --port ${PORT}`,
    url: `http://localhost:${PORT}${BASE_PATH}/`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
