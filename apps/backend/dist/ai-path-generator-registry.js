"use strict";
/**
 * Registry-Backed Path Generator
 * Generates learning paths with modules grounded in the Source Registry
 *
 * This module extends the existing path generation to support registry-backed modules.
 * Labs remain AI-generated and untouched.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRegistryAwarePathOutline = generateRegistryAwarePathOutline;
exports.mapSuggestedSectionsToNodes = mapSuggestedSectionsToNodes;
exports.generateRegistryBackedPath = generateRegistryBackedPath;
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("./logger");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const USE_OLLAMA = process.env.USE_OLLAMA === 'true';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
let openai = null;
const ensureClient = () => {
    if (USE_OLLAMA) {
        if (!openai) {
            openai = new openai_1.default({
                baseURL: OLLAMA_BASE_URL,
                apiKey: 'ollama',
            });
        }
        return openai;
    }
    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured');
    }
    if (!openai) {
        openai = new openai_1.default({ apiKey: OPENAI_API_KEY });
    }
    return openai;
};
/**
 * Prompt for generating path outline based on available TOC
 */
const REGISTRY_AWARE_OUTLINE_PROMPT = `You are an expert curriculum designer for Lyceum, an educational platform. 
Your job is to create a learning path outline that is GROUNDED in the available source material.

You are given:
1. A learning goal/description from the user
2. A table of contents from an authoritative source (like a textbook)

Your task is to:
1. Design a learning path that covers the requested topic
2. Each module should align with sections available in the source TOC
3. Create module titles that reflect what can actually be taught from the source
4. If the source doesn't cover certain aspects, note that in the module description

CRITICAL - EXCLUDE THESE FROM MODULES:
- Setup, installation, or environment configuration content
- Course overview, syllabus, or administrative information
- Prerequisites, requirements, or logistics
- Resources, downloads, or software installation
- "Getting Started" or "How to Use" sections

ONLY CREATE MODULES FOR ACTUAL LEARNING CONTENT:
- Concepts, theories, and explanations
- Skills, techniques, and methods
- Applications, examples, and practice
- Advanced topics and specializations

Respond with JSON only in this structure:
{
  "path": {
    "title": "Path title based on topic and available content",
    "description": "2-3 sentence description noting this is grounded in [source name]",
    "difficulty": "beginner" | "intermediate" | "advanced",
    "estimated_duration": number (total hours),
    "topics": ["topic1", "topic2"]
  },
  "modules": [
    {
      "title": "Module title matching available source content (NO setup/admin content)",
      "description": "What this module covers, aligned with source sections",
      "order_index": 0,
      "suggested_toc_sections": ["Section title 1", "Section title 2"]
    }
  ]
}

Guidelines:
- Create 4-8 modules based on available source material
- Module titles should be clear and match source terminology
- SKIP any setup, installation, overview, or administrative sections
- Focus ONLY on learning content modules
- If the user wants something not well-covered in the source, say so in description
- suggested_toc_sections helps with later node mapping (use exact titles from TOC)`;
/**
 * Generate a path outline aware of available registry content
 */
