/**
 * Module Grounding Service
 * Orchestrates grounding learning modules in the Source Registry
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TocNode, Asset } from './types';
import type {
  ResolveNodesResult,
  RenderedModuleContent,
  ExtractedContent,
  ModuleGroundingError,
  TocNodeSummary,
} from './module-grounding-types';
import { resolveNodesForModule } from './module-node-resolver';
import { retrieveNodesContent, formatCitationsDisplay } from './module-content-retriever';
import { renderModuleOnDemand } from './module-content-synthesizer';
import { logger } from './logger';

export class ModuleGroundingService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Get TOC nodes for an asset (as summaries for AI)
   */
  async getTocSummaries(assetId: string): Promise<TocNodeSummary[]> {
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
  async getTocNodes(assetId: string): Promise<TocNode[]> {
    const { data, error } = await this.supabase
      .from('source_registry_nodes')
      .select('*')
      .eq('asset_id', assetId)
      .order('sort_order');

    if (error) {
      throw new Error(`Failed to fetch TOC nodes: ${error.message}`);
    }

    return data as TocNode[];
  }

  /**
   * Get specific TOC nodes by IDs
   */
  async getNodesByIds(nodeIds: string[]): Promise<TocNode[]> {
    if (nodeIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('source_registry_nodes')
      .select('*')
      .in('id', nodeIds)
      .order('sort_order');

    if (error) {
      throw new Error(`Failed to fetch TOC nodes: ${error.message}`);
    }

    return data as TocNode[];
  }

  /**
   * Get an asset by ID
   */
  async getAsset(assetId: string): Promise<Asset | null> {
    const { data, error } = await this.supabase
      .from('source_registry_assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch asset: ${error.message}`);
    }

    return data as Asset | null;
  }

  /**
   * Get active assets for a source
   */
  async getActiveAssets(sourceId?: string): Promise<Asset[]> {
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

    return data as Asset[];
  }

  /**
   * Resolve registry nodes for a module
   * Step A of module creation flow
   */
  async resolveNodesForModule(
    moduleTitle: string,
    moduleDescription: string,
    sourceAssetId: string,
    pathContext?: string
  ): Promise<ResolveNodesResult> {
    const startTime = Date.now();

    logger.info('module-grounding', `Resolving nodes for module: "${moduleTitle}"`, {
      details: { assetId: sourceAssetId },
    });

    // Verify asset exists and is active
    const asset = await this.getAsset(sourceAssetId);
    if (!asset) {
      logger.error('module-grounding', `Asset not found: ${sourceAssetId}`);
      return {
        source_asset_id: sourceAssetId,
        source_node_ids: [],
        content_unavailable: true,
        reasoning: 'Source asset not found in registry',
        resolved_at: new Date().toISOString(),
      };
    }

    if (!asset.active) {
      logger.warn('module-grounding', `Asset not active: ${sourceAssetId}`);
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
    const result = await resolveNodesForModule(
      {
        module_title: moduleTitle,
        module_description: moduleDescription,
        source_asset_id: sourceAssetId,
        path_context: pathContext,
      },
      tocNodes
    );

    const duration = Date.now() - startTime;
    logger.info('module-grounding', `Node resolution complete for "${moduleTitle}"`, {
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
  async renderModuleContent(
    moduleId: string,
    moduleTitle: string,
    moduleDescription: string,
    sourceAssetId: string,
    sourceNodeIds: string[],
    difficulty: string
  ): Promise<RenderedModuleContent> {
    const startTime = Date.now();

    logger.info('module-grounding', `Rendering content for module: "${moduleTitle}"`, {
      details: {
        moduleId,
        assetId: sourceAssetId,
        nodeCount: sourceNodeIds.length,
      },
    });

    // Handle case with no nodes
    if (!sourceNodeIds || sourceNodeIds.length === 0) {
      logger.warn('module-grounding', 'No source nodes to render');
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
      logger.error('module-grounding', `Asset not found: ${sourceAssetId}`);
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
      logger.error('module-grounding', `No valid nodes found for IDs: ${sourceNodeIds.join(', ')}`);
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
    logger.info('module-grounding', `Retrieving content from ${nodes.length} nodes`);
    const extractedContents = await retrieveNodesContent(nodes, asset);

    if (extractedContents.length === 0) {
      logger.error('module-grounding', 'Content retrieval failed for all nodes');
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
    logger.info('module-grounding', `Synthesizing content from ${extractedContents.length} sources`);
    const renderedContent = await renderModuleOnDemand(
      moduleTitle,
      moduleDescription,
      extractedContents,
      difficulty
    );

    const duration = Date.now() - startTime;
    logger.info('module-grounding', `Content rendering complete for "${moduleTitle}"`, {
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
  async persistModuleResolution(
    moduleId: string,
    resolution: ResolveNodesResult
  ): Promise<void> {
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

    logger.info('module-grounding', `Persisted resolution for module: ${moduleId}`, {
      details: {
        nodeCount: resolution.source_node_ids.length,
        contentUnavailable: resolution.content_unavailable,
      },
    });
  }

  /**
   * Get citation display string for a module
   */
  async getModuleCitationDisplay(
    sourceAssetId: string,
    sourceNodeIds: string[]
  ): Promise<string> {
    if (!sourceAssetId || !sourceNodeIds || sourceNodeIds.length === 0) {
      return '';
    }

    const asset = await this.getAsset(sourceAssetId);
    if (!asset) return '';

    const nodes = await this.getNodesByIds(sourceNodeIds);
    
    const citations = nodes.map(node => ({
      source_title: asset.title,
      section_title: node.title,
      section_path: [], // Not needed for display formatting
      url: node.url,
      node_id: node.id!,
    }));

    return formatCitationsDisplay(citations);
  }
}

