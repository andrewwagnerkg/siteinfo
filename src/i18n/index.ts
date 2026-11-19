import en from './en.json';
import ru from './ru.json';
import ky from './ky.json';

/** Supported languages. The first one is the default and has no URL prefix. */
export const LANGS = ['en', 'ru', 'ky'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export type Dictionary = typeof en;

// Typing ru/ky against the en shape makes `astro check` fail when a key is missing.
const dictionaries: Record<Lang, Dictionary> = { en, ru, ky };

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/** Returns the UI dictionary for a language. */
export function useTranslations(lang: Lang): Dictionary {
  return dictionaries[lang];
}

/**
 * Value of the optional `[...lang]` route param for a language:
 * `undefined` for the default language (no prefix), the code otherwise.
 */
export function langParam(lang: Lang): string | undefined {
  return lang === DEFAULT_LANG ? undefined : lang;
}

/** Resolves the language from the optional `[...lang]` route param. */
export function langFromParam(param: string | undefined): Lang {
  if (param === undefined || param === '') return DEFAULT_LANG;
  if (isLang(param)) return param;
  throw new Error(`Unknown language in URL: "${param}"`);
}

/** getStaticPaths() entries for a static route that exists in every language. */
export function langStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang: langParam(lang) } }));
}

/** Formats a date for the given language. */
export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}
