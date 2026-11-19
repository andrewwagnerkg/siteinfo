import { expect, test } from '@playwright/test';
import { layoutProblems, smallTouchTargets } from './checks';
import { WIDTHS, allRoutes, routeName } from './helpers';

/**
 * Responsive checks from docs/design-system.md («Адаптивность») on
 * 360, 390, 768, 1024, 1280 and 1920 px. The sweep sets the viewport itself, so it
 * runs once per page (desktop project). Touch targets are checked on phone widths.
 *
 * Note: body has `overflow-x: hidden`, which hides a horizontal scrollbar but not
 * the problem itself. So we check both the document scroll width and the
 * bounding boxes of all elements.
 */

for (const route of allRoutes()) {
  test(`responsive layout: ${routeName(route)}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'width sweep runs once per page');
    const report: string[] = [];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route.path);
      for (const p of await layoutProblems(page)) report.push(`${width}px [${p.kind}] ${p.detail}`);
      // Menu open must not break the layout either.
      const toggle = page.locator('#menu-toggle');
      if (await toggle.isVisible()) {
        await toggle.click();
        for (const p of await layoutProblems(page)) report.push(`${width}px menu open [${p.kind}] ${p.detail}`);
      }
      if (width <= 390) {
        for (const t of await smallTouchTargets(page)) report.push(`${width}px [touch target < 44x44] ${t}`);
      }
    }
    expect(report).toEqual([]);
  });
}

test('landscape phone 740x360: no horizontal overflow on home pages', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'runs once');
  await page.setViewportSize({ width: 740, height: 360 });
  const report: string[] = [];
  for (const path of ['./', 'ru/', 'ky/']) {
    await page.goto(path);
    for (const p of await layoutProblems(page)) report.push(`${path} [${p.kind}] ${p.detail}`);
  }
  expect(report).toEqual([]);
});
