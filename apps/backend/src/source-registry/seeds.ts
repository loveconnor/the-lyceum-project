/**
 * Seed Configuration for Source Registry
 * Defines trusted source providers that can be scanned
 */

import type { SeedConfig, SourceType } from './types';

/**
 * Approved seed sources
 * Only domains in this list will be scanned
 */
export const SEED_SOURCES: SeedConfig[] = [
  {
    name: 'OpenStax',
    type: 'openstax',
    baseUrl: 'https://openstax.org',
    seedUrl: 'https://openstax.org/subjects',
    description: 'Free, peer-reviewed, openly licensed textbooks for college and AP courses',
    rateLimitPerMinute: 30,
    config: {
      apiUrl: 'https://openstax.org/api/v2/pages',
    },
  },
  {
    name: 'MIT OpenCourseWare',
    type: 'mit_ocw',
    baseUrl: 'https://ocw.mit.edu',
    seedUrl: 'https://ocw.mit.edu/search',
    description: 'Free and open educational resources from MIT courses',
    rateLimitPerMinute: 30,
    config: {
      apiUrl: 'https://ocw.mit.edu/api/v0/search',
    },
  },
  {
    name: 'Python Documentation',
    type: 'sphinx_docs',
    baseUrl: 'https://docs.python.org',
    seedUrl: 'https://docs.python.org/3/',
    description: 'Official Python programming language documentation',
    rateLimitPerMinute: 30,
    config: {
      versions: ['3.13', '3.12', '3.11', '3.10'],
      defaultVersion: '3.12',
      languages: ['en'],
    },
  },
];

/**
 * Allowed domains for scanning
 * Only these domains can be fetched, even if linked from seed sources
 */
export const ALLOWED_DOMAINS = [
  'openstax.org',
  'cnx.org', // OpenStax CNX (legacy)
  'ocw.mit.edu', // MIT OpenCourseWare
  'mit.edu', // MIT domains
  'docs.python.org',
  'python.org',
];

/**
 * Get seed configuration by name
 */
export function getSeedByName(name: string): SeedConfig | undefined {
  return SEED_SOURCES.find(s => s.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get seed configuration by source type
 */
export function getSeedsByType(type: SourceType): SeedConfig[] {
  return SEED_SOURCES.filter(s => s.type === type);
}

/**
 * Check if a domain is in the allowlist
 */
export function isDomainAllowed(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
  return ALLOWED_DOMAINS.some(allowed => 
    normalizedDomain === allowed || normalizedDomain.endsWith(`.${allowed}`)
  );
}

/**
 * Validate a URL against allowed domains
 */
export function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    return isDomainAllowed(parsed.hostname);
  } catch {
    return false;
  }
}


