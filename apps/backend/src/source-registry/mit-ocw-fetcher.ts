/**
 * MIT OpenCourseWare Fetcher
 * Discovers and fetches MIT OCW courses on-demand
 * 
 * This enables path generation using MIT's open course materials.
 * Content is fetched live and cached in the registry for future use.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Asset, TocNode, AssetCandidate } from './types';
import type { TocNodeSummary } from './module-grounding-types';
import { mitOcwAdapter } from './adapters';
import { logger } from './logger';

export interface MitOcwCourse {
  slug: string;
  title: string;
  description?: string;
  url: string;
  courseNumber: string;
  department?: string;
  level?: string;
  topics: string[];
}

export interface CourseMatchResult {
  course: MitOcwCourse;
  score: number;
  matchedTerms: string[];
}

/**
 * MIT OCW Fetcher Service
 * Fetches content from MIT OpenCourseWare on-demand
 */
export class MitOcwFetcher {
  private supabase: SupabaseClient;
  private coursesCache: MitOcwCourse[] | null = null;
  private coursesCacheTime: number = 0;
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Fetch all available MIT OCW courses
   */
  async getMitOcwCourses(forceRefresh = false): Promise<MitOcwCourse[]> {
    // Return cached if valid
    if (!forceRefresh && this.coursesCache && Date.now() - this.coursesCacheTime < this.CACHE_TTL) {
      return this.coursesCache;
    }

    logger.info('mit-ocw-fetch', 'Fetching MIT OCW course catalog');

    try {
      const candidates = await mitOcwAdapter.discoverAssets('https://ocw.mit.edu');
      
      this.coursesCache = candidates.map(c => ({
        slug: c.slug,
        title: c.title,
        description: c.description,
        url: c.url,
        courseNumber: (c.metadata?.courseNumber as string) || '',
        department: c.metadata?.department as string | undefined,
        level: c.metadata?.level as string | undefined,
        topics: (c.metadata?.topics as string[]) || [],
      }));
      this.coursesCacheTime = Date.now();

      logger.info('mit-ocw-fetch', `Cached ${this.coursesCache.length} MIT OCW courses`);
      return this.coursesCache;

    } catch (error) {
      logger.error('mit-ocw-fetch', `Failed to fetch MIT OCW courses: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Search for MIT OCW courses matching a topic/query
   */
  async searchCoursesByTopic(topic: string): Promise<CourseMatchResult[]> {
    const courses = await this.getMitOcwCourses();
    const results: CourseMatchResult[] = [];

    // Normalize and tokenize the topic
    const topicTerms = this.tokenize(topic);
    
    for (const course of courses) {
      const score = this.calculateMatchScore(course, topicTerms);
      if (score.score > 0) {
        results.push({
          course,
          score: score.score,
          matchedTerms: score.matchedTerms,
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    logger.info('mit-ocw-fetch', `Found ${results.length} matching MIT OCW courses for "${topic}"`, {
      details: { topMatches: results.slice(0, 3).map(r => r.course.title) }
    });

    return results;
  }

  /**
   * Get the best matching MIT OCW course for a topic
   */
  async findBestCourse(topic: string): Promise<MitOcwCourse | null> {
    const results = await this.searchCoursesByTopic(topic);
    
    // Require score >= 10 for reasonable confidence
    if (results.length > 0 && results[0].score >= 10) {
      return results[0].course;
    }
    
    return null;
  }

  /**
   * Get or create an asset in the registry for a MIT OCW course
   */
  async getOrCreateAsset(course: MitOcwCourse): Promise<Asset> {
    console.log(`[MitOcwFetch] Looking for existing asset: ${course.slug}`);
    
    // Check if asset already exists
    const { data: existing } = await this.supabase
      .from('source_registry_assets')
      .select('*')
      .eq('slug', course.slug)
      .single();

    if (existing) {
      console.log(`[MitOcwFetch] ✓ Found existing asset (ID: ${existing.id})`);
      return existing as Asset;
    }

    // Get or create MIT OCW source
    const source = await this.getOrCreateMitOcwSource();
    console.log(`[MitOcwFetch] Using source: ${source.name} (ID: ${source.id})`);

    // Create the asset
    const { data: created, error } = await this.supabase
      .from('source_registry_assets')
      .insert({
        source_id: source.id,
        slug: course.slug,
        title: course.title,
        url: course.url,
        description: course.description,
        license_name: 'CC BY-NC-SA 4.0',
        license_url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
        license_confidence: 0.85,
        robots_status: 'allowed',
        active: true,
        scan_status: 'idle',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create MIT OCW asset: ${error.message}`);
    }

    console.log(`[MitOcwFetch] ✓ Created new asset (ID: ${created.id})`);
    logger.info('mit-ocw-fetch', `Created asset for ${course.title}`, { details: { assetId: created.id } });

    return created as Asset;
  }

