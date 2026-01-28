/**
 * Visual Enrichment Layer Types
 * 
 * Types for the supplemental visual system that adds illustrative diagrams
 * to modules. Visuals are NON-AUTHORITATIVE aids only - source text remains
 * the sole source of truth.
 */

/**
 * Type of visual that can be generated
 */
export type VisualType = 'diagram' | 'graph' | 'plot' | 'flow';

/**
 * VisualIntent describes what kind of visual would help illustrate a concept.
 * This is the structured request for fetching candidate images.
 * 
 * IMPORTANT: VisualIntent does NOT contain actual images - it's a specification
 * for what to search for.
 */
export interface VisualIntent {
  /** The core concept being illustrated */
  concept: string;
  
  /** Type of visual that would best illustrate this concept */
  visual_type: VisualType;
  
  /** Key elements that should appear in the visual */
  key_elements: string[];
  
  /** Constraints for visual selection (what to avoid) */
  constraints: string[];
  
  /** Search query to use for finding images */
  search_query: string;
  
  /** Priority/importance of this visual (1-10, higher = more important) */
  priority: number;
}

/**
 * A fetched visual aid that can be displayed alongside module content.
 * 
 * CRITICAL: usage_label MUST always be "illustrative" to indicate
 * these are not authoritative sources.
 */
export interface VisualAid {
  /** URL of the image source */
  src: string;
  
  /** Alt text for accessibility */
  alt: string;
  
  /** MUST be "illustrative" - indicates non-authoritative status */
  usage_label: 'illustrative';
  
  /** Caption to display (includes disclaimer) */
  caption: string;
  
  /** The original search query used */
  query: string;
  
  /** The VisualIntent that generated this */
  intent: VisualIntent;
  
  /** Source attribution if available */
  attribution?: string;
  
  /** Thumbnail URL if different from src */
  thumbnail_src?: string;
}

/**
 * Result of generating visual intents for a module
 */
export interface VisualIntentResult {
  /** Generated visual intents */
  intents: VisualIntent[];
  
  /** Reasoning for the selections */
  reasoning: string;
  
  /** Whether visuals would be beneficial for this module */
  visuals_recommended: boolean;
  
  /** Timestamp of generation */
  generated_at: string;
}

/**
 * Result of fetching visual aids
 */
export interface VisualAidResult {
  /** Successfully fetched visual aids (max 3 per intent) */
  visual_aids: VisualAid[];
  
  /** Intents that failed to find suitable visuals */
  failed_intents: Array<{
    intent: VisualIntent;
    reason: string;
  }>;
  
  /** Whether any visuals were found */
  has_visuals: boolean;
  
  /** Timestamp of fetch */
  fetched_at: string;
}

/**
 * Request to generate visual intent
 */
export interface GenerateVisualIntentRequest {
  /** Module title */
  module_title: string;
  
  /** Source-backed explanation text */
  explanation_text: string;
  
  /** Associated source section titles for context */
  source_section_titles: string[];
  
  /** Learning objectives if available */
  learning_objectives?: string[];
  
  /** Key concepts if available */
  key_concepts?: string[];
}

/**
 * Configuration for visual fetching
 */
export interface VisualFetchConfig {
  /** Maximum visuals to return per intent */
  max_per_intent: number;
  
  /** Timeout for fetch operations in ms */
  timeout_ms: number;
  
  /** Whether to filter for diagrams only (no photos) */
  diagrams_only: boolean;
  
  /** Minimum image width */
  min_width: number;
  
  /** Minimum image height */
  min_height: number;
}

/**
 * Default configuration for visual fetching
 */
export const DEFAULT_VISUAL_FETCH_CONFIG: VisualFetchConfig = {
  max_per_intent: 3,
  timeout_ms: 10000,
  diagrams_only: true,
  min_width: 200,
  min_height: 200,
};

/**
 * Context provided to AI when visuals are present
 */
export interface VisualAidContext {
  /** The visual aids available */
  visual_aids: VisualAid[];
  
  /** Instruction for AI about how to reference visuals */
  instruction: string;
}

/**
 * The standard instruction to include when visuals are present
 */
export const VISUAL_AID_INSTRUCTION = `VISUAL CONTEXT: Illustrative diagrams are being shown above your response.

IMPORTANT RESPONSE RULES:
- Do NOT mention, reference, or describe the visuals in your reply.
- Do NOT point to any "diagram", "image", or "picture".
- The response should stand alone as if no visuals were provided.

The visuals are supplemental and are NOT authoritative sources.`;

/**
 * Caption suffix to add to all visual displays
 */
export const VISUAL_CAPTION_SUFFIX = '(Illustrative diagram — not from the source text)';
