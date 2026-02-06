"use strict";
/**
 * Seed Configuration for Source Registry
 * Defines trusted source providers that can be scanned
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_DOMAINS = exports.SEED_SOURCES = void 0;
exports.getSeedByName = getSeedByName;
exports.getSeedsByType = getSeedsByType;
exports.isDomainAllowed = isDomainAllowed;
exports.isUrlAllowed = isUrlAllowed;
/**
 * Approved seed sources
 * Only domains in this list will be scanned
 */
exports.SEED_SOURCES = [
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
exports.ALLOWED_DOMAINS = [
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
function getSeedByName(name) {
    return exports.SEED_SOURCES.find(s => s.name.toLowerCase() === name.toLowerCase());
}
/**
 * Get seed configuration by source type
 */
function getSeedsByType(type) {
    return exports.SEED_SOURCES.filter(s => s.type === type);
}
/**
 * Check if a domain is in the allowlist
 */
function isDomainAllowed(domain) {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    return exports.ALLOWED_DOMAINS.some(allowed => normalizedDomain === allowed || normalizedDomain.endsWith(`.${allowed}`));
}
/**
 * Validate a URL against allowed domains
 */
function isUrlAllowed(url) {
    try {
        const parsed = new URL(url);
        return isDomainAllowed(parsed.hostname);
    }
    catch {
        return false;
    }
}
