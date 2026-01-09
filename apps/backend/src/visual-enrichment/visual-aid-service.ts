/**
 * Visual Aid Service
 * 
 * Fetches candidate images based on VisualIntent specifications.
 * Filters results to ensure only educational diagrams/illustrations
 * are returned - no photos, no proprietary screenshots.
 * 
 * CRITICAL:
 * - Returns at most 3 VisualAid objects per intent
 * - All VisualAids have usage_label = "illustrative"
 * - Images are NOT persisted long-term
 * - This is a supplemental layer - graceful degradation on failure
 */

import type {
  VisualIntent,
  VisualAid,
  VisualAidResult,
  VisualFetchConfig,
} from './types';
import { DEFAULT_VISUAL_FETCH_CONFIG, VISUAL_CAPTION_SUFFIX } from './types';
import { logger } from '../source-registry/logger';

/**
 * Image search result from an external API
 */
interface ImageSearchResult {
  url: string;
  thumbnail_url?: string;
  title?: string;
  source?: string;
  width?: number;
  height?: number;
}

/**
 * VisualAidService fetches and filters candidate images for modules.
 */
export class VisualAidService {
  private config: VisualFetchConfig;

  constructor(config: Partial<VisualFetchConfig> = {}) {
    this.config = { ...DEFAULT_VISUAL_FETCH_CONFIG, ...config };
  }

