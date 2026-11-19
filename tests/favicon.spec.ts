import { expect, test, type Page } from '@playwright/test';
import { BASE_PATH, allRoutes, routeName } from './helpers';

/**
 * Favicon and Organization logo: links use the base path and point to files
 * that exist on the built site. Checked on every route (en, ru, ky) and on 404.
 */

const FAVICON = `${BASE_PATH}/favicon.png`;

async function expectFavicon(page: Page) {
  const icons = page.locator('head link[rel~="icon"]');
  await expect(icons, 'exactly one favicon link').toHaveCount(1);
  await expect(icons).toHaveAttribute('href', FAVICON);
  await expect(icons).toHaveAttribute('type', 'image/png');
  const response = await page.request.get(FAVICON.replace(`${BASE_PATH}/`, ''));
  expect(response.status(), `favicon ${FAVICON}`).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\/png/);
}

async function expectOrganizationLogo(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const logos: string[] = [];
  const collect = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(collect);
    if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (obj['@type'] === 'Organization' && typeof obj.logo === 'string') logos.push(obj.logo);
      Object.values(obj).forEach(collect);
    }
  };
  for (const text of blocks) collect(JSON.parse(text));
  expect(logos.length, 'Organization.logo present').toBeGreaterThan(0);
  for (const logo of logos) {
    const path = new URL(logo).pathname;
    expect(path.startsWith(`${BASE_PATH}/`), `logo under base path: ${path}`).toBe(true);
    const response = await page.request.get(path.replace(`${BASE_PATH}/`, ''));
    expect(response.status(), `Organization.logo ${path}`).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^image\//);
  }
}

for (const route of allRoutes()) {
  test(`${routeName(route)}: favicon and Organization logo exist`, async ({ page }) => {
    await page.goto(route.path);
    await expectFavicon(page);
    await expectOrganizationLogo(page);
  });
}

test('404 page: favicon link exists', async ({ page }) => {
  const response = await page.goto('this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expectFavicon(page);
});
