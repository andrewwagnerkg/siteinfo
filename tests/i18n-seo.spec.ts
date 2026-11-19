import { expect, test, type Page } from '@playwright/test';
import { BASE_PATH, LANGS, allRoutes, contentEntries, openMenuIfCollapsed, pathnameOf, routeName } from './helpers';

/**
 * Language switcher, hreflang, canonical, Open Graph and Schema.org JSON-LD.
 */

type Json = Record<string, unknown>;

async function jsonLd(page: Page): Promise<Json[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const out: Json[] = [];
  for (const text of blocks) {
    let parsed: unknown;
    expect(() => (parsed = JSON.parse(text)), `JSON-LD must be valid JSON: ${text.slice(0, 120)}`).not.toThrow();
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of list) {
      const graph = (item as Json)['@graph'];
      if (Array.isArray(graph)) out.push(...(graph as Json[]));
      else out.push(item as Json);
    }
  }
  return out;
}

const isAbsoluteHttp = (value: string | null | undefined) => !!value && /^https?:\/\/[^/]+\//.test(value);
const pathOf = (value: string) => new URL(value).pathname;

const openVacancies = new Set(
  contentEntries()
    .filter((e) => e.collection === 'careers' && e.data.open !== 'false')
    .map((e) => e.slug),
);

