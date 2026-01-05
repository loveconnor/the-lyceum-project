/**
 * Base Adapter for Source Registry
 * Provides common functionality for all source adapters
 */

import * as cheerio from 'cheerio';
import type { SourceAdapter, SourceType, AssetCandidate, ValidationResult, TocNode, RobotsStatus, ValidationError, ValidationWarning } from '../types';
import { fetcher, Fetcher } from '../fetcher';
import { logger } from '../logger';

export abstract class BaseAdapter implements SourceAdapter {
  abstract readonly sourceType: SourceType;
  protected fetcher: Fetcher;

  constructor(customFetcher?: Fetcher) {
    this.fetcher = customFetcher || fetcher;
  }

  abstract discoverAssets(seedUrl: string, config?: Record<string, unknown>): Promise<AssetCandidate[]>;
  abstract mapToc(asset: AssetCandidate, baseUrl: string): Promise<TocNode[]>;

  /**
   * Base validation that checks robots.txt and attempts license detection
   */
  async validate(asset: AssetCandidate, baseUrl: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let robots_status: RobotsStatus = 'unknown';
    let license_name: string | undefined;
    let license_url: string | undefined;
    let license_confidence = 0;

    // Check robots.txt
    try {
      const robotsResult = await this.fetcher.checkRobots(asset.url);
      robots_status = robotsResult.allowed ? 'allowed' : 'disallowed';
    } catch (err) {
      robots_status = 'needs_review';
      warnings.push({
        code: 'ROBOTS_CHECK_FAILED',
        message: `Could not verify robots.txt: ${(err as Error).message}`,
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
      } else {
        errors.push({
          code: 'FETCH_FAILED',
          message: `Failed to fetch asset page: ${result.error}`,
          details: { status: result.status },
        });
      }
    } catch (err) {
      errors.push({
        code: 'FETCH_ERROR',
        message: `Error fetching asset: ${(err as Error).message}`,
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
  protected detectLicense(html: string): { name?: string; url?: string; confidence: number } {
    const $ = cheerio.load(html);
    
    // Common license patterns
    const patterns = [
      {
        regex: /Creative Commons Attribution(?:-NonCommercial)?(?:-ShareAlike)?(?:-NoDerivatives)? (\d+\.\d+)/i,
        name: (match: RegExpMatchArray) => `CC ${match[0].replace(/Creative Commons /i, '')}`,
        confidence: 0.9,
      },
      {
        regex: /CC BY(-NC)?(-SA)?(-ND)? (\d+\.\d+)/i,
        name: (match: RegExpMatchArray) => match[0].toUpperCase(),
        confidence: 0.95,
      },
      {
        regex: /MIT License/i,
        name: () => 'MIT License',
        confidence: 0.95,
      },
      {
        regex: /Apache License,? Version (\d+\.\d+)/i,
        name: (match: RegExpMatchArray) => `Apache ${match[1]}`,
        confidence: 0.95,
      },
      {
        regex: /GNU (?:General Public License|GPL)(?: v)?(\d+)?/i,
        name: (match: RegExpMatchArray) => `GPL${match[1] ? ` v${match[1]}` : ''}`,
        confidence: 0.9,
      },
      {
        regex: /BSD (\d)-Clause License/i,
        name: (match: RegExpMatchArray) => `BSD ${match[1]}-Clause`,
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
  protected slugify(text: string): string {
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
  protected resolveUrl(relative: string, base: string): string {
    try {
      return new URL(relative, base).href;
    } catch {
      return relative;
    }
  }

  /**
   * Flatten a TOC tree into an array
   */
  protected flattenToc(nodes: TocNode[]): TocNode[] {
    const result: TocNode[] = [];
    
    const flatten = (items: TocNode[]) => {
      for (const item of items) {
        const { children, ...node } = item;
        result.push(node as TocNode);
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
  protected log(level: 'debug' | 'info' | 'warn' | 'error', action: string, message: string, extra?: Record<string, unknown>): void {
    logger[level](action, `[${this.sourceType}] ${message}`, extra ? { details: extra } : undefined);
  }
}


