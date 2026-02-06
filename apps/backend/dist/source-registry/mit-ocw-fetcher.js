"use strict";
/**
 * MIT OpenCourseWare Fetcher
 * Discovers and fetches MIT OCW courses on-demand
 *
 * This enables path generation using MIT's open course materials.
 * Content is fetched live and cached in the registry for future use.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MitOcwFetcher = void 0;
const adapters_1 = require("./adapters");
const logger_1 = require("./logger");
/**
 * MIT OCW Fetcher Service
 * Fetches content from MIT OpenCourseWare on-demand
 */
class MitOcwFetcher {
    constructor(supabaseClient) {
        this.coursesCache = null;
        this.coursesCacheTime = 0;
        this.CACHE_TTL = 1000 * 60 * 60; // 1 hour
        this.supabase = supabaseClient;
    }
    /**
     * Fetch all available MIT OCW courses
     */
    async getMitOcwCourses(forceRefresh = false) {
        // Return cached if valid
        if (!forceRefresh && this.coursesCache && Date.now() - this.coursesCacheTime < this.CACHE_TTL) {
            return this.coursesCache;
        }
        logger_1.logger.info('mit-ocw-fetch', 'Fetching MIT OCW course catalog');
        try {
            const candidates = await adapters_1.mitOcwAdapter.discoverAssets('https://ocw.mit.edu');
            this.coursesCache = candidates.map(c => ({
                slug: c.slug,
                title: c.title,
                description: c.description,
                url: c.url,
                courseNumber: c.metadata?.courseNumber || '',
                department: c.metadata?.department,
                level: c.metadata?.level,
                topics: c.metadata?.topics || [],
            }));
            this.coursesCacheTime = Date.now();
            logger_1.logger.info('mit-ocw-fetch', `Cached ${this.coursesCache.length} MIT OCW courses`);
            return this.coursesCache;
        }
        catch (error) {
            logger_1.logger.error('mit-ocw-fetch', `Failed to fetch MIT OCW courses: ${error.message}`);
            throw error;
        }
    }
    /**
     * Search for MIT OCW courses matching a topic/query
     */
    async searchCoursesByTopic(topic) {
        const courses = await this.getMitOcwCourses();
        const results = [];
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
        logger_1.logger.info('mit-ocw-fetch', `Found ${results.length} matching MIT OCW courses for "${topic}"`, {
            details: { topMatches: results.slice(0, 3).map(r => r.course.title) }
        });
        return results;
    }
    /**
     * Get the best matching MIT OCW course for a topic
     */
    async findBestCourse(topic) {
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
    async getOrCreateAsset(course) {
        console.log(`[MitOcwFetch] Looking for existing asset: ${course.slug}`);
        // Check if asset already exists
        const { data: existing } = await this.supabase
            .from('source_registry_assets')
            .select('*')
            .eq('slug', course.slug)
            .single();
        if (existing) {
            console.log(`[MitOcwFetch] ✓ Found existing asset (ID: ${existing.id})`);
            return existing;
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
        logger_1.logger.info('mit-ocw-fetch', `Created asset for ${course.title}`, { details: { assetId: created.id } });
        return created;
    }
    /**
     * Get or create the MIT OCW source
     */
    async getOrCreateMitOcwSource() {
        const { data: existing } = await this.supabase
            .from('source_registry_sources')
            .select('*')
            .eq('name', 'MIT OpenCourseWare')
            .single();
        if (existing)
            return existing;
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
    async getTocForAsset(asset) {
        console.log(`[MitOcwFetch] Checking for cached TOC for: ${asset.title}`);
        // First check if we have TOC in registry
        const { data: existingNodes } = await this.supabase
            .from('source_registry_nodes')
            .select('*')
            .eq('asset_id', asset.id)
            .order('sort_order');
        if (existingNodes && existingNodes.length > 0) {
            console.log(`[MitOcwFetch] ✓ Found cached TOC in database (${existingNodes.length} nodes)`);
            logger_1.logger.info('mit-ocw-fetch', `Using cached TOC for ${asset.title} (${existingNodes.length} nodes)`);
            return existingNodes;
        }
        // Fetch TOC live from MIT OCW
        console.log(`[MitOcwFetch] TOC not in database. Fetching live from MIT OCW...`);
        console.log(`[MitOcwFetch] Scraping: ${asset.url}`);
        logger_1.logger.info('mit-ocw-fetch', `Fetching TOC live for ${asset.title}`);
        const candidate = {
            slug: asset.slug,
            title: asset.title,
            url: asset.url,
            description: asset.description || undefined,
        };
        const tocNodes = await adapters_1.mitOcwAdapter.mapToc(candidate, 'https://ocw.mit.edu');
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
    async saveTocToRegistry(assetId, nodes) {
        if (nodes.length === 0)
            return [];
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
            logger_1.logger.error('mit-ocw-fetch', `Failed to save TOC nodes: ${error.message}`);
            throw new Error(`Failed to save TOC: ${error.message}`);
        }
        logger_1.logger.info('mit-ocw-fetch', `Saved ${nodes.length} TOC nodes to registry`);
        return data;
    }
    /**
     * Get TOC summaries for AI consumption
     */
    async getTocSummaries(asset) {
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
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 2);
    }
    /**
     * Calculate match score between course and search terms
     */
    calculateMatchScore(course, terms) {
        const matchedTerms = [];
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
exports.MitOcwFetcher = MitOcwFetcher;