for (const route of allRoutes()) {
  test.describe(routeName(route), () => {
    test('language switcher leads to the same page in other languages', async ({ page }) => {
      await page.goto(route.path);
      await openMenuIfCollapsed(page);
      const switcher = page.locator('#site-menu a[hreflang]');
      await expect(switcher).toHaveCount(LANGS.length);
      for (const lang of LANGS) {
        const link = page.locator(`#site-menu a[hreflang="${lang}"]`);
        await expect(link).toHaveAttribute('href', pathnameOf(route.neutral, lang));
        if (lang === route.lang) await expect(link).toHaveAttribute('aria-current', 'true');
        else await expect(link).not.toHaveAttribute('aria-current', /.*/);
      }
      // Actually follow one link to another language.
      const target = LANGS.find((l) => l !== route.lang)!;
      await page.locator(`#site-menu a[hreflang="${target}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${pathnameOf(route.neutral, target).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      await expect(page.locator('html')).toHaveAttribute('lang', target);
    });

    test('hreflang, canonical and Open Graph', async ({ page }) => {
      await page.goto(route.path);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(isAbsoluteHttp(canonical), `canonical is absolute: ${canonical}`).toBe(true);
      expect(pathOf(canonical!)).toBe(route.pathname);

      for (const lang of [...LANGS, 'x-default']) {
        const links = page.locator(`link[rel="alternate"][hreflang="${lang}"]`);
        await expect(links, `hreflang=${lang}`).toHaveCount(1);
        const href = await links.getAttribute('href');
        expect(isAbsoluteHttp(href), `hreflang=${lang} is absolute: ${href}`).toBe(true);
        expect(new URL(href!).origin).toBe(new URL(canonical!).origin);
        const expected = pathnameOf(route.neutral, lang === 'x-default' ? 'en' : (lang as (typeof LANGS)[number]));
        expect(pathOf(href!), `hreflang=${lang}`).toBe(expected);
      }

      const og = async (property: string) => page.locator(`meta[property="${property}"]`).getAttribute('content');
      expect((await og('og:title'))?.trim(), 'og:title').toBeTruthy();
      expect((await og('og:description'))?.trim(), 'og:description').toBeTruthy();
      const ogUrl = await og('og:url');
      expect(ogUrl, 'og:url equals canonical').toBe(canonical);
      const ogImage = await og('og:image');
      expect(isAbsoluteHttp(ogImage), `og:image is absolute: ${ogImage}`).toBe(true);
      // The image itself must exist on the built site.
      const imagePath = pathOf(ogImage!);
      expect(imagePath.startsWith(`${BASE_PATH}/`), `og:image under base path: ${imagePath}`).toBe(true);
      const imageResponse = await page.request.get(imagePath.replace(`${BASE_PATH}/`, ''));
      expect(imageResponse.status(), `og:image ${imagePath}`).toBe(200);
      expect(imageResponse.headers()['content-type']).toMatch(/^image\//);
    });

    test('Schema.org JSON-LD', async ({ page }) => {
      await page.goto(route.path);
      const items = await jsonLd(page);
      for (const item of items) expect(item['@context'] ?? 'https://schema.org').toMatch(/schema\.org/);

      const org = items.find((i) => i['@type'] === 'Organization');
      expect(org, 'Organization on every page').toBeTruthy();
      expect(org!.name, 'Organization.name').toBeTruthy();
      expect(isAbsoluteHttp(org!.url as string), 'Organization.url absolute').toBe(true);
      expect(isAbsoluteHttp(org!.logo as string), 'Organization.logo absolute').toBe(true);

      const isNewsPage = /^news\/[^/]+\/$/.test(route.neutral);
      const article = items.find((i) => ['Article', 'NewsArticle', 'BlogPosting'].includes(i['@type'] as string));
      if (isNewsPage) {
        expect(article, 'Article on news pages').toBeTruthy();
        for (const field of ['headline', 'datePublished', 'author', 'publisher', 'image']) {
          expect(article![field], `Article.${field}`).toBeTruthy();
        }
        expect(Number.isNaN(Date.parse(article!.datePublished as string)), 'Article.datePublished is a date').toBe(false);
        expect(article!.inLanguage).toBe(route.lang);
        expect(pathOf(article!.mainEntityOfPage as string)).toBe(route.pathname);
      } else {
        expect(article, 'Article only on news pages').toBeUndefined();
      }

      const vacancy = route.neutral.match(/^careers\/([^/]+)\/$/)?.[1];
      const job = items.find((i) => i['@type'] === 'JobPosting');
      if (vacancy && openVacancies.has(vacancy)) {
        expect(job, 'JobPosting on open vacancy pages').toBeTruthy();
        for (const field of ['title', 'description', 'datePosted', 'hiringOrganization', 'employmentType']) {
          expect(job![field], `JobPosting.${field}`).toBeTruthy();
        }
        expect(job!.jobLocation || job!.jobLocationType, 'JobPosting.jobLocation or jobLocationType').toBeTruthy();
        expect(job!.validThrough, 'JobPosting.validThrough (recommended)').toBeTruthy();
        expect(Number.isNaN(Date.parse(job!.datePosted as string))).toBe(false);
        expect(new Date(job!.validThrough as string).getTime()).toBeGreaterThan(new Date(job!.datePosted as string).getTime());
        // Google expects the description as text/HTML, not raw Markdown.
        expect(job!.description as string, 'JobPosting.description must not contain raw Markdown').not.toMatch(/^\s*(#{1,6} |> |- )/m);
      } else {
        expect(job, 'JobPosting only on open vacancy pages').toBeUndefined();
      }
    });
  });
}

test.describe('site files', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'viewport-independent, runs once');
  });

  test('robots.txt allows crawling and points to the sitemap', async ({ request }) => {
    const response = await request.get('robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/User-agent:\s*\*/i);
    expect(body).not.toMatch(/^Disallow:\s*\/\s*$/im);
    const sitemap = body.match(/^Sitemap:\s*(\S+)/im)?.[1];
    expect(sitemap, 'Sitemap line').toBeTruthy();
    expect(pathOf(sitemap!)).toBe(`${BASE_PATH}/sitemap-index.xml`);
  });

  test('sitemap-index.xml lists every page with hreflang alternates', async ({ request }) => {
    const index = await request.get('sitemap-index.xml');
    expect(index.status()).toBe(200);
    const indexXml = await index.text();
    const sitemaps = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '');
    expect(sitemaps.length).toBeGreaterThan(0);

    let urls: string[] = [];
    let xmlAll = '';
    for (const loc of sitemaps) {
      const response = await request.get(pathOf(loc).replace(`${BASE_PATH}/`, ''));
      expect(response.status(), loc).toBe(200);
      const xml = await response.text();
      xmlAll += xml;
      urls = urls.concat([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => pathOf(m[1] ?? '')));
    }

    const expected = allRoutes().map((r) => r.pathname);
    expect(expected.filter((p) => !urls.includes(p)), 'pages missing in the sitemap').toEqual([]);
    expect(urls.filter((p) => !expected.includes(p)), 'sitemap URLs that are not known pages').toEqual([]);
    expect(urls.some((p) => p.includes('404')), '404 must not be in the sitemap').toBe(false);
    for (const lang of LANGS) {
      expect(xmlAll, `xhtml:link hreflang="${lang}" in sitemap`).toContain(`hreflang="${lang}"`);
    }
  });
});
