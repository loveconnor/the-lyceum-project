"use strict";
/**
 * Dynamic Source Fetcher
 * Discovers and fetches content from OpenStax on-demand when registry doesn't have it
 *
 * This enables path generation without requiring pre-populated registry data.
 * Content is fetched live and optionally cached in the registry for future use.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicSourceFetcher = void 0;
const adapters_1 = require("./adapters");
const logger_1 = require("./logger");
/**
 * Dynamic Source Fetcher Service
 * Fetches content from OpenStax on-demand
 */
class DynamicSourceFetcher {
    constructor(supabaseClient) {
        this.booksCache = null;
        this.booksCacheTime = 0;
        this.CACHE_TTL = 1000 * 60 * 60; // 1 hour
        this.supabase = supabaseClient;
    }
    /**
     * Fetch all available OpenStax books
     */
    async getOpenStaxBooks(forceRefresh = false) {
        // Return cached if valid
        if (!forceRefresh && this.booksCache && Date.now() - this.booksCacheTime < this.CACHE_TTL) {
            return this.booksCache;
        }
        logger_1.logger.info('dynamic-fetch', 'Fetching OpenStax book catalog');
        try {
            const candidates = await adapters_1.openStaxAdapter.discoverAssets('https://openstax.org');
            this.booksCache = candidates.map(c => ({
                slug: c.slug,
                title: c.title,
                description: c.description,
                url: c.url,
                subjects: c.metadata?.subjects || [],
                categories: c.metadata?.categories || [],
                coverUrl: c.metadata?.coverUrl,
            }));
            this.booksCacheTime = Date.now();
            logger_1.logger.info('dynamic-fetch', `Cached ${this.booksCache.length} OpenStax books`);
            return this.booksCache;
        }
        catch (error) {
            logger_1.logger.error('dynamic-fetch', `Failed to fetch OpenStax books: ${error.message}`);
            throw error;
        }
    }
    /**
     * Search for OpenStax books matching a topic/query
     */
    async searchBooksByTopic(topic) {
        const books = await this.getOpenStaxBooks();
        const results = [];
        // Normalize and tokenize the topic
        const topicTerms = this.tokenize(topic);
        for (const book of books) {
            const score = this.calculateMatchScore(book, topicTerms);
            if (score.score > 0) {
                results.push({
                    book,
                    score: score.score,
                    matchedTerms: score.matchedTerms,
                });
            }
        }
        // Sort by score descending
        results.sort((a, b) => b.score - a.score);
        logger_1.logger.info('dynamic-fetch', `Found ${results.length} books matching "${topic}"`, {
            details: { topMatches: results.slice(0, 3).map(r => r.book.title) },
        });
        return results;
    }
    /**
     * Get the best matching OpenStax book for a topic
     */
    async findBestBook(topic) {
        const results = await this.searchBooksByTopic(topic);
        return results.length > 0 ? results[0].book : null;
    }
    /**
     * Get or create an asset in the registry for an OpenStax book
     * This allows on-demand population of the registry
     */
    async getOrCreateAsset(book) {
        console.log(`[DynamicFetch] Checking if asset exists for: ${book.title}`);
        // Check if asset already exists
        const { data: existing } = await this.supabase
            .from('source_registry_assets')
            .select('*')
            .eq('slug', book.slug)
            .single();
        if (existing) {
            console.log(`[DynamicFetch] ✓ Found existing asset in database (ID: ${existing.id})`);
            logger_1.logger.info('dynamic-fetch', `Found existing asset for ${book.title}`);
            return existing;
        }
        console.log(`[DynamicFetch] Asset not in database. Creating new asset...`);
        // Get or create OpenStax source
        const source = await this.getOrCreateOpenStaxSource();
        console.log(`[DynamicFetch] Using source: ${source.name} (ID: ${source.id})`);
        // Create the asset
        const { data: created, error } = await this.supabase
            .from('source_registry_assets')
            .insert({
            source_id: source.id,
            slug: book.slug,
            title: book.title,
            url: book.url,
            description: book.description,
            license_name: 'CC BY 4.0',
            license_url: 'https://creativecommons.org/licenses/by/4.0/',
            license_confidence: 0.95,
            robots_status: 'allowed',
            active: true, // Auto-activate for dynamic use
            scan_status: 'idle',
        })
            .select()
            .single();
        if (error) {
            console.log(`[DynamicFetch] ❌ Failed to create asset: ${error.message}`);
            throw new Error(`Failed to create asset: ${error.message}`);
        }
        console.log(`[DynamicFetch] ✓ Created new asset in database (ID: ${created.id})`);
        logger_1.logger.info('dynamic-fetch', `Created new asset for ${book.title}`, {
            details: { assetId: created.id },
        });
        return created;
    }
    /**
     * Get or create the OpenStax source
     */
    async getOrCreateOpenStaxSource() {
        const { data: existing } = await this.supabase
            .from('source_registry_sources')
            .select('*')
            .eq('name', 'OpenStax')
            .single();
        if (existing)
            return existing;
        const { data: created, error } = await this.supabase
            .from('source_registry_sources')
            .insert({
            name: 'OpenStax',
            type: 'openstax',
            base_url: 'https://openstax.org',
            description: 'Free, peer-reviewed, openly licensed textbooks',
            license_name: 'CC BY 4.0',
            license_url: 'https://creativecommons.org/licenses/by/4.0/',
            license_confidence: 0.95,
            robots_status: 'allowed',
            rate_limit_per_minute: 30,
            scan_status: 'idle',
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create OpenStax source: ${error.message}`);
        }
        return created;
    }
    /**
     * Fetch TOC for an asset, either from registry or live from OpenStax
     */
    async getTocForAsset(asset) {
        console.log(`[DynamicFetch] Checking for cached TOC for: ${asset.title}`);
        // First check if we have TOC in registry
        const { data: existingNodes } = await this.supabase
            .from('source_registry_nodes')
            .select('*')
            .eq('asset_id', asset.id)
            .order('sort_order');
        if (existingNodes && existingNodes.length > 0) {
            console.log(`[DynamicFetch] ✓ Found cached TOC in database (${existingNodes.length} nodes)`);
            logger_1.logger.info('dynamic-fetch', `Using cached TOC for ${asset.title} (${existingNodes.length} nodes)`);
            return existingNodes;
        }
        // Fetch TOC live from OpenStax
        console.log(`[DynamicFetch] TOC not in database. Fetching live from OpenStax...`);
        console.log(`[DynamicFetch] Scraping: ${asset.url}`);
        logger_1.logger.info('dynamic-fetch', `Fetching TOC live for ${asset.title}`);
        const candidate = {
            slug: asset.slug,
            title: asset.title,
            url: asset.url,
            description: asset.description || undefined,
        };
        const tocNodes = await adapters_1.openStaxAdapter.mapToc(candidate, 'https://openstax.org');
        if (tocNodes.length === 0) {
            console.log(`[DynamicFetch] ⚠️ No TOC nodes extracted from page`);
            logger_1.logger.warn('dynamic-fetch', `No TOC nodes found for ${asset.title}`);
            return [];
        }
        console.log(`[DynamicFetch] ✓ Extracted ${tocNodes.length} TOC nodes from OpenStax`);
        // Count node types
        const chapters = tocNodes.filter(n => n.node_type === 'chapter').length;
        const sections = tocNodes.filter(n => n.node_type === 'section').length;
        const subsections = tocNodes.filter(n => n.node_type === 'subsection').length;
        console.log(`[DynamicFetch] TOC breakdown: ${chapters} chapters, ${sections} sections, ${subsections} subsections`);
        // Save TOC to registry for future use
        console.log(`[DynamicFetch] Saving TOC to database...`);
        await this.saveTocToRegistry(asset.id, tocNodes);
        // Update asset with TOC stats
        const tocStats = {
            chapters,
            sections,
            total_nodes: tocNodes.length,
            depth: Math.max(...tocNodes.map(n => n.depth), 0),
        };
        await this.supabase
            .from('source_registry_assets')
            .update({
            toc_extraction_success: true,
            toc_stats: tocStats,
            scan_status: 'completed',
            last_scan_at: new Date().toISOString(),
        })
            .eq('id', asset.id);
        console.log(`[DynamicFetch] ✓ TOC saved to database and asset updated`);
        return tocNodes;
    }
    /**
     * Save TOC nodes to registry
     */
    async saveTocToRegistry(assetId, nodes) {
        const nodesToInsert = nodes.map(node => ({
            asset_id: assetId,
            slug: node.slug,
            title: node.title,
            url: node.url,
            node_type: node.node_type,
            depth: node.depth,
            sort_order: node.sort_order,
            selector_hints: node.selector_hints,
            metadata: node.metadata,
        }));
        // Insert in batches
        const batchSize = 100;
        const totalBatches = Math.ceil(nodesToInsert.length / batchSize);
        for (let i = 0; i < nodesToInsert.length; i += batchSize) {
            const batch = nodesToInsert.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            console.log(`[DynamicFetch] Inserting batch ${batchNum}/${totalBatches} (${batch.length} nodes)...`);
            const { error } = await this.supabase
                .from('source_registry_nodes')
                .insert(batch);
            if (error) {
                console.log(`[DynamicFetch] ❌ Failed to save batch ${batchNum}: ${error.message}`);
                logger_1.logger.error('dynamic-fetch', `Failed to save TOC nodes: ${error.message}`);
                throw error;
            }
        }
        console.log(`[DynamicFetch] ✓ All ${nodes.length} TOC nodes saved to source_registry_nodes table`);
        logger_1.logger.info('dynamic-fetch', `Saved ${nodes.length} TOC nodes to registry`);
    }
    /**
     * Get TOC summaries for AI consumption
     */
    async getTocSummaries(asset) {
        const nodes = await this.getTocForAsset(asset);
        // Need to fetch from DB to get the generated IDs
        const { data: dbNodes } = await this.supabase
            .from('source_registry_nodes')
            .select('id, title, sort_order, depth, node_type')
            .eq('asset_id', asset.id)
            .order('sort_order');
        return (dbNodes || []).map(node => ({
            node_id: node.id,
            title: node.title,
            order: node.sort_order,
            depth: node.depth,
            node_type: node.node_type,
        }));
    }
    /**
     * Full flow: Find best book for topic and get its TOC
     * This is the main entry point for dynamic content discovery
     */
    async discoverContentForTopic(topic) {
        logger_1.logger.info('dynamic-fetch', `Discovering content for topic: "${topic}"`);
        // Find the best matching book
        const book = await this.findBestBook(topic);
        if (!book) {
            logger_1.logger.warn('dynamic-fetch', `No OpenStax book found for topic: "${topic}"`);
            return null;
        }
        logger_1.logger.info('dynamic-fetch', `Best match: ${book.title}`);
        // Get or create the asset
        const asset = await this.getOrCreateAsset(book);
        // Get TOC (from cache or live)
        const tocSummaries = await this.getTocSummaries(asset);
        if (tocSummaries.length === 0) {
            logger_1.logger.error('dynamic-fetch', `Failed to get TOC for ${book.title}`);
            return null;
        }
        logger_1.logger.info('dynamic-fetch', `Content discovered: ${asset.title} with ${tocSummaries.length} TOC nodes`);
        return { asset, tocSummaries };
    }
    /**
     * Tokenize a string into searchable terms
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 2);
    }
    /**
     * Calculate match score between a book and topic terms
     *
     * IMPORTANT: Single word matches are penalized to avoid false positives
     * like "java fundamentals" matching "Fundamentals of Nursing"
     */
    calculateMatchScore(book, topicTerms) {
        const bookText = [
            book.title,
            book.description || '',
            ...book.subjects,
            ...book.categories,
        ].join(' ').toLowerCase();
        const bookTerms = new Set(this.tokenize(bookText));
        const matchedTerms = [];
        let titleMatches = 0;
        let subjectMatches = 0;
        let score = 0;
        // Filter out common/generic words that cause false positives
        const genericWords = new Set([
            'introduction', 'fundamentals', 'basics', 'principles', 'concepts',
            'guide', 'learn', 'learning', 'course', 'study', 'tutorial',
            'the', 'and', 'for', 'with', 'from', 'into'
        ]);
        for (const term of topicTerms) {
            const isGeneric = genericWords.has(term);
            // Exact match in title (highest weight, but reduced for generic terms)
            if (book.title.toLowerCase().includes(term)) {
                titleMatches++;
                if (isGeneric) {
                    score += 2; // Reduced from 10 for generic terms
                }
                else {
                    score += 10;
                }
                matchedTerms.push(term);
                continue;
            }
            // Match in subjects (high weight)
            if (book.subjects.some(s => s.toLowerCase().includes(term))) {
                subjectMatches++;
                score += isGeneric ? 2 : 8;
                matchedTerms.push(term);
                continue;
            }
            // Match in description or categories (medium weight)
            if (bookTerms.has(term)) {
                score += isGeneric ? 1 : 3;
                matchedTerms.push(term);
                continue;
            }
            // Partial match (low weight, only for non-generic terms)
            if (!isGeneric) {
                for (const bookTerm of bookTerms) {
                    if (bookTerm.includes(term) || term.includes(bookTerm)) {
                        score += 1;
                        if (!matchedTerms.includes(term))
                            matchedTerms.push(term);
                        break;
                    }
                }
            }
        }
        // Bonus for matching multiple MEANINGFUL terms (not just generic ones)
        const meaningfulMatches = matchedTerms.filter(t => !genericWords.has(t)).length;
        if (meaningfulMatches > 1) {
            score += meaningfulMatches * 3;
        }
        // PENALTY: If only generic terms matched, reduce score significantly
        // This prevents "java fundamentals" from matching "Fundamentals of Nursing"
        if (matchedTerms.length > 0 && meaningfulMatches === 0) {
            score = Math.floor(score * 0.3); // 70% penalty for generic-only matches
            logger_1.logger.debug('dynamic-fetch', `Penalized generic-only match: "${book.title}" (score ${score})`);
        }
        // PENALTY: Require at least one subject match for technical topics
        // Technical topics should match book subjects, not just title keywords
        const technicalTerms = topicTerms.filter(t => ['programming', 'coding', 'software', 'java', 'python', 'javascript', 'react',
            'database', 'algorithm', 'data', 'structure', 'web', 'api', 'machine',
            'learning', 'artificial', 'intelligence', 'computer', 'science'].includes(t));
        if (technicalTerms.length > 0 && subjectMatches === 0) {
            // Technical query but no subject match = likely wrong book
            score = Math.floor(score * 0.4);
            logger_1.logger.debug('dynamic-fetch', `Penalized no-subject match for technical query: "${book.title}" (score ${score})`);
        }
        return { score, matchedTerms };
    }
}
exports.DynamicSourceFetcher = DynamicSourceFetcher;
