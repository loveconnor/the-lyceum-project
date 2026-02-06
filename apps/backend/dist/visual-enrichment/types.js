"use strict";
/**
 * Visual Enrichment Layer Types
 *
 * Types for the supplemental visual system that adds illustrative diagrams
 * to modules. Visuals are NON-AUTHORITATIVE aids only - source text remains
 * the sole source of truth.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VISUAL_CAPTION_SUFFIX = exports.VISUAL_AID_INSTRUCTION = exports.DEFAULT_VISUAL_FETCH_CONFIG = void 0;
/**
 * Default configuration for visual fetching
 */
exports.DEFAULT_VISUAL_FETCH_CONFIG = {
    max_per_intent: 3,
    timeout_ms: 10000,
    diagrams_only: true,
    min_width: 200,
    min_height: 200,
};
/**
 * The standard instruction to include when visuals are present
 */
exports.VISUAL_AID_INSTRUCTION = `VISUAL CONTEXT: Illustrative diagrams are being shown above your response.

IMPORTANT RESPONSE RULES:
- Do NOT mention, reference, or describe the visuals in your reply.
- Do NOT point to any "diagram", "image", or "picture".
- The response should stand alone as if no visuals were provided.

The visuals are supplemental and are NOT authoritative sources.`;
/**
 * Caption suffix to add to all visual displays
 */
exports.VISUAL_CAPTION_SUFFIX = '(Illustrative diagram — not from the source text)';
