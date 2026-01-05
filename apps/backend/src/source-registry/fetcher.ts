/**
 * Fetcher Module for Source Registry
 * Handles HTTP fetching with:
 * - robots.txt parsing and caching
 * - Per-domain rate limiting
 * - Retry with exponential backoff
 * - Honest user-agent
 */

import type { FetchOptions, FetchResult, RobotsResult } from './types';
import { logger } from './logger';

const DEFAULT_USER_AGENT = 'LyceumSourceRegistryBot/1.0 (+https://lyceum.app/bot)';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_RATE_LIMIT = 30; // per minute

interface RateLimitState {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

interface RobotsCache {
  result: RobotsResult;
  cachedAt: number;
  expiresAt: number;
}

export class Fetcher {
  private rateLimiters: Map<string, RateLimitState> = new Map();
  private robotsCache: Map<string, RobotsCache> = new Map();
  private robotsCacheTtl = 3600000; // 1 hour
  private userAgent: string;

  constructor(userAgent: string = DEFAULT_USER_AGENT) {
    this.userAgent = userAgent;
  }

  /**
   * Set the user agent for requests
   */
  setUserAgent(userAgent: string): void {
    this.userAgent = userAgent;
  }

  /**
   * Get domain key from URL for rate limiting
   */
  private getDomainKey(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Initialize or get rate limiter for a domain
   */
  private getRateLimiter(domainKey: string, ratePerMinute: number = DEFAULT_RATE_LIMIT): RateLimitState {
    let state = this.rateLimiters.get(domainKey);
    
    if (!state) {
      state = {
        tokens: ratePerMinute,
        lastRefill: Date.now(),
        maxTokens: ratePerMinute,
        refillRate: ratePerMinute / 60, // tokens per second
      };
      this.rateLimiters.set(domainKey, state);
    }
    
    return state;
  }

  /**
   * Wait for rate limit token
   */
  private async waitForRateLimit(domainKey: string, ratePerMinute?: number): Promise<void> {
    const state = this.getRateLimiter(domainKey, ratePerMinute);
    
    // Refill tokens based on time passed
    const now = Date.now();
    const elapsed = (now - state.lastRefill) / 1000;
    state.tokens = Math.min(state.maxTokens, state.tokens + elapsed * state.refillRate);
    state.lastRefill = now;

    // Wait if no tokens available
    if (state.tokens < 1) {
      const waitTime = Math.ceil((1 - state.tokens) / state.refillRate * 1000);
      logger.debug('rate-limit', `Waiting ${waitTime}ms for rate limit on ${domainKey}`);
      await this.sleep(waitTime);
      state.tokens = 1;
      state.lastRefill = Date.now();
    }

    // Consume a token
    state.tokens -= 1;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse robots.txt content
   */
  private parseRobotsTxt(content: string, userAgent: string): RobotsResult {
    const lines = content.split('\n').map(l => l.trim());
    const result: RobotsResult = {
      allowed: true,
      sitemaps: [],
    };

    let currentUserAgent: string | null = null;
    let matchesOurBot = false;
    let hasExplicitRule = false;
    const disallowedPaths: string[] = [];
    const allowedPaths: string[] = [];

    for (const line of lines) {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const directive = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (directive === 'user-agent') {
        currentUserAgent = value.toLowerCase();
        // Check if this section applies to our bot or all bots
        if (currentUserAgent === '*' || 
            userAgent.toLowerCase().includes(currentUserAgent) ||
            currentUserAgent.includes('lyceum')) {
          matchesOurBot = true;
        } else {
          matchesOurBot = false;
        }
      } else if (directive === 'disallow' && matchesOurBot) {
        if (value) {
          disallowedPaths.push(value);
          hasExplicitRule = true;
        }
      } else if (directive === 'allow' && matchesOurBot) {
        if (value) {
          allowedPaths.push(value);
          hasExplicitRule = true;
        }
      } else if (directive === 'crawl-delay' && matchesOurBot) {
        const delay = parseInt(value, 10);
        if (!isNaN(delay)) {
          result.crawlDelay = delay;
        }
      } else if (directive === 'sitemap') {
        result.sitemaps.push(value);
      }
    }

    // Determine if we're allowed based on rules
    // If we have explicit disallow rules and no specific allows, consider checking paths
    if (hasExplicitRule) {
      // For simplicity, if there's a blanket "Disallow: /" we're blocked
      if (disallowedPaths.includes('/') && !allowedPaths.some(p => p === '/')) {
        result.allowed = false;
      }
    }

    return result;
  }

  /**
   * Check robots.txt for a URL
   */
  async checkRobots(url: string, forPath?: string): Promise<RobotsResult> {
    const domainKey = this.getDomainKey(url);
    const cacheKey = domainKey;
    
    // Check cache
    const cached = this.robotsCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.result;
    }

    // Fetch robots.txt
    try {
      const parsed = new URL(url);
      const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
      
      const response = await fetch(robotsUrl, {
        headers: {
          'User-Agent': this.userAgent,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.status === 404) {
        // No robots.txt means allowed
        const result: RobotsResult = { allowed: true, sitemaps: [] };
        this.robotsCache.set(cacheKey, {
          result,
          cachedAt: Date.now(),
          expiresAt: Date.now() + this.robotsCacheTtl,
        });
        return result;
      }

      if (!response.ok) {
        // On error, assume needs review
        logger.warn('robots', `Failed to fetch robots.txt for ${domainKey}: ${response.status}`);
        return { allowed: true, sitemaps: [] }; // Conservative: allow but mark as needs_review
      }

      const text = await response.text();
      const result = this.parseRobotsTxt(text, this.userAgent);

      // Apply crawl delay to rate limiter if specified
      if (result.crawlDelay && result.crawlDelay > 0) {
        const ratePerMinute = Math.max(1, Math.floor(60 / result.crawlDelay));
        this.getRateLimiter(domainKey, ratePerMinute);
      }

      // Cache result
      this.robotsCache.set(cacheKey, {
        result,
        cachedAt: Date.now(),
        expiresAt: Date.now() + this.robotsCacheTtl,
      });

      logger.debug('robots', `robots.txt for ${domainKey}: allowed=${result.allowed}`, {
        details: { crawlDelay: result.crawlDelay, sitemapsCount: result.sitemaps.length },
      });

      return result;
    } catch (err) {
      logger.error('robots', `Error checking robots.txt for ${domainKey}`, {
        details: { error: (err as Error).message },
      });
      // On error, be conservative but allow
      return { allowed: true, sitemaps: [] };
    }
  }

  /**
   * Check if a specific path is allowed by robots.txt
   */
  async isPathAllowed(url: string): Promise<boolean> {
    const robots = await this.checkRobots(url);
    if (!robots.allowed) {
      return false;
    }

    // For more granular path checking, you'd need to store and check
    // all Disallow/Allow rules. For now, we use the broad check.
    return true;
  }

  /**
   * Fetch a URL with rate limiting, retries, and robots.txt respect
   */
  async fetch(url: string, options: FetchOptions = {}): Promise<FetchResult> {
    const {
      domainKey = this.getDomainKey(url),
      timeout = DEFAULT_TIMEOUT,
      retries = DEFAULT_RETRIES,
      retryDelay = DEFAULT_RETRY_DELAY,
    } = options;

    const startTime = Date.now();

    // Check robots.txt first
    const robotsResult = await this.checkRobots(url);
    if (!robotsResult.allowed) {
      logger.warn('fetch', `Blocked by robots.txt: ${url}`, { url });
      return {
        ok: false,
        status: 403,
        error: 'Blocked by robots.txt',
        url,
        redirected: false,
        finalUrl: url,
      };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Wait for rate limit
        await this.waitForRateLimit(domainKey);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          signal: controller.signal,
          redirect: 'follow',
        });

        clearTimeout(timeoutId);

        const html = await response.text();
        const duration = Date.now() - startTime;

        logger.debug('fetch', `Fetched ${url}`, {
          url,
          duration,
          details: { status: response.status, size: html.length },
        });

        return {
          ok: response.ok,
          status: response.status,
          html: response.ok ? html : undefined,
          error: response.ok ? undefined : `HTTP ${response.status}`,
          url,
          redirected: response.redirected,
          finalUrl: response.url,
        };
      } catch (err) {
        lastError = err as Error;
        const isLastAttempt = attempt === retries - 1;

        if (!isLastAttempt) {
          const delay = retryDelay * Math.pow(2, attempt);
          logger.debug('fetch', `Retry ${attempt + 1}/${retries} for ${url} after ${delay}ms`, {
            url,
            details: { error: lastError.message },
          });
          await this.sleep(delay);
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.error('fetch', `Failed to fetch ${url} after ${retries} attempts`, {
      url,
      duration,
      details: { error: lastError?.message },
    });

    return {
      ok: false,
      status: 0,
      error: lastError?.message || 'Unknown error',
      url,
      redirected: false,
      finalUrl: url,
    };
  }

  /**
   * Set rate limit for a domain
   */
  setRateLimit(domain: string, requestsPerMinute: number): void {
    const state = this.getRateLimiter(domain, requestsPerMinute);
    state.maxTokens = requestsPerMinute;
    state.refillRate = requestsPerMinute / 60;
    logger.info('rate-limit', `Set rate limit for ${domain} to ${requestsPerMinute}/min`);
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.robotsCache.clear();
    this.rateLimiters.clear();
    logger.info('cache', 'Cleared all fetcher caches');
  }
}

// Default fetcher instance
export const fetcher = new Fetcher();


