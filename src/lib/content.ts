import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';
import { LANGS, isLang, langParam, type Lang } from '../i18n';

/**
 * Helpers for language-split content collections.
 * Entry ids look like "<lang>/<slug>" (see src/content.config.ts).
 */

export function splitId(id: string): { lang: Lang; slug: string } {
  const [lang, ...rest] = id.split('/');
  const slug = rest.join('/');
  if (!isLang(lang) || !slug) {
    throw new Error(`Content entry "${id}" must be stored as <lang>/<slug>.md (lang: ${LANGS.join(', ')})`);
  }
  return { lang, slug };
}

export function entrySlug(entry: { id: string }): string {
  return splitId(entry.id).slug;
}

function isVisible(entry: CollectionEntry<CollectionKey>): boolean {
  const data = entry.data as { published?: boolean };
  return data.published !== false;
}

/** All visible entries of a collection in one language. */
export async function getLocalized<C extends CollectionKey>(collection: C, lang: Lang): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection);
  return entries.filter((entry) => splitId(entry.id).lang === lang && isVisible(entry)) as CollectionEntry<C>[];
}

/**
 * getStaticPaths() entries for a `[...lang]/<section>/[slug]` route:
 * one page per visible entry, in the entry's language.
 */
export async function entryStaticPaths<C extends CollectionKey>(collection: C) {
  const entries = await getCollection(collection);
  return entries.filter(isVisible).map((entry) => {
    const { lang, slug } = splitId(entry.id);
    return {
      params: { lang: langParam(lang), slug },
      props: { entry: entry as CollectionEntry<C>, lang },
    };
  });
}

/** Sort by `order`, then by title. */
export function byOrder<T extends { data: { order?: number; title?: string; name?: string } }>(a: T, b: T): number {
  const diff = (a.data.order ?? 0) - (b.data.order ?? 0);
  if (diff !== 0) return diff;
  return (a.data.title ?? a.data.name ?? '').localeCompare(b.data.title ?? b.data.name ?? '');
}

/** Newest first. */
export function byDateDesc<T extends { data: { date: Date } }>(a: T, b: T): number {
  return b.data.date.getTime() - a.data.date.getTime();
}
