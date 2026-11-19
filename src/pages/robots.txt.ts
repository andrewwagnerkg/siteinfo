import type { APIRoute } from 'astro';
import { absoluteUrl, withBase } from '../lib/paths';

/** robots.txt with an absolute sitemap URL that respects SITE_URL and BASE_PATH. */
export const GET: APIRoute = ({ site }) => {
  const sitemap = absoluteUrl(withBase('/sitemap-index.xml'), site);
  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