  /**
   * Fetch visual aids for a list of visual intents.
   * 
   * @param intents - Array of VisualIntent objects
   * @returns VisualAidResult with fetched aids and any failures
   */
  async fetchVisualAids(intents: VisualIntent[]): Promise<VisualAidResult> {
    const startTime = Date.now();
    
    logger.info('visual-aid-service', `Fetching visual aids for ${intents.length} intents`);

    const allVisualAids: VisualAid[] = [];
    const failedIntents: VisualAidResult['failed_intents'] = [];

    // Process intents sequentially to avoid rate limiting
    for (const intent of intents) {
      try {
        const aids = await this.fetchForIntent(intent);
        
        if (aids.length > 0) {
          allVisualAids.push(...aids);
          logger.debug('visual-aid-service', `Found ${aids.length} visuals for: "${intent.concept}"`);
        } else {
          failedIntents.push({
            intent,
            reason: 'No suitable images found',
          });
          logger.debug('visual-aid-service', `No suitable visuals for: "${intent.concept}"`);
        }
      } catch (error) {
        failedIntents.push({
          intent,
          reason: (error as Error).message,
        });
        logger.warn('visual-aid-service', `Failed to fetch visuals for: "${intent.concept}"`, {
          details: { error: (error as Error).message },
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('visual-aid-service', `Visual aid fetch complete`, {
      duration,
      details: {
        total_intents: intents.length,
        successful: allVisualAids.length,
        failed: failedIntents.length,
      },
    });

    return {
      visual_aids: allVisualAids,
      failed_intents: failedIntents,
      has_visuals: allVisualAids.length > 0,
      fetched_at: new Date().toISOString(),
    };
  }

  /**
   * Fetch visual aids for a single intent
   */
  private async fetchForIntent(intent: VisualIntent): Promise<VisualAid[]> {
    // Try multiple query strategies with fallbacks
    const queries = this.buildSearchQueries(intent);
    
    for (const query of queries) {
      const candidates = await this.searchImages(query);
      
      if (candidates.length > 0) {
        // Filter candidates for relevance and appropriateness
        // This returns only high-quality, scored results
        const filtered = this.filterCandidates(candidates, intent);
        
        if (filtered.length > 0) {
          // Convert to VisualAid objects (max configured per intent)
          const visualAids = filtered
            .slice(0, this.config.max_per_intent)
            .map(candidate => this.toVisualAid(candidate, intent));

          logger.debug('visual-aid-service', `Found ${visualAids.length} quality images with query: "${query}"`);
          return visualAids;
        } else {
          logger.debug('visual-aid-service', `Query "${query}" returned ${candidates.length} results but none met quality standards`);
        }
      }
    }
    
    logger.debug('visual-aid-service', `No quality images found after trying ${queries.length} queries for: "${intent.concept}"`);
    return [];
  }

  /**
   * Build multiple search queries with fallbacks for better results
   */
  private buildSearchQueries(intent: VisualIntent): string[] {
    const queries: string[] = [];
    
    // Extract key terms from the concept (first 2-3 words typically most relevant)
    const conceptWords = intent.concept
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'how', 'what', 'calculating', 'understanding'].includes(w))
      .slice(0, 3);
    
    // Strategy 1: Wikipedia article (best for contextual educational images)
    if (conceptWords.length >= 2) {
      queries.push(`${conceptWords.slice(0, 2).join(' ')}`);
    }
    
    // Strategy 2: Labeled diagram (most specific - highest quality results)
    if (conceptWords.length >= 2) {
      queries.push(`${conceptWords.slice(0, 2).join(' ')} labeled`);
    }
    
    // Strategy 3: Formula/calculation diagram (for math concepts)
    if (conceptWords.length >= 1 && (intent.concept.toLowerCase().includes('area') || 
                                      intent.concept.toLowerCase().includes('formula') ||
                                      intent.concept.toLowerCase().includes('equation'))) {
      queries.push(`${conceptWords[0]} formula`);
    }
    
    // Strategy 4: Simple concept + diagram (broader fallback)
    if (conceptWords.length >= 1) {
      queries.push(`${conceptWords.join(' ')} diagram`);
    }
    
    // Strategy 5: Just the main concept (broadest search)
    if (conceptWords.length >= 1 && conceptWords[0].length > 3) {
      queries.push(`${conceptWords[0]}`);
    }
    
    logger.debug('visual-aid-service', `Generated ${queries.length} search queries`, { 
      details: { queries, concept: intent.concept } 
    });
    
    return queries;
  }

  /**
   * Build optimized search query for educational diagrams
   * @deprecated Use buildSearchQueries for better fallback support
   */
  private buildSearchQuery(intent: VisualIntent): string {
    let query = intent.search_query;

    // Ensure query focuses on diagrams/illustrations
    const educationalTerms = ['educational', 'diagram', 'illustration'];
    const hasEducationalTerm = educationalTerms.some(term => 
      query.toLowerCase().includes(term)
    );

    if (!hasEducationalTerm) {
      query = `educational ${query}`;
    }

    // Add visual type if not already present
    if (!query.toLowerCase().includes(intent.visual_type)) {
      query = `${query} ${intent.visual_type}`;
    }

    return query;
  }

  /**
   * Search for images using available APIs.
   * 
   * This implementation uses:
   * - Wikimedia Commons API (free, CC-licensed educational images)
   * - Wikipedia article images (contextual educational images)
   * 
   * For MVP, we gracefully degrade if no sources are available.
   */
  private async searchImages(query: string): Promise<ImageSearchResult[]> {
    try {
      // Try Wikimedia Commons first (free educational images and diagrams)
      const wikimediaResults = await this.searchWikimediaCommons(query);
      if (wikimediaResults.length > 0) {
        return wikimediaResults;
      }

      // Fallback: Try Wikipedia article images (more contextual)
      const wikipediaResults = await this.searchWikipediaImages(query);
      if (wikipediaResults.length > 0) {
        return wikipediaResults;
      }

      // No results from any source
      logger.debug('visual-aid-service', `No images found for query: "${query}"`);
      return [];

    } catch (error) {
      logger.warn('visual-aid-service', `Image search failed: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Search Wikimedia Commons for educational images.
   * This uses the free Wikimedia API which has many educational diagrams.
   */
  private async searchWikimediaCommons(query: string): Promise<ImageSearchResult[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout_ms);

    try {
      // Wikimedia Commons API endpoint
      // Note: removed filetype:bitmap to get more results including SVG diagrams
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrsearch: query,
        gsrlimit: '15',
        gsrnamespace: '6', // File namespace
        prop: 'imageinfo',
        iiprop: 'url|size|extmetadata|mime',
        iiurlwidth: '400',
        origin: '*',
      });

      const url = `https://commons.wikimedia.org/w/api.php?${params}`;
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Lyceum Educational Platform (https://lyceum.app)',
        },
      });

      if (!response.ok) {
        throw new Error(`Wikimedia API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.query?.pages) {
        return [];
      }

      const results: ImageSearchResult[] = [];
      
      for (const page of Object.values(data.query.pages) as any[]) {
        if (!page.imageinfo?.[0]) continue;

        const info = page.imageinfo[0];
        
        // Only include images with reasonable dimensions
        if (info.width < this.config.min_width || info.height < this.config.min_height) {
          continue;
        }

        results.push({
          url: info.url,
          thumbnail_url: info.thumburl,
          title: page.title?.replace('File:', '') || '',
          source: 'Wikimedia Commons',
          width: info.width,
          height: info.height,
        });
      }

      return results;

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('Image search timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Search Wikipedia for educational images within articles
   * Often these have better context and labeling than Commons
   */
  private async searchWikipediaImages(query: string): Promise<ImageSearchResult[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout_ms);

    try {
      // Search for Wikipedia articles related to the query
      const searchParams = new URLSearchParams({
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: query,
        srlimit: '5',
        origin: '*',
      });

      const searchUrl = `https://en.wikipedia.org/w/api.php?${searchParams}`;
      
      const searchResponse = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Lyceum Educational Platform (https://lyceum.app)',
        },
      });

      if (!searchResponse.ok) {
        return [];
      }

      const searchData = await searchResponse.json();
      const searchResults = searchData.query?.search || [];
      
      if (searchResults.length === 0) {
        return [];
      }

      // Get images from the top article
      const topArticle = searchResults[0];
      const pageParams = new URLSearchParams({
        action: 'query',
        format: 'json',
        prop: 'images|imageinfo',
        titles: topArticle.title,
        iiprop: 'url|size',
        iiurlwidth: '400',
        origin: '*',
      });

      const pageUrl = `https://en.wikipedia.org/w/api.php?${pageParams}`;
      const pageResponse = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Lyceum Educational Platform (https://lyceum.app)',
        },
      });

      if (!pageResponse.ok) {
        return [];
      }

      const pageData = await pageResponse.json();
      const pages = pageData.query?.pages || {};
      
      const results: ImageSearchResult[] = [];
      
      for (const page of Object.values(pages) as any[]) {
        if (!page.images) continue;

        for (const image of page.images.slice(0, 10)) {
          // Fetch imageinfo for each image
          const imgParams = new URLSearchParams({
            action: 'query',
            format: 'json',
            prop: 'imageinfo',
            titles: image.title,
            iiprop: 'url|size',
            iiurlwidth: '400',
            origin: '*',
          });

          try {
            const imgUrl = `https://en.wikipedia.org/w/api.php?${imgParams}`;
            const imgResponse = await fetch(imgUrl, { signal: controller.signal });
            const imgData = await imgResponse.json();
            
            const imgPages = imgData.query?.pages || {};
            for (const imgPage of Object.values(imgPages) as any[]) {
              if (!imgPage.imageinfo?.[0]) continue;
              
              const info = imgPage.imageinfo[0];
              
              // Filter out small images and common UI elements
              if (info.width < this.config.min_width || info.height < this.config.min_height) {
                continue;
              }
              
              results.push({
                url: info.url,
                thumbnail_url: info.thumburl,
                title: image.title?.replace('File:', '') || '',
                source: `Wikipedia: ${topArticle.title}`,
                width: info.width,
                height: info.height,
              });
            }
          } catch (e) {
            // Skip this image on error
            continue;
          }
        }
        
        // Only process first page
        break;
      }

      return results;

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logger.debug('visual-aid-service', 'Wikipedia image search timed out');
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Filter candidates to only include appropriate and RELEVANT educational diagrams
   */
  private filterCandidates(candidates: ImageSearchResult[], intent: VisualIntent): ImageSearchResult[] {
    // Extract key terms from the concept for relevance matching
    const conceptTerms = this.extractKeyTerms(intent.concept);
    const queryTerms = this.extractKeyTerms(intent.search_query);
    const allRelevantTerms = [...new Set([...conceptTerms, ...queryTerms])];
    
    logger.debug('visual-aid-service', `Filtering with relevance terms: ${allRelevantTerms.join(', ')}`);

    const filtered = candidates.filter(candidate => {
      const title = candidate.title?.toLowerCase() || '';
      
      // Filter out photos
      const photoTerms = ['photo', 'photograph', 'picture of', 'image of', 'jpg', 'jpeg'];
      if (photoTerms.some(term => title.includes(term))) {
        logger.debug('visual-aid-service', `Rejected (photo): "${title}"`);
        return false;
      }

      // Filter out obviously irrelevant content
      const irrelevantTerms = [
        'logo', 'icon', 'flag', 'coat of arms', 'portrait', 'screenshot', 'map',
        'texture', 'pattern', 'background', 'wallpaper', 'tile', 'fabric', 
        'design', 'decoration', 'abstract art', 'seamless', 'vector art',
        'stock image', 'stock photo', 'clipart', 'lethal', 'weapon', 'soldier',
        'military', 'torso', 'target'
      ];
      if (irrelevantTerms.some(term => title.includes(term))) {
        logger.debug('visual-aid-service', `Rejected (irrelevant type): "${title}"`);
        return false;
      }
      
      // Filter out images with "stripe", "striped", "lines", "divided into", "sections" 
      // unless they're explicitly labeled as educational diagrams
      const genericPatternTerms = ['stripe', 'striped', 'stripes', 'lines pattern', 'divided into', 'sections', 'parallel lines'];
      const hasDiagramLabel = title.includes('diagram') || title.includes('illustration') || title.includes('chart');
      if (genericPatternTerms.some(term => title.includes(term)) && !hasDiagramLabel) {
        logger.debug('visual-aid-service', `Rejected (generic pattern without diagram label): "${title}"`);
        return false;
      }
      
      // Filter out specialized/advanced mathematical concepts when searching for basic concepts
      // "moment of area" is engineering (second moment), not basic area calculation
      // "segmented" golden/silver rectangles are about ratios, not area
      // "parabola", "integral", "riemann" are calculus concepts, not basic geometry
      // "equal area", "same area" are comparison diagrams, not calculation formulas
      const specializedTerms = [
        'moment of', 'whirl', 'segmented', 'supersilver', 'supergolden', 
        'golden rectangle', 'silver rectangle', 'parabola', 'integral', 
        'riemann', 'curve', 'calculus', 'connection with', 'relationship between',
        'equal area', 'same area', 'rectangles of area' // comparison diagrams
      ];
      if (specializedTerms.some(term => title.includes(term))) {
        // Only reject if we're looking for basic concepts (check if query contains basic terms)
        const searchingForBasic = (intent.search_query.toLowerCase().includes('area') ||
                                   intent.search_query.toLowerCase().includes('formula') ||
                                   intent.search_query.toLowerCase().includes('calculation')) && 
                                 !intent.search_query.toLowerCase().includes('moment') &&
                                 !intent.search_query.toLowerCase().includes('calculus') &&
                                 !intent.search_query.toLowerCase().includes('equal');
        if (searchingForBasic) {
          logger.debug('visual-aid-service', `Rejected (too specialized/comparison for basic calculation): "${title}"`);
          return false;
        }
      }
      
      // Reject images about wrong shapes (e.g., circles when searching for rectangles)
      if (allRelevantTerms.includes('rectangle') && title.includes('circle')) {
        logger.debug('visual-aid-service', `Rejected (wrong shape - circle vs rectangle): "${title}"`);
        return false;
      }
      
      if (allRelevantTerms.includes('circle') && title.includes('rectangle')) {
        logger.debug('visual-aid-service', `Rejected (wrong shape - rectangle vs circle): "${title}"`);
        return false;
      }

      // CRITICAL: Smart matching - prefer multiple terms, but allow 1 term if it's a quality diagram
      const matchingTerms = allRelevantTerms.filter(term => 
        term.length >= 3 && title.includes(term)
      );
      
      // Check if this has strong educational indicators
      const strongEducationalTerms = ['labeled', 'label', 'formula', 'diagram', 'illustration', 'calculation'];
      const hasStrongEducationalTerm = strongEducationalTerms.some(term => title.includes(term));
      
      // Accept if: (1) Has multiple matches, OR (2) Has 1 match + strong educational term
      const minRequiredMatches = hasStrongEducationalTerm ? 1 : 2;
      const hasRelevantTerm = matchingTerms.length >= minRequiredMatches;
      
      if (!hasRelevantTerm) {
        logger.debug('visual-aid-service', `Rejected (insufficient matches - need ${minRequiredMatches}, got ${matchingTerms.length}, has educational term: ${hasStrongEducationalTerm}): "${title}"`);
        return false;
      }

      // Size requirements
      const meetsSize = (candidate.width || 0) >= this.config.min_width &&
                       (candidate.height || 0) >= this.config.min_height;

      if (!meetsSize) {
        logger.debug('visual-aid-service', `Rejected (size): "${title}"`);
        return false;
      }

      logger.debug('visual-aid-service', `Accepted: "${title}"`);
      return true;
    });

    // CRITICAL: Sort by relevance score - images with more matching terms should rank higher
    const scored = filtered.map(candidate => {
      const title = candidate.title?.toLowerCase() || '';
      
      // Count how many relevant terms appear in the title
      const matchCount = allRelevantTerms.filter(term => 
        term.length >= 3 && title.includes(term)
      ).length;
      
      // HIGH PRIORITY: Labeled diagrams and formula explanations
      const highPriorityTerms = ['labeled', 'label', 'formula', 'equation', 'calculation', 'how to calculate', 'computing'];
      const hasHighPriorityTerm = highPriorityTerms.some(term => title.includes(term));
      const highPriorityBonus = hasHighPriorityTerm ? 10 : 0;
      
      // Bonus points for having educational diagram terms in title
      const strongDiagramTerms = ['diagram', 'illustration', 'chart', 'graph', 'schematic'];
      const hasStrongDiagramTerm = strongDiagramTerms.some(term => title.includes(term));
      const strongDiagramBonus = hasStrongDiagramTerm ? 5 : 0;
      
      // Additional bonus for matching visual_type
      const hasVisualType = title.includes(intent.visual_type);
      const visualTypeBonus = hasVisualType ? 2 : 0;
      
      // Penalty for generic file type indicators
      const genericTerms = ['svg', 'png'];
      const hasGenericTerm = genericTerms.some(term => title.includes(term));
      const genericPenalty = hasGenericTerm ? -1 : 0;
      
      // CRITICAL: Heavy penalty for images that match only minimum requirements
      // If matchCount is less than half of relevant terms, heavily penalize
      const insufficientMatchPenalty = matchCount < Math.ceil(allRelevantTerms.length / 2) ? -5 : 0;
      
      const finalScore = matchCount + highPriorityBonus + strongDiagramBonus + visualTypeBonus + genericPenalty + insufficientMatchPenalty;
      
      logger.debug('visual-aid-service', `Scored "${title}": ${finalScore} (matches: ${matchCount}/${allRelevantTerms.length}, high-priority: ${highPriorityBonus}, diagram: ${strongDiagramBonus}, type: ${visualTypeBonus}, generic: ${genericPenalty}, insufficient: ${insufficientMatchPenalty})`);
      
      return {
        candidate,
        score: finalScore
      };
    });

    // Sort by score (highest first) and filter out low-quality results
    const MIN_QUALITY_SCORE = 5; // Require strong educational indicators (formula/labeled) or multiple matches
    const quality = scored
      .sort((a, b) => b.score - a.score)
      .filter(s => s.score >= MIN_QUALITY_SCORE);
    
    if (quality.length === 0) {
      logger.debug('visual-aid-service', `All ${scored.length} candidates scored below quality threshold (${MIN_QUALITY_SCORE})`);
    }
    
    return quality.map(s => s.candidate);
  }

  /**
   * Extract key terms from a string for relevance matching
   */
  private extractKeyTerms(text: string): string[] {
    const stopWords = ['the', 'a', 'an', 'of', 'in', 'on', 'for', 'to', 'and', 'or', 'with', 'how', 'do', 'does', 'what', 'is', 'are', 'calculation', 'calculating', 'diagram', 'illustration', 'educational'];
    
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length >= 3 && !stopWords.includes(word));
  }

  /**
   * Convert an image search result to a VisualAid object
   */
  private toVisualAid(result: ImageSearchResult, intent: VisualIntent): VisualAid {
    return {
      src: result.url,
      alt: `Illustrative ${intent.visual_type} showing ${intent.concept}`,
      usage_label: 'illustrative', // ALWAYS illustrative
      caption: `${intent.concept} ${VISUAL_CAPTION_SUFFIX}`,
      query: intent.search_query,
      intent,
      attribution: result.source ? `Source: ${result.source}` : undefined,
      thumbnail_src: result.thumbnail_url,
    };
  }
}

/**
 * Create a default VisualAidService instance
 */
export function createVisualAidService(config?: Partial<VisualFetchConfig>): VisualAidService {
  return new VisualAidService(config);
}
