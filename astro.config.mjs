// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * Deployment target is configured through environment variables so the same
 * commit can be built for different environments:
 *
 * - dev (GitHub Pages): defaults below, site is served from /<repo>/
 * - prod (own domain): SITE_URL=https://example.com BASE_PATH=/
 */
const SITE_URL = process.env.SITE_URL || 'https://andrewwagnerkg.github.io';
const BASE_PATH = process.env.BASE_PATH || '/siteinfo';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru', 'ky'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          ru: 'ru',
          ky: 'ky',
        },
      },
      // The 404 page must not be listed in the sitemap.
      filter: (page) => !/\/404\/?$/.test(page),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
