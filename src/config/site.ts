/**
 * Language-independent company data, used in the footer, contacts page and
 * Schema.org Organization markup. Values are placeholders until real data is
 * provided (task for the `content` agent).
 */
export interface SiteConfig {
  name: string;
  email: string;
  phone: string;
  address: { locality: string; country: string };
  socials: { label: string; url: string }[];
  ogImage: string;
  formEndpoint: string;
}

export const siteConfig: SiteConfig = {
  /** Legal / brand name. Also used as og:site_name and in JSON-LD. */
  name: 'TimelySoft',
  email: 'hello@example.com',
  phone: '',
  /** Postal address for JSON-LD; leave fields empty if unknown. */
  address: {
    locality: 'Bishkek',
    country: 'KG',
  },
  /** Public profiles (GitHub, LinkedIn, Telegram...). Used in JSON-LD `sameAs`. */
  socials: [],
  /** Default Open Graph image, path inside `public/`. */
  ogImage: '/og-default.png',
  /**
   * Endpoint of the contact form service (a free form service or a Telegram
   * bridge). Set PUBLIC_FORM_ENDPOINT at build time; empty = form disabled.
   */
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT ?? '',
};