  /**
   * Get or create the MIT OCW source
   */
  private async getOrCreateMitOcwSource() {
    const { data: existing } = await this.supabase
      .from('source_registry_sources')
      .select('*')
      .eq('name', 'MIT OpenCourseWare')
      .single();

    if (existing) return existing;

    const { data: created, error } = await this.supabase
      .from('source_registry_sources')
      .insert({
        name: 'MIT OpenCourseWare',
        type: 'mit_ocw',
        base_url: 'https://ocw.mit.edu',
        description: 'Free and open educational resources from MIT courses',
        license_name: 'CC BY-NC-SA 4.0',
        license_url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
        license_confidence: 0.85,
        robots_status: 'allowed',
        rate_limit_per_minute: 30,
        scan_status: 'idle',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create MIT OCW source: ${error.message}`);
    }

    return created;
  }

  /**
   * Fetch TOC for an asset, either from registry or live from MIT OCW
   */
  async getTocForAsset(asset: Asset): Promise<TocNode[]> {
    console.log(`[MitOcwFetch] Checking for cached TOC for: ${asset.title}`);
    
    // First check if we have TOC in registry
    const { data: existingNodes } = await this.supabase
      .from('source_registry_nodes')
      .select('*')
      .eq('asset_id', asset.id)
      .order('sort_order');

    if (existingNodes && existingNodes.length > 0) {
      console.log(`[MitOcwFetch] ✓ Found cached TOC in database (${existingNodes.length} nodes)`);
      logger.info('mit-ocw-fetch', `Using cached TOC for ${asset.title} (${existingNodes.length} nodes)`);
      return existingNodes as TocNode[];
    }

    // Fetch TOC live from MIT OCW
    console.log(`[MitOcwFetch] TOC not in database. Fetching live from MIT OCW...`);
    console.log(`[MitOcwFetch] Scraping: ${asset.url}`);
    logger.info('mit-ocw-fetch', `Fetching TOC live for ${asset.title}`);

    const candidate: AssetCandidate = {
      slug: asset.slug,
      title: asset.title,
      url: asset.url,
      description: asset.description || undefined,
    };

    const tocNodes = await mitOcwAdapter.mapToc(candidate, 'https://ocw.mit.edu');

    if (tocNodes.length === 0) {
      console.log(`[MitOcwFetch] ⚠️ No TOC nodes extracted`);
      return [];
    }

    console.log(`[MitOcwFetch] ✓ Extracted ${tocNodes.length} TOC nodes`);
    
    // Save to registry for future use
    const savedNodes = await this.saveTocToRegistry(asset.id, tocNodes);
    console.log(`[MitOcwFetch] ✓ Saved TOC to registry`);

    return savedNodes;
  }

  /**
   * Save TOC nodes to registry
   */
  private async saveTocToRegistry(assetId: string, nodes: TocNode[]): Promise<TocNode[]> {
    if (nodes.length === 0) return [];

    // Add asset_id to each node and remove any existing id field
    const nodesToInsert = nodes.map(node => {
      const { id, ...nodeWithoutId } = node; // Remove id if it exists
      return {
        ...nodeWithoutId,
        asset_id: assetId,
        parent_id: null, // Nodes are flattened for now
      };
    });

    const { data, error } = await this.supabase
      .from('source_registry_nodes')
      .insert(nodesToInsert)
      .select();

    if (error) {
      logger.error('mit-ocw-fetch', `Failed to save TOC nodes: ${error.message}`);
      throw new Error(`Failed to save TOC: ${error.message}`);
    }

    logger.info('mit-ocw-fetch', `Saved ${nodes.length} TOC nodes to registry`);
    return data as TocNode[];
  }

  /**
   * Get TOC summaries for AI consumption
   */
  async getTocSummaries(asset: Asset): Promise<TocNodeSummary[]> {
    const nodes = await this.getTocForAsset(asset);
    
    return nodes.map(node => ({
      node_id: node.id || '',
      title: node.title,
      order: node.sort_order,
      depth: node.depth,
      node_type: node.node_type,
    }));
  }

  /**
   * Tokenize text into searchable terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  /**
   * Calculate match score between course and search terms
   */
  private calculateMatchScore(course: MitOcwCourse, terms: string[]): { score: number; matchedTerms: string[] } {
    const matchedTerms: string[] = [];
    let score = 0;

    const titleTokens = this.tokenize(course.title);
    const descTokens = this.tokenize(course.description || '');
    const topicTokens = course.topics.flatMap(t => this.tokenize(t));
    const deptTokens = this.tokenize(course.department || '');

    for (const term of terms) {
      // Exact match in title (highest weight)
      if (titleTokens.includes(term)) {
        score += 15;
        matchedTerms.push(term);
        continue;
      }

      // Match in topics (high weight)
      if (topicTokens.includes(term)) {
        score += 10;
        matchedTerms.push(term);
        continue;
      }

      // Match in department
      if (deptTokens.includes(term)) {
        score += 8;
        matchedTerms.push(term);
        continue;
      }

      // Match in description (lower weight)
      if (descTokens.includes(term)) {
        score += 5;
        matchedTerms.push(term);
      }
    }

    // Bonus for multiple matches
    if (matchedTerms.length > 1) {
      score += matchedTerms.length * 2;
    }

    return { score, matchedTerms };
  }
}
