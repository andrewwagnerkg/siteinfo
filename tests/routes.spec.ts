import { expect, test } from '@playwright/test';
import { allRoutes, routeName } from './helpers';

/**
 * Every route from the site map opens in en, ru and ky, has the right
 * language, one h1, a title and a description.
 */
for (const route of allRoutes()) {
  test(`page opens: ${routeName(route)}`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status(), `HTTP status of ${route.pathname}`).toBe(200);
    expect(new URL(page.url()).pathname).toBe(route.pathname);

    await expect(page.locator('html')).toHaveAttribute('lang', route.lang);
    await expect(page.locator('h1'), 'exactly one h1').toHaveCount(1);
    await expect(page.locator('h1')).not.toBeEmpty();
    await expect(page.locator('body > header')).toHaveCount(1);
    await expect(page.locator('main#main')).toHaveCount(1);
    await expect(page.locator('body > footer')).toHaveCount(1);

    const title = await page.title();
    expect(title.trim().length, 'document title').toBeGreaterThan(0);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.trim().length ?? 0, 'meta description').toBeGreaterThan(0);
  });
}

test('page titles are unique within a language', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'viewport-independent, runs once');
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  for (const route of allRoutes()) {
    await page.goto(route.path);
    const key = `${route.lang}:${await page.title()}`;
    if (seen.has(key)) duplicates.push(`${route.pathname} duplicates ${seen.get(key)} (${key})`);
    else seen.set(key, route.pathname);
  }
  expect(duplicates).toEqual([]);
});
