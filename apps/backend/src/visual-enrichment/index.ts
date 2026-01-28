/**
 * Visual Enrichment Layer
 * 
 * A supplemental visual system that adds illustrative diagrams to modules.
 * 
 * CRITICAL DESIGN PRINCIPLES:
 * 1. Visuals are NOT sources of truth
 * 2. Authoritative knowledge ALWAYS comes from source text
 * 3. Visuals must never introduce new facts
 * 4. Visuals are clearly labeled as "illustrative"
 * 5. Labs are NOT modified
 * 6. No new registry dependency is introduced
 * 
 * This layer provides:
 * - VisualIntent generation from module content
 * - VisualAid fetching with filtering
 * - Integration helpers for module rendering
 * - AI context injection for safe visual references
 */

// Types
export type {
  VisualType,
  VisualIntent,
  VisualAid,
  VisualIntentResult,
  VisualAidResult,
  GenerateVisualIntentRequest,
  VisualFetchConfig,
  VisualAidContext,
} from './types';

export {
  DEFAULT_VISUAL_FETCH_CONFIG,
  VISUAL_AID_INSTRUCTION,
  VISUAL_CAPTION_SUFFIX,
} from './types';

// Visual Intent Generator
export {
  generateVisualIntent,
  generateVisualIntentFromQuestion,
  shouldUseVisualAids,
} from './visual-intent-generator';

// Visual Aid Service
export {
  VisualAidService,
  createVisualAidService,
} from './visual-aid-service';

// Module Visual Enrichment (main integration point)
export {
  enrichModuleWithVisuals,
  buildVisualAidContext,
  formatVisualsForFrontend,
  type EnrichedModuleVisuals,
} from './module-visual-enrichment';
