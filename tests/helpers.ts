import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Page } from '@playwright/test';

/**
 * Shared helpers for the Playwright suite.
 * Routes are derived from src/content/<collection>/<lang>/<slug>.md so new
 * entries are covered automatically.
 */

// Playwright is always started from the repository root (npm run test).
export const ROOT = resolve(process.cwd());
export const CONTENT_DIR = join(ROOT, 'src', 'content');
export const DIST_DIR = join(ROOT, 'dist');

export const LANGS = ['en', 'ru', 'ky'] as const;
export type Lang = (typeof LANGS)[number];

/** Base path the site is served under (matches playwright.config.ts). */
export const BASE_PATH = (process.env.BASE_PATH || '/siteinfo').replace(/\/+$/, '');

/** Collection -> URL section. `null` = collection has no own pages; '' = root-level pages. */
const COLLECTION_SECTION: Record<string, string | null> = {
  services: 'services',
  projects: 'portfolio',
  news: 'news',
  careers: 'careers',
  pages: '',
  team: null,
};

export const STATIC_SECTIONS = ['', 'services/', 'portfolio/', 'news/', 'careers/', 'about/', 'contacts/'];

/** Very small front matter reader for flat `key: value` pairs (enough for the checks here). */
export function frontmatter(file: string): Record<string, string> {
  const text = readFileSync(file, 'utf-8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const data: Record<string, string> = {};
  if (!match) return data;
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    if (m?.[1]) data[m[1]] = (m[2] ?? '').replace(/^["']|["']$/g, '').trim();
  }
  return data;
}

export interface ContentEntry {
  collection: string;
  lang: Lang;
  slug: string;
  file: string;
  data: Record<string, string>;
}

export function contentEntries(): ContentEntry[] {
  const out: ContentEntry[] = [];
  for (const collection of readdirSync(CONTENT_DIR)) {
    for (const lang of LANGS) {
      const dir = join(CONTENT_DIR, collection, lang);
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir)) {
        if (!/\.mdx?$/.test(name)) continue;
        const file = join(dir, name);
        out.push({ collection, lang, slug: name.replace(/\.mdx?$/, ''), file, data: frontmatter(file) });
      }
    }
  }
  return out;
}

export function collections(): string[] {
  return readdirSync(CONTENT_DIR).filter((name) => existsSync(join(CONTENT_DIR, name, 'en')) || existsSync(join(CONTENT_DIR, name, 'ru')));
}

/** Language-neutral route paths (no base, no locale prefix, trailing slash), e.g. `news/website-launch/`. */
export function neutralRoutes(): string[] {
  const routes = new Set(STATIC_SECTIONS);
  for (const entry of contentEntries()) {
    if (entry.lang !== 'en') continue;
    const section = COLLECTION_SECTION[entry.collection];
    if (section === null || section === undefined) continue;
    if (entry.data.published === 'false') continue;
    routes.add(section ? `${section}/${entry.slug}/` : `${entry.slug}/`);
  }
  return [...routes];
}

/** Relative path for page.goto() (baseURL already contains the base path). */
export function localized(neutral: string, lang: Lang): string {
  const prefix = lang === 'en' ? '' : `${lang}/`;
  const path = `${prefix}${neutral}`;
  return path === '' ? './' : path;
}

/** Absolute pathname (with base) of a localized route. */
export function pathnameOf(neutral: string, lang: Lang): string {
  const prefix = lang === 'en' ? '' : `${lang}/`;
  return `${BASE_PATH}/${prefix}${neutral}`;
}

export interface Route {
  lang: Lang;
  neutral: string;
  path: string;
  pathname: string;
}

export function allRoutes(): Route[] {
  return neutralRoutes().flatMap((neutral) =>
    LANGS.map((lang) => ({ lang, neutral, path: localized(neutral, lang), pathname: pathnameOf(neutral, lang) })),
  );
}

/** Name used in test titles. */
export function routeName(route: Route): string {
  return `${route.lang} /${route.neutral}`;
}

/** Opens the burger menu if it exists and is visible (below the xl breakpoint). */
export async function openMenuIfCollapsed(page: Page): Promise<void> {
  const toggle = page.locator('#menu-toggle');
  if ((await toggle.count()) && (await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
}

/** Widths from docs/design-system.md, section «Адаптивность». */
export const WIDTHS = [360, 390, 768, 1024, 1280, 1920] as const;
