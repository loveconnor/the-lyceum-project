"use strict";
/**
 * Base Adapter for Source Registry
 * Provides common functionality for all source adapters
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
const cheerio = __importStar(require("cheerio"));
const fetcher_1 = require("../fetcher");
const logger_1 = require("../logger");
class BaseAdapter {
    constructor(customFetcher) {
        this.fetcher = customFetcher || fetcher_1.fetcher;
    }
    /**
     * Base validation that checks robots.txt and attempts license detection
     */
    async validate(asset, baseUrl) {
        const errors = [];
        const warnings = [];
        let robots_status = 'unknown';
        let license_name;
        let license_url;
        let license_confidence = 0;
        // Check robots.txt
        try {
            const robotsResult = await this.fetcher.checkRobots(asset.url);
            robots_status = robotsResult.allowed ? 'allowed' : 'disallowed';
        }
        catch (err) {
            robots_status = 'needs_review';
            warnings.push({
                code: 'ROBOTS_CHECK_FAILED',
                message: `Could not verify robots.txt: ${err.message}`,
            });
        }
        // Fetch the asset page to detect license
        try {
            const result = await this.fetcher.fetch(asset.url);
            if (result.ok && result.html) {
                const licenseInfo = this.detectLicense(result.html);
                license_name = licenseInfo.name;
                license_url = licenseInfo.url;
                license_confidence = licenseInfo.confidence;
                if (!license_name) {
                    warnings.push({
                        code: 'LICENSE_NOT_DETECTED',
                        message: 'Could not automatically detect license information',
                    });
                }
            }
            else {
                errors.push({
                    code: 'FETCH_FAILED',
                    message: `Failed to fetch asset page: ${result.error}`,
                    details: { status: result.status },
                });
            }
        }
        catch (err) {
            errors.push({
                code: 'FETCH_ERROR',
                message: `Error fetching asset: ${err.message}`,
            });
        }
        return {
            license_name,
            license_url,
            license_confidence,
            robots_status,
            errors,
            warnings,
        };
    }
    /**
     * Detect license from HTML content
     * Override in subclasses for source-specific detection
     */
    detectLicense(html) {
        const $ = cheerio.load(html);
        // Common license patterns
        const patterns = [
            {
                regex: /Creative Commons Attribution(?:-NonCommercial)?(?:-ShareAlike)?(?:-NoDerivatives)? (\d+\.\d+)/i,
                name: (match) => `CC ${match[0].replace(/Creative Commons /i, '')}`,
                confidence: 0.9,
            },
            {
                regex: /CC BY(-NC)?(-SA)?(-ND)? (\d+\.\d+)/i,
                name: (match) => match[0].toUpperCase(),
                confidence: 0.95,
            },
            {
                regex: /MIT License/i,
                name: () => 'MIT License',
                confidence: 0.95,
            },
            {
                regex: /Apache License,? Version (\d+\.\d+)/i,
                name: (match) => `Apache ${match[1]}`,
                confidence: 0.95,
            },
            {
                regex: /GNU (?:General Public License|GPL)(?: v)?(\d+)?/i,
                name: (match) => `GPL${match[1] ? ` v${match[1]}` : ''}`,
                confidence: 0.9,
            },
            {
                regex: /BSD (\d)-Clause License/i,
                name: (match) => `BSD ${match[1]}-Clause`,
                confidence: 0.95,
            },
            {
                regex: /Public Domain/i,
                name: () => 'Public Domain',
                confidence: 0.8,
            },
        ];
        // Check text content
        const pageText = $('body').text();
        for (const pattern of patterns) {
            const match = pageText.match(pattern.regex);
            if (match) {
                return {
                    name: pattern.name(match),
                    confidence: pattern.confidence,
                };
            }
        }
        // Check for Creative Commons links
        const ccLinks = $('a[href*="creativecommons.org/licenses"]');
        if (ccLinks.length > 0) {
            const href = ccLinks.first().attr('href');
            if (href) {
                const ccMatch = href.match(/licenses\/(by(?:-nc)?(?:-sa)?(?:-nd)?)\/([\d.]+)/i);
                if (ccMatch) {
                    return {
                        name: `CC ${ccMatch[1].toUpperCase()} ${ccMatch[2]}`,
                        url: href,
                        confidence: 0.95,
                    };
                }
            }
        }
        // Check meta tags
        const licenseMeta = $('meta[name="license"], meta[property="dc:license"], meta[name="dc.rights"]');
        if (licenseMeta.length > 0) {
            const content = licenseMeta.first().attr('content');
            if (content) {
                return {
                    name: content,
                    confidence: 0.7,
                };
            }
        }
        return { confidence: 0 };
    }
    /**
     * Generate a deterministic slug from a string
     */
    slugify(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    /**
     * Resolve a relative URL against a base URL
     */
    resolveUrl(relative, base) {
        try {
            return new URL(relative, base).href;
        }
        catch {
            return relative;
        }
    }
    /**
     * Flatten a TOC tree into an array
     */
    flattenToc(nodes) {
        const result = [];
        const flatten = (items) => {
            for (const item of items) {
                const { children, ...node } = item;
                result.push(node);
                if (children && children.length > 0) {
                    flatten(children);
                }
            }
        };
        flatten(nodes);
        return result;
    }
    /**
     * Log adapter activity
     */
    log(level, action, message, extra) {
        logger_1.logger[level](action, `[${this.sourceType}] ${message}`, extra ? { details: extra } : undefined);
    }
}
exports.BaseAdapter = BaseAdapter;
