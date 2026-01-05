/**
 * Module Grounding Types
 * Types for grounding learning modules in the Source Registry
 */

import type { TocNode, Asset } from './types';

export type ContentMode = 'ai_generated' | 'registry_backed';

/**
 * Minimal TOC node info sent to AI for node selection
 * Only includes what AI needs to make selection decisions
 */
export interface TocNodeSummary {
  node_id: string;
  title: string;
  order: number;
  depth: number;
  node_type: string;
}

/**
 * AI's response for selecting appropriate registry nodes
 */
export interface NodeSelectionResult {
  selected_node_ids: string[];
  reasoning: string;
}

/**
 * Request to resolve registry nodes for a module
 */
export interface ResolveNodesRequest {
  module_title: string;
  module_description: string;
  source_asset_id: string;
  path_context?: string;
}

/**
 * Result of resolving nodes for a module
 */
export interface ResolveNodesResult {
  source_asset_id: string;
  source_node_ids: string[];
  content_unavailable: boolean;
  reasoning: string;
  resolved_at: string;
}

/**
 * Extracted content from a source node
 */
export interface ExtractedContent {
  node_id: string;
  title: string;
  url: string;
  content_text: string;
  headings: string[];
  figures: ExtractedFigure[];
  source_title: string;
  section_path: string[];
}

/**
 * Extracted figure/image from source content
 */
export interface ExtractedFigure {
  url: string;
  alt?: string;
  caption?: string;
}

/**
 * Request to render module content
 */
export interface RenderModuleRequest {
  module_id: string;
  module_title: string;
  source_asset_id: string;
  source_node_ids: string[];
}

/**
 * Rendered module content with citations
 */
export interface RenderedModuleContent {
  overview: string;
  learning_objectives: string[];
  sections: RenderedSection[];
  key_concepts: RenderedConcept[];
  citations: Citation[];
  figures: ExtractedFigure[];
  rendered_at: string;
  content_unavailable: boolean;
  unavailable_reason?: string;
}

/**
 * A rendered section in the module
 */
export interface RenderedSection {
  title: string;
  content: string;
  source_node_id?: string;
}

/**
 * A rendered key concept
 */
export interface RenderedConcept {
  concept: string;
  explanation: string;
  source_node_id?: string;
}

/**
 * Citation for transparency
 */
export interface Citation {
  source_title: string;
  section_title: string;
  section_path: string[];
  url: string;
  node_id: string;
}

/**
 * Registry-backed module metadata stored in learning_path_items
 */
export interface RegistryBackedModuleData {
  content_mode: ContentMode;
  source_asset_id: string | null;
  source_node_ids: string[];
  last_resolved_at: string | null;
  content_unavailable: boolean;
  
  // Cached rendered content (optional, can be re-rendered on demand)
  rendered_content?: RenderedModuleContent;
}

/**
 * Request to generate a registry-backed path
 */
export interface GenerateRegistryBackedPathRequest {
  title: string;
  description?: string;
  difficulty: 'intro' | 'intermediate' | 'advanced';
  estimatedDuration?: string;
  topics?: string[];
  source_asset_id: string; // Required - the registry asset to use
}

/**
 * Error types for module grounding
 */
export type ModuleGroundingError = 
  | { type: 'ASSET_NOT_FOUND'; message: string }
  | { type: 'NO_TOC_NODES'; message: string }
  | { type: 'NODE_RESOLUTION_FAILED'; message: string }
  | { type: 'CONTENT_RETRIEVAL_FAILED'; message: string; url?: string }
  | { type: 'CONTENT_EXTRACTION_FAILED'; message: string }
  | { type: 'AI_SYNTHESIS_FAILED'; message: string };

