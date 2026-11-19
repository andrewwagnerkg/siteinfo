import type { CollectionEntry } from 'astro:content';
import { siteConfig } from '../config/site';
import { absoluteUrl, withBase } from './paths';

/** Schema.org JSON-LD builders. */

type JsonLd = Record<string, unknown>;

export function organizationSchema(site: URL | undefined): JsonLd {
  const url = absoluteUrl(withBase('/'), site);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}#organization`,
    name: siteConfig.name,
    url,
    logo: absoluteUrl(withBase('/favicon.svg'), site),
    email: siteConfig.email,
    ...(siteConfig.phone ? { telephone: siteConfig.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: siteConfig.address.locality,
      addressCountry: siteConfig.address.country,
    },
    ...(siteConfig.socials.length ? { sameAs: siteConfig.socials.map((s) => s.url) } : {}),
  };
}

function organizationRef(site: URL | undefined): JsonLd {
  const url = absoluteUrl(withBase('/'), site);
  return { '@type': 'Organization', '@id': `${url}#organization`, name: siteConfig.name, url };
}

export function articleSchema(
  entry: CollectionEntry<'news'>,
  opts: { url: string; image: string; lang: string; site: URL | undefined },
): JsonLd {
  const { data } = entry;
  const isArticle = data.tags.includes('article');
  return {
    '@context': 'https://schema.org',
    '@type': isArticle ? 'Article' : 'NewsArticle',
    headline: data.title,
    description: data.summary,
    datePublished: data.date.toISOString(),
    inLanguage: opts.lang,
    mainEntityOfPage: opts.url,
    image: [opts.image],
    author: organizationRef(opts.site),
    publisher: organizationRef(opts.site),
  };
}

const EMPLOYMENT_TYPES = {
  'full-time': 'FULL_TIME',
  'part-time': 'PART_TIME',
  contract: 'CONTRACTOR',
  internship: 'INTERN',
} as const;

/**
 * Prepares rendered vacancy HTML for JobPosting.description (Google accepts HTML there).
 * Blockquotes are editorial notes (e.g. the placeholder warning), not part of the vacancy,
 * so they are removed. Returns '' when nothing is left; the schema then falls back to summary.
 */
export function jobDescriptionHtml(html: string | undefined): string {
  if (!html) return '';
  return html
    .replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function jobPostingSchema(
  entry: CollectionEntry<'careers'>,
  opts: { url: string; description: string; site: URL | undefined },
): JsonLd {
  const { data } = entry;
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: data.title,
    description: opts.description || data.summary || data.title,
    datePosted: data.date_posted.toISOString().slice(0, 10),
    ...(data.valid_through ? { validThrough: data.valid_through.toISOString() } : {}),
    employmentType: EMPLOYMENT_TYPES[data.employment],
    hiringOrganization: organizationRef(opts.site),
    url: opts.url,
    ...(data.remote ? { jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: siteConfig.address.country } } : {}),
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: data.location, addressCountry: siteConfig.address.country },
    },
    ...(data.stack.length ? { skills: data.stack.join(', ') } : {}),
  };
}
