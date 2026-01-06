/**
 * Module Node Resolver
 * Uses AI to select appropriate Source Registry nodes for a module
 */

import OpenAI from 'openai';
import type { TocNode } from './types';
import type { 
  TocNodeSummary, 
  NodeSelectionResult, 
  ResolveNodesRequest, 
  ResolveNodesResult 
} from './module-grounding-types';
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
 * Convert full TocNodes to summaries for AI consumption
 */
function toTocSummaries(nodes: TocNode[]): TocNodeSummary[] {
  return nodes.map(node => ({
    node_id: node.id!,
    title: node.title,
    order: node.sort_order,
    depth: node.depth,
    node_type: node.node_type,
  }));
}

/**
 * Filter out setup/administrative/logistics sections from TOC
 * These sections should never become learning modules
 */
export function filterNonLearningContent(summaries: TocNodeSummary[]): TocNodeSummary[] {
  const excludePatterns = [
    // Setup and installation (including combined patterns)
    /setup/i,
    /install/i,
    /environment/i,
    /development\s*environment/i,
    /configuration/i,
    /getting\s*started/i,
    /prerequisites/i,
    /requirements/i,
    
    // Administrative (including combined patterns)
    /syllabus/i,
    /course\s*info/i,
    /course\s*overview/i,
    /overview.*setup/i,
    /overview.*environment/i,
    /overview.*installation/i,
    /grading/i,
    /policy/i,
    /policies/i,
    /schedule/i,
    /calendar/i,
    /logistics/i,
    
    // Resources/Downloads
    /resources/i,
    /downloads/i,
    /materials/i,
    /software/i,
    /^tools$/i,
    
    // Preface/Introduction sections (often not learning content)
    /^preface$/i,
    /^about\s*this/i,
    /^how\s*to\s*use/i,
    /^introduction$/i,
  ];

  return summaries.filter(summary => {
    const title = summary.title.toLowerCase().trim();
    const shouldExclude = excludePatterns.some(pattern => pattern.test(title));
    
    if (shouldExclude) {
      logger.info('node-resolver', `Filtering out non-learning content: "${summary.title}"`);  
    }
    
    return !shouldExclude;
  });
}

const NODE_SELECTION_PROMPT = `You are helping to ground educational module content in authoritative source material.

Given a module title and a table of contents from a trusted educational source, select the MOST APPROPRIATE sections that should be used to create the module content.

IMPORTANT RULES:
1. Select sections that DIRECTLY relate to the module topic
2. Prefer specific sections over broad chapter-level nodes
3. Select 1-5 nodes maximum - be selective
4. If the module topic is clearly not covered in the TOC, return an empty array
5. Consider the logical order and depth - prefer sections at similar depths
6. **EXCLUDE setup, installation, environment, prerequisites, and administrative sections** - only select learning content
7. Skip sections about: "Getting Started", "Setup", "Installation", "Environment", "Prerequisites", "Course Info", "Syllabus", "Requirements", "Resources", "Downloads"

Respond with JSON ONLY in this exact structure:
{
  "selected_node_ids": ["node_id_1", "node_id_2"],
  "reasoning": "Brief explanation of why these sections were selected"
}

If no suitable sections exist for this module topic:
{
  "selected_node_ids": [],
  "reasoning": "Explanation of why no suitable content was found"
}`;

/**
 * Ask AI to select appropriate TOC nodes for a module
 */