async function generateRegistryAwarePathOutline(request, tocSummaries, assetTitle) {
    const startTime = Date.now();
    logger_1.logger.info('registry-path-gen', `Generating registry-aware outline for: "${request.title || request.description}"`, {
        details: {
            assetTitle,
            tocNodeCount: tocSummaries.length,
        },
    });
    // Format TOC for AI
    const tocFormatted = tocSummaries.map(s => {
        const indent = '  '.repeat(s.depth);
        return `${indent}- ${s.title} (${s.node_type})`;
    }).join('\n');
    const client = ensureClient();
    const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;
    const userPrompt = `Create a learning path outline for:

Learning Goal: ${request.description || request.title}
${request.title ? `Suggested Title: ${request.title}` : ''}
Difficulty Level: ${request.difficulty}
${request.topics && request.topics.length > 0 ? `Focus Topics: ${request.topics.join(', ')}` : ''}

Available Source Material from "${assetTitle}":
${tocFormatted}

Design modules that can be fully supported by the available source content.
For each module, suggest which TOC sections should be used (use exact titles).`;
    try {
        const completion = await client.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: REGISTRY_AWARE_OUTLINE_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 3000,
            response_format: { type: 'json_object' },
        });
        const rawResponse = completion.choices[0]?.message?.content || '{}';
        let parsed;
        try {
            parsed = JSON.parse(rawResponse);
        }
        catch (parseError) {
            logger_1.logger.error('registry-path-gen', 'Failed to parse outline response', {
                details: { response: rawResponse.substring(0, 500) },
            });
            throw new Error('Failed to parse AI response for path outline');
        }
        if (!parsed.path || !parsed.modules) {
            throw new Error('Invalid outline structure in AI response');
        }
        const duration = Date.now() - startTime;
        logger_1.logger.info('registry-path-gen', `Outline generated with ${parsed.modules.length} modules`, {
            duration,
        });
        return {
            ...parsed.path,
            modules: parsed.modules,
            source_asset_title: assetTitle,
        };
    }
    catch (error) {
        logger_1.logger.error('registry-path-gen', `Outline generation failed: ${error.message}`);
        throw error;
    }
}
/**
 * Map suggested TOC sections to actual node IDs
 * This is a helper to connect AI suggestions to real nodes
 */
function mapSuggestedSectionsToNodes(suggestedSections, tocSummaries) {
    const matchedIds = [];
    const normalizedToc = new Map(tocSummaries.map(s => [normalizeTitle(s.title), s.node_id]));
    for (const suggested of suggestedSections) {
        const normalized = normalizeTitle(suggested);
        // Try exact match first
        if (normalizedToc.has(normalized)) {
            matchedIds.push(normalizedToc.get(normalized));
            continue;
        }
        // Try partial match (suggested is substring of TOC title or vice versa)
        for (const [tocNorm, nodeId] of normalizedToc) {
            if (tocNorm.includes(normalized) || normalized.includes(tocNorm)) {
                if (!matchedIds.includes(nodeId)) {
                    matchedIds.push(nodeId);
                }
                break;
            }
        }
    }
    return matchedIds;
}
/**
 * Normalize title for comparison
 */
function normalizeTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Generate a complete registry-backed path
 * Returns path outline with pre-resolved node mappings for each module
 */
async function generateRegistryBackedPath(request, tocSummaries, assetTitle) {
    // Generate the outline
    const outline = await generateRegistryAwarePathOutline(request, tocSummaries, assetTitle);
    // Filter out any setup/admin modules that slipped through
    const setupPatterns = [
        /setup/i,
        /install/i,
        /environment/i,
        /configuration/i,
        /getting\s*started/i,
        /prerequisites/i,
        /requirements/i,
        /overview.*setup/i,
        /overview.*environment/i,
        /syllabus/i,
        /course\s*info/i,
    ];
    const filteredModules = outline.modules.filter(module => {
        const shouldExclude = setupPatterns.some(pattern => pattern.test(module.title));
        if (shouldExclude) {
            logger_1.logger.info('registry-path-gen', `Filtering out setup module from outline: "${module.title}"`);
        }
        return !shouldExclude;
    });
    // Reassign order indices after filtering
    filteredModules.forEach((module, index) => {
        module.order_index = index;
    });
    outline.modules = filteredModules;
    logger_1.logger.info('registry-path-gen', `Path outline: ${outline.modules.length} learning modules (setup content filtered)`);
    // Pre-map suggested sections to node IDs
    const moduleNodeMappings = new Map();
    for (const module of outline.modules) {
        const nodeIds = mapSuggestedSectionsToNodes(module.suggested_toc_sections || [], tocSummaries);
        moduleNodeMappings.set(module.order_index, nodeIds);
        logger_1.logger.info('registry-path-gen', `Module "${module.title}" mapped to ${nodeIds.length} nodes`, {
            details: {
                suggested: module.suggested_toc_sections,
                matched: nodeIds.length,
            },
        });
    }
    return {
        outline,
        moduleNodeMappings,
    };
}
