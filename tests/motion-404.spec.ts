import { expect, test } from '@playwright/test';
import { LANGS } from './helpers';

/** prefers-reduced-motion and the 404 page. */

for (const path of ['./', 'ru/services/', 'ky/portfolio/', 'news/']) {
  test(`prefers-reduced-motion: no running animations or transitions (${path})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await page.mouse.wheel(0, 2000);
    const report = await page.evaluate(() => {
      const out: string[] = [];
      const ms = (value: string) =>
        Math.max(...value.split(',').map((v) => (v.trim().endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000)));
      for (const animation of document.getAnimations()) {
        const timing = animation.effect?.getComputedTiming();
        const duration = Number(timing?.duration ?? 0);
        // Scroll-driven animations have a percentage-based duration; they must not run at all.
        const scrollDriven = !!animation.timeline && !(animation.timeline instanceof DocumentTimeline);
        if (scrollDriven || duration > 1) {
          const target = (animation.effect as KeyframeEffect | null)?.target;
          out.push(`animation ${(animation as CSSAnimation).animationName ?? ''} on <${target?.tagName.toLowerCase()}.${target?.className}> duration=${duration}${scrollDriven ? ' (scroll-driven)' : ''}`);
        }
      }
      for (const el of Array.from(document.querySelectorAll('*'))) {
        for (const pseudo of [null, '::before', '::after']) {
          const s = getComputedStyle(el, pseudo);
          if (s.animationName !== 'none' && ms(s.animationDuration) > 1) out.push(`<${el.tagName.toLowerCase()}${pseudo ?? ''}> animation-duration ${s.animationDuration}`);
          if (s.transitionProperty !== 'none' && ms(s.transitionDuration) > 1) out.push(`<${el.tagName.toLowerCase()}${pseudo ?? ''}> transition-duration ${s.transitionDuration}`);
        }
      }
      if (getComputedStyle(document.documentElement).scrollBehavior === 'smooth') out.push('html scroll-behavior: smooth');
      return [...new Set(out)];
    });
    expect(report).toEqual([]);
  });
}

test('404: unknown URL returns the 404 page in all languages', async ({ page }) => {
  const response = await page.goto('this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
  for (const lang of LANGS) {
    const home = page.locator(`section[lang="${lang}"] a`);
    await expect(home, `home link in ${lang}`).toHaveCount(1);
    await home.click();
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await page.goBack();
  }
});

test('404 for an unknown page inside a language', async ({ page }) => {
  const response = await page.goto('ru/no-such-page/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toBeVisible();
});

test('404 for a missing content slug', async ({ page }) => {
  const response = await page.goto('ky/news/no-such-news/');
  expect(response?.status()).toBe(404);
});
