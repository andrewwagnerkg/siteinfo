import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Content collections. See docs/site-structure.md, section 4.
 *
 * Every entry lives in a language folder and must exist in all languages
 * with the same file name (slug):
 *   src/content/<collection>/<lang>/<slug>.md   (lang: en | ru | ky)
 * The entry id is "<lang>/<slug>"; use helpers from src/lib/content.ts.
 */

/** Fields shared by all collections. */
const common = {
  /** Text is a placeholder and must be replaced with real content. */
  placeholder: z.boolean().default(false),
  /** Translation (usually ky) waits for a review by a native speaker. */
  needs_native_review: z.boolean().default(false),
};

const mdPattern = '**/*.md';

const projects = defineCollection({
  loader: glob({ pattern: mdPattern, base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Client industry. Never name the client. */
      industry: z.string(),
      /** For example: "50 employees". */
      company_size: z.string(),
      /** Service slugs (files in src/content/services/<lang>/). */
      services: z.array(z.string()).default([]),
      year: z.number().int(),
      cover: image().optional(),
      cover_alt: z.string().optional(),
      headline_metric: z.object({
        value: z.string(),
        label: z.string(),
      }),
      summary: z.string(),
      quote: z
        .object({
          text: z.string(),
          /** Position and industry of the person, no names. */
          role: z.string(),
        })
        .optional(),
      /** Show on the home page (up to 3). */
      featured: z.boolean().default(false),
      order: z.number().default(0),
      published: z.boolean().default(true),
      ...common,
    }),
});

const news = defineCollection({
  loader: glob({ pattern: mdPattern, base: './src/content/news' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      cover: image().optional(),
      cover_alt: z.string().optional(),
      summary: z.string(),
      /** Use the `article` tag for articles. */
      tags: z.array(z.string()).default([]),
      published: z.boolean().default(true),
      ...common,
    }),
});

const careers = defineCollection({
  loader: glob({ pattern: mdPattern, base: './src/content/careers' }),
  schema: z.object({
    title: z.string(),
    level: z.string(),
    location: z.string(),
    remote: z.boolean().default(false),
    employment: z.enum(['full-time', 'part-time', 'contract', 'internship']),
    stack: z.array(z.string()).default([]),
    open: z.boolean().default(true),
    apply_contact: z.string(),
    summary: z.string().optional(),
    /** Required by Schema.org JobPosting. */
    date_posted: z.coerce.date(),
    valid_through: z.coerce.date().optional(),
    ...common,
  }),
});

const services = defineCollection({
  loader: glob({ pattern: mdPattern, base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    /** Icon name; the icon set is defined by the designer. */
    icon: z.string().optional(),
    summary: z.string(),
    /** Project slugs (files in src/content/projects/<lang>/). */
    related_projects: z.array(z.string()).default([]),
    order: z.number().default(0),
    ...common,
  }),
});

const team = defineCollection({
  loader: glob({ pattern: mdPattern, base: './src/content/team' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string(),
      photo: image().optional(),
      photo_alt: z.string().optional(),
      links: z
        .array(
          z.object({
            label: z.string(),
            url: z.url(),
          }),
        )
        .default([]),
      order: z.number().default(0),
      ...common,
    }),
});

/** Custom pages, served at /{lang}{slug}/ (like a CMS). */
const pages = defineCollection({
  loader: glob({ pattern: mdPattern, base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    show_in_menu: z.boolean().default(false),
    order: z.number().default(0),
    ...common,
  }),
});

export const collections = { projects, news, careers, services, team, pages };
