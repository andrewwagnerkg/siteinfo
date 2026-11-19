import { expect, test } from '@playwright/test';
import { contrastIssues, layoutProblems, smallTouchTargets } from './checks';

/**
 * Self-test of the in-page detectors: inject known problems into a real page
 * and make sure each detector reports them. Guards against checks that
 * silently pass everything.
 */
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'runs once');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./');
});

test('layout detector finds page overflow, wide elements and overflowing words', async ({ page }) => {
  expect(await layoutProblems(page)).toEqual([]);
  await page.evaluate(() => {
    const main = document.querySelector('main')!;
    const wide = document.createElement('div');
    wide.style.width = '600px';
    wide.textContent = 'wide block';
    const word = document.createElement('h2');
    Object.assign(word.style, { width: '100px', hyphens: 'none', overflowWrap: 'normal' });
    word.textContent = 'Оооооооооооооооооооооооооочень';
    main.prepend(wide, word);
  });
  const kinds = (await layoutProblems(page)).map((p) => p.kind);
  expect(kinds).toContain('page scroll');
  expect(kinds).toContain('element wider than viewport');
  expect(kinds).toContain('text overflows its box');
});

test('touch target detector finds small buttons but ignores links inside text', async ({ page }) => {
  await page.evaluate(() => {
    const main = document.querySelector('main')!;
    const button = document.createElement('button');
    Object.assign(button.style, { width: '20px', height: '20px', display: 'block' });
    button.textContent = 'x';
    const p = document.createElement('p');
    p.innerHTML = 'Some sentence with <a href="#">an inline link</a> inside.';
    main.prepend(button, p);
  });
  const found = await smallTouchTargets(page);
  expect(found.some((t) => t.startsWith('<button> "x"'))).toBe(true);
  expect(found.some((t) => t.includes('an inline link'))).toBe(false);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`contrast detector finds low-contrast text (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('./');
    await page.evaluate((s) => {
      const p = document.createElement('p');
      p.textContent = 'low contrast sample';
      p.style.color = s === 'light' ? '#cccccc' : '#333333';
      document.querySelector('main')!.prepend(p);
    }, scheme);
    const { issues } = await contrastIssues(page);
    expect(issues.some((i) => i.text.includes('low contrast sample'))).toBe(true);
  });
}
