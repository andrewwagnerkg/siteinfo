import { DEFAULT_LANG, LANGS, type Lang } from '../i18n';

/**
 * URL helpers. Always build internal links through these functions so that the
 * site works both under a sub-path (GitHub Pages: /siteinfo/) and at the root
 * of a domain (prod). The base comes from `BASE_PATH` via astro.config.mjs.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Adds a trailing slash to page paths (not to files such as /robots.txt). */
function withTrailingSlash(path: string): string {
  const [pathname = '', hash = ''] = path.split('#');
  const last = pathname.split('/').pop() ?? '';
  const isFile = last.includes('.');
  const fixed = isFile || pathname.endsWith('/') ? pathname : `${pathname}/`;
  return hash ? `${fixed}#${hash}` : fixed;
}

/** Prefixes a root-relative path with the configured base: `/news/` -> `/siteinfo/news/`. */
export function withBase(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return withTrailingSlash(`${BASE}${clean}`);
}

/** Root-relative path (without base) of a page in a language: (`ru`, `news/a`) -> `/ru/news/a/`. */
export function localePath(lang: Lang, path = ''): string {
  const clean = path.replace(/^\/+/, '');
  const prefix = lang === DEFAULT_LANG ? '' : `${lang}/`;
  return withTrailingSlash(`/${prefix}${clean}`);
}

/** Final href of a page in a language, including base: (`ru`, `news`) -> `/siteinfo/ru/news/`. */
export function href(lang: Lang, path = ''): string {
  return withBase(localePath(lang, path));
}

/** Removes base and language prefix from a pathname: `/siteinfo/ru/news/a/` -> `news/a/`. */
export function stripLocale(pathname: string): string {
  let rest = decodeURI(pathname);
  if (BASE && rest.startsWith(BASE)) rest = rest.slice(BASE.length);
  rest = rest.replace(/^\/+/, '');
  const first = rest.split('/')[0];
  if (first && (LANGS as readonly string[]).includes(first) && first !== DEFAULT_LANG) {
    rest = rest.slice(first.length).replace(/^\/+/, '');
  }
  return rest;
}

/** Href of the current page in another language (used by the language switcher and hreflang). */
export function translatePath(pathname: string, lang: Lang): string {
  return href(lang, stripLocale(pathname));
}

/** Absolute URL for canonical, hreflang, Open Graph and JSON-LD. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  return site ? new URL(path, site).toString() : path;
}
