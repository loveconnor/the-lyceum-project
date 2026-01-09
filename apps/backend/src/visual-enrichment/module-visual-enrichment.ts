/**
 * Module Visual Enrichment
 * 
 * Main integration point for adding visual aids to module content.
 * Orchestrates visual intent generation and aid fetching.
 * 
 * CRITICAL: This is an enrichment layer - if it fails, module
 * rendering continues with text-only content. Visuals are supplemental.
 */

import type {
  VisualIntent,
  VisualAid,
  VisualAidResult,
  VisualIntentResult,
  GenerateVisualIntentRequest,
  VisualAidContext,
} from './types';
import { VISUAL_AID_INSTRUCTION } from './types';
import { generateVisualIntent } from './visual-intent-generator';
import { createVisualAidService } from './visual-aid-service';
import { logger } from '../source-registry/logger';

/**
 * Result of enriching a module with visuals
 */
export interface EnrichedModuleVisuals {
  /** Visual aids fetched for the module */
  visual_aids: VisualAid[];
  
  /** Whether visuals are available */
  has_visuals: boolean;
  
  /** The generated visual intents */
  intents: VisualIntent[];
  
  /** Whether visual enrichment was successful */
  enrichment_successful: boolean;
  
  /** Error message if enrichment failed */
  error?: string;
  
  /** Timestamp of enrichment */
  enriched_at: string;
}

/**
 * Enrich a module with visual aids.
 * 
 * This is the main entry point for the visual enrichment layer.
 * It generates visual intents based on module content, fetches
 * appropriate images, and returns them for rendering.
 * 
 * @param request - Module content for visual intent generation
 * @returns EnrichedModuleVisuals with visual aids or empty result
 */
export async function enrichModuleWithVisuals(
  request: GenerateVisualIntentRequest
): Promise<EnrichedModuleVisuals> {
  const startTime = Date.now();
  
  logger.info('module-visual-enrichment', `Starting visual enrichment for: "${request.module_title}"`);

  try {
    // Step 1: Generate visual intents
    const intentResult = await generateVisualIntent(request);
    
    if (!intentResult.visuals_recommended || intentResult.intents.length === 0) {
      logger.info('module-visual-enrichment', `No visuals recommended for: "${request.module_title}"`);
      return {
        visual_aids: [],
        has_visuals: false,
        intents: [],
        enrichment_successful: true,
        enriched_at: new Date().toISOString(),
      };
    }

    // Step 2: Fetch visual aids
    const visualAidService = createVisualAidService();
    const aidResult = await visualAidService.fetchVisualAids(intentResult.intents);

    const duration = Date.now() - startTime;
    logger.info('module-visual-enrichment', `Visual enrichment complete for: "${request.module_title}"`, {
      duration,
      details: {
        intents_generated: intentResult.intents.length,
        aids_fetched: aidResult.visual_aids.length,
        failed_intents: aidResult.failed_intents.length,
      },
    });

    return {
      visual_aids: aidResult.visual_aids,
      has_visuals: aidResult.has_visuals,
      intents: intentResult.intents,
      enrichment_successful: true,
      enriched_at: aidResult.fetched_at,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('module-visual-enrichment', `Visual enrichment failed: ${(error as Error).message}`, {
      duration,
    });

    // Graceful degradation - return empty result, don't break module rendering
    return {
      visual_aids: [],
      has_visuals: false,
      intents: [],
      enrichment_successful: false,
      error: (error as Error).message,
      enriched_at: new Date().toISOString(),
    };
  }
}

/**
 * Build context for AI to safely reference visual aids.
 * 
 * This creates the instruction and context that should be passed
 * to the AI when generating explanations or assistant responses.
 * 
 * @param visualAids - The visual aids available for the module
 * @returns VisualAidContext to pass to AI
 */
export function buildVisualAidContext(visualAids: VisualAid[]): VisualAidContext {
  if (!visualAids || visualAids.length === 0) {
    return {
      visual_aids: [],
      instruction: '',
    };
  }

  // Build detailed instruction with visual descriptions
  const visualDescriptions = visualAids.map((aid, index) => {
    return `Visual ${index + 1}: ${aid.alt}\n  - Concept: ${aid.intent.concept}\n  - Type: ${aid.intent.visual_type}`;
  }).join('\n');

  const instruction = `${VISUAL_AID_INSTRUCTION}

Available Illustrative Visuals:
${visualDescriptions}

When referencing these visuals:
- Say "The illustrative diagram shows..." or "As illustrated in the visual..."
- NEVER say "According to the diagram..." (implies authority)
- Use visuals to support understanding of concepts from the source text
- If a visual doesn't match the text perfectly, prioritize the text`;

  return {
    visual_aids: visualAids,
    instruction,
  };
}

/**
 * Format visual aids for frontend rendering.
 * 
 * This transforms VisualAid objects into the format expected
 * by the frontend module viewer.
 */
export function formatVisualsForFrontend(visualAids: VisualAid[]): Array<{
  type: 'illustrative_image';
  src: string;
  alt: string;
  caption: string;
  usage_label: 'illustrative';
  attribution?: string;
  thumbnail_src?: string;
}> {
  return visualAids.map(aid => ({
    type: 'illustrative_image' as const,
    src: aid.src,
    alt: aid.alt,
    caption: aid.caption,
    usage_label: aid.usage_label,
    attribution: aid.attribution,
    thumbnail_src: aid.thumbnail_src,
  }));
}
