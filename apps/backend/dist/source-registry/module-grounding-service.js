"use strict";
/**
 * Module Grounding Service
 * Orchestrates grounding learning modules in the Source Registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleGroundingService = void 0;
const module_node_resolver_1 = require("./module-node-resolver");
const module_content_retriever_1 = require("./module-content-retriever");
const module_content_synthesizer_1 = require("./module-content-synthesizer");
const logger_1 = require("./logger");
class ModuleGroundingService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }
    /**
     * Get TOC nodes for an asset (as summaries for AI)
     */
    async getTocSummaries(assetId) {
        const { data, error } = await this.supabase
            .from('source_registry_nodes')
            .select('id, title, sort_order, depth, node_type')
            .eq('asset_id', assetId)
            .order('sort_order');
        if (error) {
            throw new Error(`Failed to fetch TOC nodes: ${error.message}`);
        }
        return (data || []).map(node => ({
            node_id: node.id,
            title: node.title,
            order: node.sort_order,
            depth: node.depth,
            node_type: node.node_type,
        }));
    }
    /**
     * Get full TOC nodes for an asset
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
    /**
     * Get specific TOC nodes by IDs
     */
    async getNodesByIds(nodeIds) {
        if (nodeIds.length === 0)
            return [];
        const { data, error } = await this.supabase
            .from('source_registry_nodes')
            .select('*')
            .in('id', nodeIds)
            .order('sort_order');
        if (error) {
            throw new Error(`Failed to fetch TOC nodes: ${error.message}`);
        }
        return data;
    }
    /**
     * Get an asset by ID
     */
    async getAsset(assetId) {
        const { data, error } = await this.supabase
            .from('source_registry_assets')
            .select('*')
            .eq('id', assetId)
            .single();
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to fetch asset: ${error.message}`);
        }
        return data;
    }
    /**
     * Get active assets for a source
     */
    async getActiveAssets(sourceId) {
        let query = this.supabase
            .from('source_registry_assets')
            .select('*')
            .eq('active', true);
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
     * Resolve registry nodes for a module
     * Step A of module creation flow
     */
    async resolveNodesForModule(moduleTitle, moduleDescription, sourceAssetId, pathContext) {
        const startTime = Date.now();
        logger_1.logger.info('module-grounding', `Resolving nodes for module: "${moduleTitle}"`, {
            details: { assetId: sourceAssetId },
        });
        // Verify asset exists and is active
        const asset = await this.getAsset(sourceAssetId);
        if (!asset) {
            logger_1.logger.error('module-grounding', `Asset not found: ${sourceAssetId}`);
            return {
                source_asset_id: sourceAssetId,
                source_node_ids: [],
                content_unavailable: true,
                reasoning: 'Source asset not found in registry',
                resolved_at: new Date().toISOString(),
            };
        }
        if (!asset.active) {
            logger_1.logger.warn('module-grounding', `Asset not active: ${sourceAssetId}`);
            return {
                source_asset_id: sourceAssetId,
                source_node_ids: [],
                content_unavailable: true,
                reasoning: 'Source asset is not activated in registry',
                resolved_at: new Date().toISOString(),
            };
        }
        // Get TOC nodes for the asset
        const tocNodes = await this.getTocNodes(sourceAssetId);
        // Resolve nodes using AI
        const result = await (0, module_node_resolver_1.resolveNodesForModule)({
            module_title: moduleTitle,
            module_description: moduleDescription,
            source_asset_id: sourceAssetId,
            path_context: pathContext,
        }, tocNodes);
        const duration = Date.now() - startTime;
        logger_1.logger.info('module-grounding', `Node resolution complete for "${moduleTitle}"`, {
            duration,
            details: {
                selectedNodes: result.source_node_ids.length,
                contentUnavailable: result.content_unavailable,
            },
        });
        return result;
    }
    /**
     * Render module content on-demand
     * Step B of module rendering flow - retrieves and synthesizes content
     */
    async renderModuleContent(moduleId, moduleTitle, moduleDescription, sourceAssetId, sourceNodeIds, difficulty) {
        const startTime = Date.now();
        logger_1.logger.info('module-grounding', `Rendering content for module: "${moduleTitle}"`, {
            details: {
                moduleId,
                assetId: sourceAssetId,
                nodeCount: sourceNodeIds.length,
            },
        });
        // Handle case with no nodes
        if (!sourceNodeIds || sourceNodeIds.length === 0) {
            logger_1.logger.warn('module-grounding', 'No source nodes to render');
            return {
                overview: 'No source content is available for this module.',
                learning_objectives: [],
                sections: [],
                key_concepts: [],
                citations: [],
                figures: [],
                rendered_at: new Date().toISOString(),
                content_unavailable: true,
                unavailable_reason: 'No source nodes were selected for this module',
            };
        }
        // Get asset for metadata and selector hints
        const asset = await this.getAsset(sourceAssetId);
        if (!asset) {
            logger_1.logger.error('module-grounding', `Asset not found: ${sourceAssetId}`);
            return {
                overview: 'Source asset not found.',
                learning_objectives: [],
                sections: [],
                key_concepts: [],
                citations: [],
                figures: [],
                rendered_at: new Date().toISOString(),
                content_unavailable: true,
                unavailable_reason: 'Source asset not found in registry',
            };
        }
        // Get the selected nodes
        const nodes = await this.getNodesByIds(sourceNodeIds);
        if (nodes.length === 0) {
            logger_1.logger.error('module-grounding', `No valid nodes found for IDs: ${sourceNodeIds.join(', ')}`);
            return {
                overview: 'Source nodes not found.',
                learning_objectives: [],
                sections: [],
                key_concepts: [],
                citations: [],
                figures: [],
                rendered_at: new Date().toISOString(),
                content_unavailable: true,
                unavailable_reason: 'Selected source nodes not found in registry',
            };
        }
        // Retrieve content from source URLs
        logger_1.logger.info('module-grounding', `Retrieving content from ${nodes.length} nodes`);
        const extractedContents = await (0, module_content_retriever_1.retrieveNodesContent)(nodes, asset);
        if (extractedContents.length === 0) {
            logger_1.logger.error('module-grounding', 'Content retrieval failed for all nodes');
            return {
                overview: 'Failed to retrieve source content. Please try again later.',
                learning_objectives: [],
                sections: [],
                key_concepts: [],
                citations: [],
                figures: [],
                rendered_at: new Date().toISOString(),
                content_unavailable: true,
                unavailable_reason: 'Content retrieval failed for all source nodes',
            };
        }
        // Synthesize content
        logger_1.logger.info('module-grounding', `Synthesizing content from ${extractedContents.length} sources`);
        const renderedContent = await (0, module_content_synthesizer_1.renderModuleOnDemand)(moduleTitle, moduleDescription, extractedContents, difficulty);
        const duration = Date.now() - startTime;
        logger_1.logger.info('module-grounding', `Content rendering complete for "${moduleTitle}"`, {
            duration,
            details: {
                sectionsCount: renderedContent.sections.length,
                conceptsCount: renderedContent.key_concepts.length,
                citationsCount: renderedContent.citations.length,
            },
        });
        return renderedContent;
    }
    /**
     * Update module with resolved nodes
     * Persists the module metadata after node resolution
     */
    async persistModuleResolution(moduleId, resolution) {
        const { error } = await this.supabase
            .from('learning_path_items')
            .update({
            source_asset_id: resolution.source_asset_id,
            source_node_ids: resolution.source_node_ids,
            content_mode: 'registry_backed',
            content_unavailable: resolution.content_unavailable,
            last_resolved_at: resolution.resolved_at,
        })
            .eq('id', moduleId);
        if (error) {
            throw new Error(`Failed to update module: ${error.message}`);
        }
        logger_1.logger.info('module-grounding', `Persisted resolution for module: ${moduleId}`, {
            details: {
                nodeCount: resolution.source_node_ids.length,
                contentUnavailable: resolution.content_unavailable,
            },
        });
    }
    /**
     * Get citation display string for a module
     */
    async getModuleCitationDisplay(sourceAssetId, sourceNodeIds) {
        if (!sourceAssetId || !sourceNodeIds || sourceNodeIds.length === 0) {
            return '';
        }
        const asset = await this.getAsset(sourceAssetId);
        if (!asset)
            return '';
        const nodes = await this.getNodesByIds(sourceNodeIds);
        const citations = nodes.map(node => ({
            source_title: asset.title,
            section_title: node.title,
            section_path: [], // Not needed for display formatting
            url: node.url,
            node_id: node.id,
        }));
        return (0, module_content_retriever_1.formatCitationsDisplay)(citations);
    }
    /**
     * Get TOC nodes for a module by their IDs
     * Used for visual enrichment context
     */
    async getTocNodesForModule(sourceAssetId, sourceNodeIds) {
        if (!sourceAssetId || !sourceNodeIds || sourceNodeIds.length === 0) {
            return [];
        }
        return this.getNodesByIds(sourceNodeIds);
    }
}
exports.ModuleGroundingService = ModuleGroundingService;
