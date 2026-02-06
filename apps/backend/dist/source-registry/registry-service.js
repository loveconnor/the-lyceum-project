"use strict";
/**
 * Source Registry Service
 * Main service for managing source registry operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryService = void 0;
const adapters_1 = require("./adapters");
const logger_1 = require("./logger");
const fetcher_1 = require("./fetcher");
const seeds_1 = require("./seeds");
class RegistryService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }
    // ==================== Source Operations ====================
    /**
     * Get or create a source from seed config
     */
    async getOrCreateSource(seed) {
        // Check if source exists
        const { data: existing } = await this.supabase
            .from('source_registry_sources')
            .select('*')
            .eq('name', seed.name)
            .single();
        if (existing) {
            return existing;
        }
        // Create new source
        const { data: created, error } = await this.supabase
            .from('source_registry_sources')
            .insert({
            name: seed.name,
            type: seed.type,
            base_url: seed.baseUrl,
            description: seed.description,
            rate_limit_per_minute: seed.rateLimitPerMinute || 30,
            config: seed.config,
            scan_status: 'idle',
            robots_status: 'unknown',
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create source: ${error.message}`);
        }
        logger_1.logger.info('source', `Created source: ${seed.name}`, { sourceId: created.id });
        return created;
    }
    /**
     * Get all sources
     */
    async getSources() {
        const { data, error } = await this.supabase
            .from('source_registry_sources')
            .select('*')
            .order('name');
        if (error) {
            throw new Error(`Failed to fetch sources: ${error.message}`);
        }
        return data;
    }
    /**
     * Get source by ID
     */
    async getSourceById(id) {
        const { data, error } = await this.supabase
            .from('source_registry_sources')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to fetch source: ${error.message}`);
        }
        return data;
    }
    /**
     * Update source
     */
    async updateSource(id, updates) {
        const { data, error } = await this.supabase
            .from('source_registry_sources')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update source: ${error.message}`);
        }
        return data;
    }
    // ==================== Asset Operations ====================
    /**
     * Get or create an asset
     */
    async getOrCreateAsset(sourceId, candidate) {
        // Check if asset exists
        const { data: existing } = await this.supabase
            .from('source_registry_assets')
            .select('*')
            .eq('source_id', sourceId)
            .eq('slug', candidate.slug)
            .single();
        if (existing) {
            return existing;
        }
        // Create new asset
        const { data: created, error } = await this.supabase
            .from('source_registry_assets')
            .insert({
            source_id: sourceId,
            slug: candidate.slug,
            title: candidate.title,
            url: candidate.url,
            description: candidate.description,
            version: candidate.version,
            active: false, // Always start inactive
            scan_status: 'idle',
            robots_status: 'unknown',
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create asset: ${error.message}`);
        }
        logger_1.logger.info('asset', `Created asset: ${candidate.title}`, {
            sourceId,
            assetId: created.id,
        });
        return created;
    }
    /**
     * Get assets for a source
     */
    async getAssets(sourceId) {
        let query = this.supabase.from('source_registry_assets').select('*');
        if (sourceId) {
            query = query.eq('source_id', sourceId);
        }
        const { data, error } = await query.order('title');
        if (error) {
            throw new Error(`Failed to fetch assets: ${error.message}`);
        }
        return data;
    }
    /**
     * Get asset by ID
     */
    async getAssetById(id) {
        const { data, error } = await this.supabase
            .from('source_registry_assets')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to fetch asset: ${error.message}`);
        }
        return data;
    }
    /**
     * Update asset
     */
    async updateAsset(id, updates) {
        const { data, error } = await this.supabase
            .from('source_registry_assets')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update asset: ${error.message}`);
        }
        return data;
    }
    /**
     * Activate an asset (manual activation)
     */
    async activateAsset(id) {
        const asset = await this.getAssetById(id);
        if (!asset) {
            throw new Error('Asset not found');
        }
        // Check if asset can be activated
        if (asset.robots_status === 'disallowed') {
            throw new Error('Cannot activate asset: blocked by robots.txt');
        }
        if (!asset.toc_extraction_success) {
            throw new Error('Cannot activate asset: TOC extraction not successful');
        }
        const updated = await this.updateAsset(id, { active: true });
        await this.logScan({
            asset_id: id,
            action: 'activate',
            status: 'completed',
            message: 'Asset manually activated',
        });
        logger_1.logger.info('asset', `Activated asset: ${asset.title}`, { assetId: id });
        return updated;
    }
    /**
     * Deactivate an asset
     */
    async deactivateAsset(id) {
        const updated = await this.updateAsset(id, { active: false });
        await this.logScan({
            asset_id: id,
            action: 'deactivate',
            status: 'completed',
            message: 'Asset deactivated',
        });
        return updated;
    }
    // ==================== Node Operations ====================
    /**
     * Save TOC nodes for an asset
     */
    async saveTocNodes(assetId, nodes) {
        // Delete existing nodes
        await this.supabase
            .from('source_registry_nodes')
            .delete()
            .eq('asset_id', assetId);
        if (nodes.length === 0)
            return;
        // Insert nodes in batches to handle large TOCs
        const batchSize = 100;
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
            // parent_id will be set in a second pass if needed
        }));
        for (let i = 0; i < nodesToInsert.length; i += batchSize) {
            const batch = nodesToInsert.slice(i, i + batchSize);
            const { error } = await this.supabase
                .from('source_registry_nodes')
                .insert(batch);
            if (error) {
                throw new Error(`Failed to save TOC nodes: ${error.message}`);
            }
        }
        logger_1.logger.info('nodes', `Saved ${nodes.length} TOC nodes`, { assetId });
    }
    /**
     * Get TOC nodes for an asset
     */
    async getTocNodes(assetId) {
        const { data, error } = await this.supabase
            .from('source_registry_nodes')
            .select('*')
            .eq('asset_id', assetId)
            .order('sort_order');
        if (error) {
            throw new Error(`Failed to fetch TOC nodes: ${error.message}`);
        }
        return data;
    }
    // ==================== Scan Operations ====================
    /**
     * Scan all seed sources
     */
    async scanAllSeeds(options = {}) {
        logger_1.logger.info('scan', 'Starting scan of all seed sources');
        const results = {
            sources: 0,
            assets: 0,
            nodes: 0,
            skipped: 0,
            errors: [],
        };
        for (const seed of seeds_1.SEED_SOURCES) {
            try {
                const scanResult = await this.scanSeed(seed, options);
                results.sources++;
                results.assets += scanResult.assets;
                results.nodes += scanResult.nodes;
                results.skipped += scanResult.skipped;
                results.errors.push(...scanResult.errors);
            }
            catch (err) {
                const errorMsg = `Failed to scan ${seed.name}: ${err.message}`;
                logger_1.logger.error('scan', errorMsg);
                results.errors.push(errorMsg);
            }
        }
        logger_1.logger.info('scan', 'Completed scan of all seeds', {
            details: {
                sources: results.sources,
                assets: results.assets,
                nodes: results.nodes,
                skipped: results.skipped,
                errorCount: results.errors.length,
            },
        });
        return results;
    }
    /**
     * Scan a single seed source
     */
    async scanSeed(seed, options = {}) {
        const startTime = Date.now();
        logger_1.logger.info('scan', `Scanning seed: ${seed.name}`, { url: seed.seedUrl });
        const errors = [];
        let totalAssets = 0;
        let totalNodes = 0;
        let totalSkipped = 0;
        // Get or create source
        const source = await this.getOrCreateSource(seed);
        // Update scan status
        await this.updateSource(source.id, {
            scan_status: 'scanning',
            last_scan_at: new Date().toISOString(),
        });
        await this.logScan({
            source_id: source.id,
            action: 'discover',
            status: 'started',
            message: `Starting discovery for ${seed.name}`,
        });
        try {
            // Set rate limit for domain
            fetcher_1.fetcher.setRateLimit(new URL(seed.baseUrl).hostname, seed.rateLimitPerMinute || 30);
            // Get adapter
            const adapter = (0, adapters_1.getAdapter)(seed.type);
            // Discover assets
            const candidates = await adapter.discoverAssets(seed.seedUrl, seed.config);
            logger_1.logger.info('scan', `Discovered ${candidates.length} asset candidates`, {
                sourceId: source.id,
            });
            // Process each candidate
            for (const candidate of candidates) {
                // Validate URL is allowed
                if (!(0, seeds_1.isUrlAllowed)(candidate.url)) {
                    logger_1.logger.warn('scan', `Skipping disallowed URL: ${candidate.url}`, {
                        sourceId: source.id,
                    });
                    continue;
                }
                try {
                    // Get or create asset
                    const asset = await this.getOrCreateAsset(source.id, candidate);
                    // Check if we should skip already scanned assets
                    if (options.skipScanned && asset.scan_status === 'completed' && asset.toc_extraction_success) {
                        logger_1.logger.debug('scan', `Skipping already scanned asset: ${candidate.title}`, {
                            assetId: asset.id,
                        });
                        totalSkipped++;
                        continue;
                    }
                    totalAssets++;
                    // Validate asset
                    await this.logScan({
                        source_id: source.id,
                        asset_id: asset.id,
                        action: 'validate',
                        status: 'started',
                        message: `Validating ${candidate.title}`,
                    });
                    const validationResult = await adapter.validate(candidate, seed.baseUrl);
                    // Determine robots status
                    let robotsStatus = validationResult.robots_status;
                    if (robotsStatus === 'disallowed' || validationResult.errors.length > 0) {
                        robotsStatus = 'needs_review';
                    }
                    // Map TOC
                    await this.logScan({
                        source_id: source.id,
                        asset_id: asset.id,
                        action: 'map_toc',
                        status: 'started',
                        message: `Mapping TOC for ${candidate.title}`,
                    });
                    let tocNodes = [];
                    let tocSuccess = false;
                    let tocStats;
                    try {
                        tocNodes = await adapter.mapToc(candidate, seed.baseUrl);
                        tocSuccess = tocNodes.length > 0;
                        if (tocSuccess) {
                            // Calculate TOC stats
                            const chapters = tocNodes.filter(n => n.node_type === 'chapter').length;
                            const sections = tocNodes.filter(n => n.node_type === 'section').length;
                            const maxDepth = Math.max(...tocNodes.map(n => n.depth), 0);
                            tocStats = {
                                chapters,
                                sections,
                                total_nodes: tocNodes.length,
                                depth: maxDepth,
                            };
                            // Save nodes
                            await this.saveTocNodes(asset.id, tocNodes);
                            totalNodes += tocNodes.length;
                        }
                    }
                    catch (err) {
                        logger_1.logger.error('scan', `TOC mapping failed for ${candidate.title}`, {
                            assetId: asset.id,
                            details: { error: err.message },
                        });
                        validationResult.errors.push({
                            code: 'TOC_MAPPING_FAILED',
                            message: err.message,
                        });
                    }
                    // Build validation report
                    const validationReport = {
                        license_name: validationResult.license_name,
                        license_url: validationResult.license_url,
                        license_confidence: validationResult.license_confidence,
                        robots_status: robotsStatus,
                        toc_extraction_success: tocSuccess,
                        toc_stats: tocStats,
                        errors: validationResult.errors,
                        warnings: validationResult.warnings,
                        scanned_at: new Date().toISOString(),
                    };
                    // Update asset with validation results
                    await this.updateAsset(asset.id, {
                        license_name: validationResult.license_name,
                        license_url: validationResult.license_url,
                        license_confidence: validationResult.license_confidence,
                        robots_status: robotsStatus,
                        toc_extraction_success: tocSuccess,
                        toc_stats: tocStats,
                        validation_report: validationReport,
                        scan_status: 'completed',
                        last_scan_at: new Date().toISOString(),
                    });
                    await this.logScan({
                        source_id: source.id,
                        asset_id: asset.id,
                        action: 'validate',
                        status: 'completed',
                        message: `Validation complete for ${candidate.title}`,
                        details: validationReport,
                    });
                }
                catch (err) {
                    const errorMsg = `Failed to process asset ${candidate.title}: ${err.message}`;
                    errors.push(errorMsg);
                    logger_1.logger.error('scan', errorMsg, { sourceId: source.id });
                    await this.logScan({
                        source_id: source.id,
                        action: 'error',
                        status: 'failed',
                        message: errorMsg,
                    });
                }
            }
            // Update source with final status
            await this.updateSource(source.id, {
                scan_status: 'completed',
                scan_error: errors.length > 0 ? errors.join('; ') : null,
            });
            await this.logScan({
                source_id: source.id,
                action: 'discover',
                status: 'completed',
                message: `Completed scan of ${seed.name}`,
                details: {
                    assets: totalAssets,
                    nodes: totalNodes,
                    skipped: totalSkipped,
                    errors: errors.length,
                    duration: Date.now() - startTime,
                },
            });
        }
        catch (err) {
            const errorMsg = `Scan failed for ${seed.name}: ${err.message}`;
            errors.push(errorMsg);
            await this.updateSource(source.id, {
                scan_status: 'failed',
                scan_error: errorMsg,
            });
            await this.logScan({
                source_id: source.id,
                action: 'discover',
                status: 'failed',
                message: errorMsg,
            });
        }
        const duration = Date.now() - startTime;
        logger_1.logger.info('scan', `Finished scanning ${seed.name}`, {
            sourceId: source.id,
            duration,
            details: { assets: totalAssets, nodes: totalNodes, skipped: totalSkipped, errors: errors.length },
        });
        return {
            source,
            assets: totalAssets,
            nodes: totalNodes,
            skipped: totalSkipped,
            errors,
        };
    }
    /**
     * Scan a single source by ID
     */
    async scanSourceById(sourceId, options = {}) {
        const source = await this.getSourceById(sourceId);
        if (!source) {
            throw new Error('Source not found');
        }
        // Find matching seed config
        const seed = seeds_1.SEED_SOURCES.find(s => s.name === source.name);
        if (!seed) {
            throw new Error(`No seed configuration found for source: ${source.name}`);
        }
        return this.scanSeed(seed, options);
    }
    // ==================== Logging ====================
    /**
     * Log a scan operation
     */
    async logScan(log) {
        const { error } = await this.supabase
            .from('source_registry_scan_logs')
            .insert(log);
        if (error) {
            logger_1.logger.error('scan-log', `Failed to save scan log: ${error.message}`);
        }
    }
    /**
     * Get scan logs
     */
    async getScanLogs(options) {
        let query = this.supabase
            .from('source_registry_scan_logs')
            .select('*')
            .order('created_at', { ascending: false });
        if (options?.sourceId) {
            query = query.eq('source_id', options.sourceId);
        }
        if (options?.assetId) {
            query = query.eq('asset_id', options.assetId);
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }
        const { data, error } = await query;
        if (error) {
            throw new Error(`Failed to fetch scan logs: ${error.message}`);
        }
        return data;
    }
}
exports.RegistryService = RegistryService;
