"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatVisualsForFrontend = exports.buildVisualAidContext = exports.enrichModuleWithVisuals = exports.createVisualAidService = exports.VisualAidService = exports.shouldUseVisualAids = exports.generateVisualIntentFromQuestion = exports.generateVisualIntent = exports.VISUAL_CAPTION_SUFFIX = exports.VISUAL_AID_INSTRUCTION = exports.DEFAULT_VISUAL_FETCH_CONFIG = void 0;
var types_1 = require("./types");
Object.defineProperty(exports, "DEFAULT_VISUAL_FETCH_CONFIG", { enumerable: true, get: function () { return types_1.DEFAULT_VISUAL_FETCH_CONFIG; } });
Object.defineProperty(exports, "VISUAL_AID_INSTRUCTION", { enumerable: true, get: function () { return types_1.VISUAL_AID_INSTRUCTION; } });
Object.defineProperty(exports, "VISUAL_CAPTION_SUFFIX", { enumerable: true, get: function () { return types_1.VISUAL_CAPTION_SUFFIX; } });
// Visual Intent Generator
var visual_intent_generator_1 = require("./visual-intent-generator");
Object.defineProperty(exports, "generateVisualIntent", { enumerable: true, get: function () { return visual_intent_generator_1.generateVisualIntent; } });
Object.defineProperty(exports, "generateVisualIntentFromQuestion", { enumerable: true, get: function () { return visual_intent_generator_1.generateVisualIntentFromQuestion; } });
Object.defineProperty(exports, "shouldUseVisualAids", { enumerable: true, get: function () { return visual_intent_generator_1.shouldUseVisualAids; } });
// Visual Aid Service
var visual_aid_service_1 = require("./visual-aid-service");
Object.defineProperty(exports, "VisualAidService", { enumerable: true, get: function () { return visual_aid_service_1.VisualAidService; } });
Object.defineProperty(exports, "createVisualAidService", { enumerable: true, get: function () { return visual_aid_service_1.createVisualAidService; } });
// Module Visual Enrichment (main integration point)
var module_visual_enrichment_1 = require("./module-visual-enrichment");
Object.defineProperty(exports, "enrichModuleWithVisuals", { enumerable: true, get: function () { return module_visual_enrichment_1.enrichModuleWithVisuals; } });
Object.defineProperty(exports, "buildVisualAidContext", { enumerable: true, get: function () { return module_visual_enrichment_1.buildVisualAidContext; } });
Object.defineProperty(exports, "formatVisualsForFrontend", { enumerable: true, get: function () { return module_visual_enrichment_1.formatVisualsForFrontend; } });
