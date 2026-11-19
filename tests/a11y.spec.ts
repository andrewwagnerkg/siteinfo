import { expect, test } from '@playwright/test';
import { contrastIssues } from './checks';
import { allRoutes, routeName } from './helpers';

/**
 * Accessibility basics: images with alt, skip link, visible focus,
 * WCAG AA text contrast in light and dark color schemes.
 * Contrast is computed in the page (no extra dependencies).
 */

for (const route of allRoutes()) {
  test.describe(routeName(route), () => {
    test('images have alt, links and buttons have names', async ({ page }) => {
      await page.goto(route.path);
      const noAlt = await page.locator('img:not([alt])').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src));
      expect(noAlt, 'img without alt').toEqual([]);
      const badSvg = await page
        .locator('svg:not([aria-hidden="true"]):not([role="img"])')
        .evaluateAll((els) => els.filter((e) => !e.closest('[aria-hidden="true"]')).map((e) => e.outerHTML.slice(0, 80)));
      expect(badSvg, 'decorative svg should be aria-hidden, meaningful svg role="img"').toEqual([]);
      const unnamed = await page.locator('a[href], button').evaluateAll((els) =>
        els
          .filter((e) => !(e.textContent ?? '').trim() && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.querySelector('img[alt]:not([alt=""])'))
          .map((e) => e.outerHTML.slice(0, 80)),
      );
      expect(unnamed, 'links/buttons without accessible name').toEqual([]);
      const ids = await page.locator('[id]').evaluateAll((els) => els.map((e) => e.id));
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(dupes, 'duplicate ids').toEqual([]);
      // Landmarks.
      await expect(page.locator('main')).toHaveCount(1);
      const navs = await page.locator('nav').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')));
      expect(navs.filter((n) => !n), 'every <nav> has a label').toEqual([]);
    });

    for (const scheme of ['light', 'dark'] as const) {
      test(`text contrast WCAG AA (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await page.goto(route.path);
        const { issues } = await contrastIssues(page);
        expect(issues.map((i) => `${i.text} ratio ${i.ratio} < ${i.required} (fg ${i.fg} on ${i.bg})`)).toEqual([]);
      });
    }
  });
}

test.describe('keyboard', () => {
  for (const path of ['./', 'ru/news/', 'ky/contacts/']) {
    test(`skip link is first, visible on focus and moves to main (${path})`, async ({ page }) => {
      await page.goto(path);
      await page.keyboard.press('Tab');
      const skip = page.locator('a[href="#main"]');
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      const box = await skip.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await page.keyboard.press('Enter');
      await expect(page.locator('main#main')).toBeFocused();
    });
  }

  test('focus is visible on every focusable element of the home page', async ({ page }) => {
    await page.goto('ru/');
    const toggle = page.locator('#menu-toggle');
    if (await toggle.isVisible()) await toggle.click();
    const report: string[] = [];
    const total = await page.locator('a[href], button, input, select, textarea').count();
    await page.locator('body').focus();
    for (let i = 0; i < total + 2; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const card = el.closest('.card');
        const cardStyle = card ? getComputedStyle(card) : null;
        const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2;
        const cardOutline = !!cardStyle && cardStyle.outlineStyle !== 'none' && parseFloat(cardStyle.outlineWidth) >= 2;
        const shadow = s.boxShadow && s.boxShadow !== 'none';
        return { name: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? '').trim().slice(0, 30)}"`, visible: outline || cardOutline || !!shadow };
      });
      if (info && !info.visible) report.push(info.name);
    }
    expect(report, 'focused elements without a visible focus indicator').toEqual([]);
  });
});