export async function selectNodesForModule(
  moduleTitle: string,
  moduleDescription: string,
  tocNodes: TocNode[],
  pathContext?: string
): Promise<NodeSelectionResult> {
  const startTime = Date.now();
  
  logger.info('node-resolver', `Selecting nodes for module: "${moduleTitle}"`, {
    details: { nodeCount: tocNodes.length },
  });

  const summaries = toTocSummaries(tocNodes);
  const filteredSummaries = filterNonLearningContent(summaries);
  
  if (filteredSummaries.length === 0) {
    logger.warn('node-resolver', 'No learning content nodes available after filtering');
    return {
      selected_node_ids: [],
      reasoning: 'All available nodes were setup/administrative content',
    };
  }
  
  logger.info('node-resolver', `Filtered ${summaries.length - filteredSummaries.length} non-learning nodes`);
  
  // Format TOC for AI readability
  const tocFormatted = filteredSummaries.map(s => {
    const indent = '  '.repeat(s.depth);
    return `${indent}[${s.node_id}] ${s.title} (${s.node_type}, order: ${s.order})`;
  }).join('\n');

  const userPrompt = `Module Title: ${moduleTitle}
Module Description: ${moduleDescription}
${pathContext ? `Learning Path Context: ${pathContext}` : ''}

Table of Contents:
${tocFormatted}

Select the most appropriate sections for this module.`;

  const client = ensureClient();
  const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: NODE_SELECTION_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Low temperature for more deterministic selection
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const rawResponse = completion.choices[0]?.message?.content || '{}';
    
    let result: NodeSelectionResult;
    try {
      result = JSON.parse(rawResponse);
    } catch (parseError) {
      logger.error('node-resolver', 'Failed to parse AI response', {
        details: { response: rawResponse.substring(0, 500) },
      });
      return {
        selected_node_ids: [],
        reasoning: 'Failed to parse AI response for node selection',
      };
    }

    // Validate that selected node IDs actually exist in filtered summaries
    const validNodeIds = new Set(filteredSummaries.map(s => s.node_id));
    const validatedIds = (result.selected_node_ids || []).filter(id => validNodeIds.has(id));

    if (validatedIds.length !== result.selected_node_ids?.length) {
      logger.warn('node-resolver', 'Some selected node IDs were invalid or filtered out', {
        details: {
          requested: result.selected_node_ids,
          valid: validatedIds,
        },
      });
    }

    const duration = Date.now() - startTime;
    logger.info('node-resolver', `Node selection complete for "${moduleTitle}"`, {
      duration,
      details: {
        selectedCount: validatedIds.length,
        reasoning: result.reasoning,
      },
    });

    return {
      selected_node_ids: validatedIds,
      reasoning: result.reasoning || '',
    };

  } catch (error) {
    logger.error('node-resolver', `AI node selection failed: ${(error as Error).message}`, {
      details: { moduleTitle },
    });
    throw error;
  }
}

/**
 * Resolve registry nodes for a module
 * Main entry point for the node resolution flow
 */
export async function resolveNodesForModule(
  request: ResolveNodesRequest,
  tocNodes: TocNode[]
): Promise<ResolveNodesResult> {
  const startTime = Date.now();
  
  logger.info('node-resolver', `Resolving nodes for module: "${request.module_title}"`, {
    details: { 
      assetId: request.source_asset_id,
      availableNodes: tocNodes.length,
    },
  });

  // If no TOC nodes available, mark as content unavailable
  if (!tocNodes || tocNodes.length === 0) {
    logger.warn('node-resolver', 'No TOC nodes available for asset', {
      details: { assetId: request.source_asset_id },
    });
    
    return {
      source_asset_id: request.source_asset_id,
      source_node_ids: [],
      content_unavailable: true,
      reasoning: 'No table of contents nodes available for this source asset',
      resolved_at: new Date().toISOString(),
    };
  }

  try {
    const selectionResult = await selectNodesForModule(
      request.module_title,
      request.module_description,
      tocNodes,
      request.path_context
    );

    const contentUnavailable = selectionResult.selected_node_ids.length === 0;

    const duration = Date.now() - startTime;
    logger.info('node-resolver', `Node resolution complete for "${request.module_title}"`, {
      duration,
      details: {
        selectedCount: selectionResult.selected_node_ids.length,
        contentUnavailable,
      },
    });

    return {
      source_asset_id: request.source_asset_id,
      source_node_ids: selectionResult.selected_node_ids,
      content_unavailable: contentUnavailable,
      reasoning: selectionResult.reasoning,
      resolved_at: new Date().toISOString(),
    };

  } catch (error) {
    logger.error('node-resolver', `Node resolution failed: ${(error as Error).message}`, {
      details: { moduleTitle: request.module_title },
    });

    // On error, mark as unavailable rather than failing completely
    return {
      source_asset_id: request.source_asset_id,
      source_node_ids: [],
      content_unavailable: true,
      reasoning: `Node resolution failed: ${(error as Error).message}`,
      resolved_at: new Date().toISOString(),
    };
  }
}

