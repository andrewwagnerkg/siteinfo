import type { Dictionary, Lang } from '../i18n';
import { byOrder, entrySlug, getLocalized } from './content';

export interface NavItem {
  label: string;
  /** Path without base and language prefix, e.g. "services". */
  path: string;
}

/** Fixed sections of the site, in menu order. */
const SECTIONS = ['services', 'portfolio', 'news', 'careers', 'about', 'contacts'] as const;

/**
 * Slugs that custom pages (src/content/pages) must not use because they are
 * taken by fixed routes or language prefixes.
 */
export const RESERVED_SLUGS: readonly string[] = [...SECTIONS, 'ru', 'ky', 'en', '404', 'rss.xml', 'robots.txt'];

/** Main menu: fixed sections + custom pages with `show_in_menu: true`. */
export async function getMainNav(lang: Lang, t: Dictionary): Promise<NavItem[]> {
  const fixed: NavItem[] = SECTIONS.map((key) => ({ label: t.nav[key], path: key }));
  const pages = (await getLocalized('pages', lang)).filter((p) => p.data.show_in_menu).sort(byOrder);
  const custom: NavItem[] = pages.map((p) => ({ label: p.data.title, path: entrySlug(p) }));
  return [...fixed, ...custom];
}

/** Footer: same as the main menu plus all other custom pages (e.g. privacy). */
export async function getFooterNav(lang: Lang, t: Dictionary): Promise<NavItem[]> {
  const fixed: NavItem[] = SECTIONS.map((key) => ({ label: t.nav[key], path: key }));
  const pages = (await getLocalized('pages', lang)).sort(byOrder);
  const custom: NavItem[] = pages.map((p) => ({ label: p.data.title, path: entrySlug(p) }));
  return [...fixed, ...custom];
}
