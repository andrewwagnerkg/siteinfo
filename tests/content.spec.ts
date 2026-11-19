import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { CONTENT_DIR, LANGS, ROOT, collections, contentEntries } from './helpers';

/**
 * File-system checks (no browser). They do not depend on the viewport,
 * so they run only once, in the desktop project.
 */
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'file-system check, runs once');
});

test.describe('content parity', () => {
  for (const collection of collections()) {
    test(`every ${collection} slug exists in en, ru and ky`, () => {
      const entries = contentEntries().filter((e) => e.collection === collection);
      const slugs = new Set(entries.map((e) => e.slug));
      const missing: string[] = [];
      for (const slug of slugs) {
        for (const lang of LANGS) {
          if (!entries.some((e) => e.slug === slug && e.lang === lang)) {
            missing.push(join(CONTENT_DIR, collection, lang, `${slug}.md`));
          }
        }
      }
      expect(missing, 'missing translations').toEqual([]);
    });
  }

  test('published / open flags are the same in every language', () => {
    const entries = contentEntries();
    const problems: string[] = [];
    for (const entry of entries.filter((e) => e.lang === 'en')) {
      for (const lang of LANGS) {
        const other = entries.find((e) => e.collection === entry.collection && e.slug === entry.slug && e.lang === lang);
        if (!other) continue;
        for (const key of ['published', 'open', 'show_in_menu']) {
          if ((entry.data[key] ?? '') !== (other.data[key] ?? '')) {
            problems.push(`${entry.collection}/${lang}/${entry.slug}: ${key}=${other.data[key]} (en: ${entry.data[key]})`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

test.describe('UI dictionaries', () => {
  type Dict = { [key: string]: string | Dict };
  const load = (lang: string): Dict => JSON.parse(readFileSync(join(ROOT, 'src', 'i18n', `${lang}.json`), 'utf-8'));
  const flatten = (dict: Dict, prefix = ''): Record<string, unknown> =>
    Object.entries(dict).reduce<Record<string, unknown>>((acc, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object') Object.assign(acc, flatten(value as Dict, path));
      else acc[path] = value;
      return acc;
    }, {});

  const en = flatten(load('en'));

  for (const lang of ['ru', 'ky']) {
    test(`${lang}.json has a non-empty value for every key of en.json`, () => {
      const other = flatten(load(lang));
      const missing = Object.keys(en).filter((key) => !key.startsWith('_meta') && (other[key] === undefined || other[key] === ''));
      const extra = Object.keys(other).filter((key) => !key.startsWith('_meta') && !(key in en));
      expect(missing, `keys missing in ${lang}.json`).toEqual([]);
      expect(extra, `keys in ${lang}.json that en.json does not have`).toEqual([]);
    });
  }
});

test.describe('case studies', () => {
  test('projects do not have client-name fields', () => {
    const offending = contentEntries()
      .filter((e) => e.collection === 'projects')
      .filter((e) => Object.keys(e.data).some((key) => /^(client|client_name|customer|company_name)$/i.test(key)))
      .map((e) => e.file);
    expect(offending).toEqual([]);
  });

  test('projects have industry and company size', () => {
    const problems = contentEntries()
      .filter((e) => e.collection === 'projects')
      .filter((e) => !e.data.industry || !e.data.company_size)
      .map((e) => e.file);
    expect(problems).toEqual([]);
  });
});
