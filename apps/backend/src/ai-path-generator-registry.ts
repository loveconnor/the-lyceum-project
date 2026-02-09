/**
 * Registry-Backed Path Generator
 * Generates learning paths with modules grounded in the Source Registry
 * 
 * This module extends the existing path generation to support registry-backed modules.
 * Labs remain AI-generated and untouched.
 */

import OpenAI from 'openai';
import type { PathOutline } from './ai-path-generator';
import { generatePathOutline } from './ai-path-generator';
import type { 
  ResolveNodesResult, 
  TocNodeSummary,
  GenerateRegistryBackedPathRequest 
} from './source-registry/module-grounding-types';
import { logger } from './logger';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const USE_OLLAMA = process.env.USE_OLLAMA === 'true';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

let openai: OpenAI | null = null;

const ensureClient = () => {
  if (USE_OLLAMA) {
    if (!openai) {
      openai = new OpenAI({
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
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
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
- For programming paths, begin with language/compiler/runtime fundamentals instead of local machine setup.

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
      "include_lab_after": true,
      "suggested_toc_sections": ["Section title 1", "Section title 2"]
    }
  ]
}

Guidelines:
- Create 4-8 modules based on available source material
- Module titles should be clear and match source terminology
- SKIP any setup, installation, overview, or administrative sections
- Focus ONLY on learning content modules
- Labs are optional. Use include_lab_after only at meaningful checkpoints (not after every module).
- Never set include_lab_after for the final module.
- Do not create back-to-back lab checkpoints; spread them out.
- If the user wants something not well-covered in the source, say so in description
- suggested_toc_sections helps with later node mapping (use exact titles from TOC)`;

/**
 * Module outline with suggested TOC sections
 */
export interface RegistryAwareModuleOutline {
  title: string;
  description: string;
  order_index: number;
  include_lab_after?: boolean;
  suggested_toc_sections: string[];
}

/**
 * Registry-aware path outline
 */
export interface RegistryAwarePathOutline extends PathOutline {
  modules: RegistryAwareModuleOutline[];
  source_asset_title?: string;
}

/**
 * Generate a path outline aware of available registry content
 */
export async function generateRegistryAwarePathOutline(
  request: GenerateRegistryBackedPathRequest,
  tocSummaries: TocNodeSummary[],
  assetTitle: string
): Promise<RegistryAwarePathOutline> {
  const startTime = Date.now();
  
  logger.info('registry-path-gen', `Generating registry-aware outline for: "${request.title || request.description}"`, {
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
    
    let parsed: { path: any; modules: RegistryAwareModuleOutline[] };
    try {
      parsed = JSON.parse(rawResponse);
    } catch (parseError) {
      logger.error('registry-path-gen', 'Failed to parse outline response', {
        details: { response: rawResponse.substring(0, 500) },
      });
      throw new Error('Failed to parse AI response for path outline');
    }

    if (!parsed.path || !parsed.modules) {
      throw new Error('Invalid outline structure in AI response');
    }

    const duration = Date.now() - startTime;
    logger.info('registry-path-gen', `Outline generated with ${parsed.modules.length} modules`, {
      duration,
    });

    return {
      ...parsed.path,
      modules: parsed.modules,
      source_asset_title: assetTitle,
    };

  } catch (error) {
    logger.error('registry-path-gen', `Outline generation failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Map suggested TOC sections to actual node IDs
 * This is a helper to connect AI suggestions to real nodes
 */
export function mapSuggestedSectionsToNodes(
  suggestedSections: string[],
  tocSummaries: TocNodeSummary[]
): string[] {
  const matchedIds: string[] = [];
  const normalizedToc = new Map(
    tocSummaries.map(s => [normalizeTitle(s.title), s.node_id])
  );

  for (const suggested of suggestedSections) {
    const normalized = normalizeTitle(suggested);
    
    // Try exact match first
    if (normalizedToc.has(normalized)) {
      matchedIds.push(normalizedToc.get(normalized)!);
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
function normalizeTitle(title: string): string {
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
export async function generateRegistryBackedPath(
  request: GenerateRegistryBackedPathRequest,
  tocSummaries: TocNodeSummary[],
  assetTitle: string
): Promise<{
  outline: RegistryAwarePathOutline;
  moduleNodeMappings: Map<number, string[]>; // order_index -> node_ids
}> {
  // Generate the outline
  const outline = await generateRegistryAwarePathOutline(
    request,
    tocSummaries,
    assetTitle
  );

  // Filter out any setup/admin modules that slipped through
  const setupPatterns = [
    /setup/i,
    /install/i,
    /environment\s*setup/i,
    /set(?:ting)?\s*up\s+.*environment/i,
    /configuration/i,
    /getting\s*started/i,
    /prerequisites/i,
    /requirements/i,
    /overview.*setup/i,
    /overview.*environment/i,
    /syllabus/i,
    /course\s*info/i,
    /ide/i,
    /download/i,
    /tooling/i,
  ];

  const filteredModules = outline.modules.filter(module => {
    const combined = `${module.title || ''} ${module.description || ''}`.trim();
    const shouldExclude = setupPatterns.some(pattern => pattern.test(combined));
    if (shouldExclude) {
      logger.info('registry-path-gen', `Filtering out setup module from outline: "${module.title}"`);
    }
    return !shouldExclude;
  });

  // Reassign order indices after filtering
  filteredModules.forEach((module, index) => {
    module.order_index = index;
  });

  if (filteredModules.length > 0) {
    filteredModules[filteredModules.length - 1].include_lab_after = false;
  }

  outline.modules = filteredModules;

  logger.info('registry-path-gen', `Path outline: ${outline.modules.length} learning modules (setup content filtered)`);

  // Pre-map suggested sections to node IDs
  const moduleNodeMappings = new Map<number, string[]>();
  
  for (const module of outline.modules) {
    const nodeIds = mapSuggestedSectionsToNodes(
      module.suggested_toc_sections || [],
      tocSummaries
    );
    moduleNodeMappings.set(module.order_index, nodeIds);
    
    logger.info('registry-path-gen', `Module "${module.title}" mapped to ${nodeIds.length} nodes`, {
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
