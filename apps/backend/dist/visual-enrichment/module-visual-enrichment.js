"use strict";
/**
 * Module Visual Enrichment
 *
 * Main integration point for adding visual aids to module content.
 * Orchestrates visual intent generation and aid fetching.
 *
 * CRITICAL: This is an enrichment layer - if it fails, module
 * rendering continues with text-only content. Visuals are supplemental.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichModuleWithVisuals = enrichModuleWithVisuals;
exports.buildVisualAidContext = buildVisualAidContext;
exports.formatVisualsForFrontend = formatVisualsForFrontend;
const types_1 = require("./types");
const visual_intent_generator_1 = require("./visual-intent-generator");
const visual_aid_service_1 = require("./visual-aid-service");
const logger_1 = require("../logger");
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
async function enrichModuleWithVisuals(request) {
    const startTime = Date.now();
    logger_1.logger.info('module-visual-enrichment', `Starting visual enrichment for: "${request.module_title}"`);
    try {
        // Step 1: Generate visual intents
        const intentResult = await (0, visual_intent_generator_1.generateVisualIntent)(request);
        if (!intentResult.visuals_recommended || intentResult.intents.length === 0) {
            logger_1.logger.info('module-visual-enrichment', `No visuals recommended for: "${request.module_title}"`);
            return {
                visual_aids: [],
                has_visuals: false,
                intents: [],
                enrichment_successful: true,
                enriched_at: new Date().toISOString(),
            };
        }
        // Step 2: Fetch visual aids
        const visualAidService = (0, visual_aid_service_1.createVisualAidService)();
        const aidResult = await visualAidService.fetchVisualAids(intentResult.intents);
        const duration = Date.now() - startTime;
        logger_1.logger.info('module-visual-enrichment', `Visual enrichment complete for: "${request.module_title}"`, {
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
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger_1.logger.error('module-visual-enrichment', `Visual enrichment failed: ${error.message}`, {
            duration,
        });
        // Graceful degradation - return empty result, don't break module rendering
        return {
            visual_aids: [],
            has_visuals: false,
            intents: [],
            enrichment_successful: false,
            error: error.message,
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
function buildVisualAidContext(visualAids) {
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
    const instruction = `${types_1.VISUAL_AID_INSTRUCTION}

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
function formatVisualsForFrontend(visualAids) {
    return visualAids.map(aid => ({
        type: 'illustrative_image',
        src: aid.src,
        alt: aid.alt,
        caption: aid.caption,
        usage_label: aid.usage_label,
        attribution: aid.attribution,
        thumbnail_src: aid.thumbnail_src,
    }));
}
