import { expect, test } from '@playwright/test';
import { LANGS, localized } from './helpers';

/**
 * Mobile menu: collapsed below 1280 px (xl), opens and closes with the button,
 * closes with Escape, works with the keyboard. From 1280 px the menu is inline.
 */

const SECTIONS = ['services', 'portfolio', 'news', 'careers', 'about', 'contacts'];

for (const lang of LANGS) {
  for (const width of [360, 390, 768, 1024]) {
    test(`mobile menu works at ${width}px (${lang})`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop' && width !== 360, 'width sweep runs on desktop; 360 runs everywhere');
      await page.setViewportSize({ width, height: 800 });
      await page.goto(localized('', lang));

      const toggle = page.locator('#menu-toggle');
      const menu = page.locator('#site-menu');
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-controls', 'site-menu');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(menu).toBeHidden();
      const closedLabel = (await toggle.innerText()).trim() || (await toggle.textContent())?.trim();
      expect(closedLabel, 'toggle has an accessible name').toBeTruthy();

      // Open with the mouse/tap.
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(menu).toBeVisible();
      for (const section of SECTIONS) {
        const link = menu.locator(`nav a[href$="/${section}/"]`);
        await expect(link, `menu item ${section}`).toBeVisible();
        await expect(link).toBeInViewport();
      }
      await expect(menu.locator('a[hreflang]')).toHaveCount(3);
      // Label changes to "close".
      expect((await toggle.textContent())?.trim()).not.toBe(closedLabel);

      // Close with the button.
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(menu).toBeHidden();

      // Keyboard: focus the toggle, open with Enter, Tab into the menu, close with Escape.
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Tab');
      const focusedInMenu = await page.evaluate(() => !!document.activeElement?.closest('#site-menu'));
      expect(focusedInMenu, 'Tab after the toggle moves focus into the menu').toBe(true);
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(menu).toBeHidden();
      await expect(toggle).toBeFocused();

      // Space also toggles.
      await page.keyboard.press('Space');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
    });
  }

  for (const width of [1280, 1920]) {
    test(`inline menu at ${width}px (${lang})`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'desktop widths');
      await page.setViewportSize({ width, height: 800 });
      await page.goto(localized('', lang));
      await expect(page.locator('#menu-toggle')).toBeHidden();
      const menu = page.locator('#site-menu');
      await expect(menu).toBeVisible();
      for (const section of SECTIONS) {
        await expect(menu.locator(`nav a[href$="/${section}/"]`)).toBeVisible();
      }
      // All menu items fit on one row in the header (long ru/ky labels).
      const tops = await menu.locator('nav a').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      expect(new Set(tops).size, `menu items on one line at ${width}px`).toBe(1);
    });
  }
}

test('without JavaScript the menu is shown expanded', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 800 }, baseURL });
  const page = await context.newPage();
  await page.goto('ru/');
  await expect(page.locator('#site-menu')).toBeVisible();
  await expect(page.locator('#menu-toggle')).toBeHidden();
  await context.close();
});
