import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { expect, test } from '@playwright/test';
import { BASE_PATH, DIST_DIR } from './helpers';

/**
 * Crawls the built site over HTTP (astro preview) starting from the three home
 * pages and checks that:
 * - every internal link (a, link) returns 200;
 * - every #fragment points to an existing id;
 * - every built page is reachable by links (no orphan pages).
 * Runs once (desktop project): the HTML is the same for every viewport.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'crawl runs once');
});

const decode = (value: string) =>
  value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function extractLinks(html: string): string[] {
  const links: string[] = [];
  for (const match of html.matchAll(/<(a|link)\b[^>]*?\shref=("([^"]*)"|'([^']*)')[^>]*>/gi)) {
    const tag = match[0];
    // Canonical/alternate/OG are absolute URLs on the production host; they are checked in seo.spec.ts.
    if (/rel="(canonical|alternate)"/i.test(tag)) continue;
    links.push(decode(match[3] ?? match[4] ?? ''));
  }
  return links;
}

function extractIds(html: string): Set<string> {
  return new Set([...html.matchAll(/\sid=("([^"]*)"|'([^']*)')/g)].map((m) => decode(m[2] ?? m[3] ?? '')));
}

function builtPages(dir = DIST_DIR): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...builtPages(full));
    else if (name === 'index.html') {
      const rel = relative(DIST_DIR, dir).split(sep).join('/');
      out.push(`${BASE_PATH}/${rel ? `${rel}/` : ''}`);
    }
  }
  return out;
}

test('all internal links resolve and no page is orphaned', async ({ request, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const start = [`${BASE_PATH}/`, `${BASE_PATH}/ru/`, `${BASE_PATH}/ky/`];
  const queue = [...start];
  const visited = new Map<string, { status: number; ids: Set<string> }>();
  const linkedFrom = new Map<string, Set<string>>();
  const fragments: { from: string; target: string; id: string }[] = [];
  const broken: string[] = [];

  while (queue.length) {
    const path = queue.shift()!;
    if (visited.has(path)) continue;
    const response = await request.get(`${origin}${path}`, { maxRedirects: 0 });
    const status = response.status();
    const type = response.headers()['content-type'] ?? '';
    const isHtml = type.includes('text/html');
    const html = isHtml ? await response.text() : '';
    visited.set(path, { status, ids: extractIds(html) });
    if (status !== 200) continue;
    if (!isHtml) continue;

    for (const raw of extractLinks(html)) {
      if (!raw || /^(mailto:|tel:|javascript:|data:)/i.test(raw)) continue;
      const url = new URL(raw, `${origin}${path}`);
      if (url.origin !== origin) continue;
      const target = url.pathname;
      if (!linkedFrom.has(target)) linkedFrom.set(target, new Set());
      linkedFrom.get(target)!.add(path);
      if (url.hash.length > 1) fragments.push({ from: path, target, id: decodeURIComponent(url.hash.slice(1)) });
      if (!visited.has(target)) queue.push(target);
    }
  }

  for (const [path, { status }] of visited) {
    if (status !== 200) broken.push(`${path} -> HTTP ${status} (linked from: ${[...(linkedFrom.get(path) ?? [])].join(', ')})`);
  }
  for (const { from, target, id } of fragments) {
    const info = visited.get(target);
    if (info && info.status === 200 && !info.ids.has(id)) broken.push(`${from}: link to ${target}#${id}, but no element with id="${id}"`);
  }
  expect(broken, 'broken internal links').toEqual([]);

  // Every link must keep the base path (the site lives under it on GitHub Pages).
  const outsideBase = [...linkedFrom.keys()].filter((p) => BASE_PATH && !p.startsWith(`${BASE_PATH}/`));
  expect(outsideBase, 'links without the base path').toEqual([]);

  const orphans = builtPages()
    .filter((page) => !page.endsWith('/404/'))
    .filter((page) => !visited.has(page));
  expect(orphans, 'built pages that no link leads to').toEqual([]);
});

test('every page is linked from another page in the same language', async ({ request, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const pages = builtPages().filter((p) => !p.endsWith('/404/'));
  const incoming = new Map<string, number>(pages.map((p) => [p, 0]));
  const langOf = (p: string) => (p.startsWith(`${BASE_PATH}/ru/`) ? 'ru' : p.startsWith(`${BASE_PATH}/ky/`) ? 'ky' : 'en');

  for (const page of pages) {
    const html = await (await request.get(`${origin}${page}`)).text();
    for (const raw of extractLinks(html)) {
      if (!raw || raw.startsWith('#')) continue;
      const target = new URL(raw, `${origin}${page}`).pathname;
      if (target !== page && incoming.has(target) && langOf(target) === langOf(page)) {
        incoming.set(target, incoming.get(target)! + 1);
      }
    }
  }
  const home = new Set([`${BASE_PATH}/`, `${BASE_PATH}/ru/`, `${BASE_PATH}/ky/`]);
  const orphans = [...incoming].filter(([p, n]) => n === 0 && !home.has(p)).map(([p]) => p);
  expect(orphans).toEqual([]);
});
