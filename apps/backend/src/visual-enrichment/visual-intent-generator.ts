/**
 * Visual Intent Generator
 * 
 * Generates structured VisualIntent objects from module content.
 * This function analyzes registry-backed text and determines what
 * kinds of visuals would help illustrate the concepts.
 * 
 * CRITICAL: This function MUST NOT fetch images. It only generates
 * specifications for what to search for.
 */

import OpenAI from 'openai';
import type { 
  VisualIntent, 
  VisualIntentResult, 
  GenerateVisualIntentRequest 
} from './types';
import { logger } from '../source-registry/logger';

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
 * System prompt for visual intent generation
 */
const VISUAL_INTENT_SYSTEM_PROMPT = `You are an educational visual design assistant. Your job is to analyze learning content and suggest what types of illustrative diagrams would help learners understand the concepts.

CRITICAL RULES:
1. You are NOT generating images - only specifications for what to search for
2. Visuals are SUPPLEMENTAL AIDS only - they do not replace source text
3. Suggest ONLY diagrams, flowcharts, graphs, or conceptual illustrations
4. NEVER suggest photos of real objects/people
5. NEVER suggest proprietary screenshots or copyrighted material
6. Focus on abstract, educational diagrams that illustrate relationships

When analyzing content, consider:
- What processes could be shown as a flowchart?
- What relationships could be shown as a diagram?
- What data could be shown as a graph or plot?
- What structures could be shown as a visual hierarchy?

Return JSON only with this structure:
{
  "visuals_recommended": true/false,
  "reasoning": "Brief explanation of why visuals would/wouldn't help",
  "intents": [
    {
      "concept": "The core concept being illustrated",
      "visual_type": "diagram" | "graph" | "plot" | "flow",
      "key_elements": ["element1", "element2"],
      "constraints": ["avoid photos", "no proprietary content"],
      "search_query": "educational diagram [topic] concept illustration",
      "priority": 1-10
    }
  ]
}

Guidelines for visual_type:
- "diagram": For structures, relationships, components
- "graph": For data relationships, networks, connections
- "plot": For mathematical functions, data trends, distributions
- "flow": For processes, workflows, sequences, algorithms

CRITICAL Guidelines for search_query:
- Keep queries SHORT: 2-4 words maximum
- Use simple, common terms that would appear in image filenames
- Format: "[subject] [type]" e.g., "rectangle area diagram", "photosynthesis diagram", "cell division illustration"
- NO complex phrases or sentences
- NO special characters (×, =, etc.)
- Examples of GOOD queries: "rectangle area diagram", "DNA structure", "water cycle illustration"
- Examples of BAD queries: "educational diagram showing area = length × width"

If the content is primarily text-based definitions or abstract theory without visual concepts, set visuals_recommended to false.`;

/**
 * Generate visual intents for a module based on its content.
 * 
 * This analyzes the module text and registry context to determine
 * what kinds of visuals would help illustrate the concepts.
 * 
 * @param request - The request containing module content
 * @returns VisualIntentResult with generated intents
 */
export async function generateVisualIntent(
  request: GenerateVisualIntentRequest
): Promise<VisualIntentResult> {
  const startTime = Date.now();
  
  logger.info('visual-intent', `Generating visual intents for module: "${request.module_title}"`, {
    details: {
      nodeCount: request.registry_node_titles.length,
      textLength: request.explanation_text.length,
    },
  });

  try {
    const client = ensureClient();
    const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;

    // Build the user prompt with module context
    const userPrompt = buildUserPrompt(request);

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: VISUAL_INTENT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const rawResponse = completion.choices[0]?.message?.content || '{}';
    
    let parsed: {
      visuals_recommended?: boolean;
      reasoning?: string;
      intents?: any[];
    };
    
    try {
      parsed = JSON.parse(rawResponse);
    } catch (parseError) {
      logger.error('visual-intent', 'Failed to parse AI response', {
        details: { response: rawResponse.substring(0, 500) },
      });
      
      // Return empty result on parse failure
      return {
        intents: [],
        reasoning: 'Failed to parse visual intent response',
        visuals_recommended: false,
        generated_at: new Date().toISOString(),
      };
    }

    // Validate and normalize intents
    const intents = validateIntents(parsed.intents || []);
    
    const duration = Date.now() - startTime;
    logger.info('visual-intent', `Generated ${intents.length} visual intents`, {
      duration,
      details: {
        visuals_recommended: parsed.visuals_recommended,
        intent_count: intents.length,
      },
    });

    return {
      intents,
      reasoning: parsed.reasoning || 'Visual intents generated',
      visuals_recommended: parsed.visuals_recommended ?? intents.length > 0,
      generated_at: new Date().toISOString(),
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('visual-intent', `Failed to generate visual intents: ${(error as Error).message}`, {
      duration,
    });

    // Graceful degradation - return empty result
    return {
      intents: [],
      reasoning: `Error generating visual intents: ${(error as Error).message}`,
      visuals_recommended: false,
      generated_at: new Date().toISOString(),
    };
  }
}

/**
 * Build the user prompt for visual intent generation
 */
function buildUserPrompt(request: GenerateVisualIntentRequest): string {
  const parts: string[] = [];

  parts.push(`## Module Title\n${request.module_title}`);
  parts.push('');

  if (request.registry_node_titles.length > 0) {
    parts.push(`## Source Sections\n${request.registry_node_titles.join('\n')}`);
    parts.push('');
  }

  if (request.learning_objectives && request.learning_objectives.length > 0) {
    parts.push(`## Learning Objectives\n${request.learning_objectives.map(o => `- ${o}`).join('\n')}`);
    parts.push('');
  }

  if (request.key_concepts && request.key_concepts.length > 0) {
    parts.push(`## Key Concepts\n${request.key_concepts.map(c => `- ${c}`).join('\n')}`);
    parts.push('');
  }

  // Truncate explanation text if too long
  const maxTextLength = 3000;
  const explanationText = request.explanation_text.length > maxTextLength
    ? request.explanation_text.substring(0, maxTextLength) + '...'
    : request.explanation_text;

  parts.push(`## Module Content\n${explanationText}`);
  parts.push('');
  
  parts.push('Analyze this educational content and suggest what illustrative diagrams would help learners understand the concepts. Remember: only suggest diagrams/illustrations, never photos.');

  return parts.join('\n');
}

/**
 * Validate and normalize visual intents from AI response
 */
function validateIntents(rawIntents: any[]): VisualIntent[] {
  if (!Array.isArray(rawIntents)) {
    return [];
  }

  const validTypes = ['diagram', 'graph', 'plot', 'flow'];
  const validated: VisualIntent[] = [];

  for (const intent of rawIntents) {
    if (!intent || typeof intent !== 'object') {
      continue;
    }

    // Validate required fields
    if (!intent.concept || typeof intent.concept !== 'string') {
      continue;
    }

    if (!intent.search_query || typeof intent.search_query !== 'string') {
      continue;
    }

    const visualType = validTypes.includes(intent.visual_type) 
      ? intent.visual_type 
      : 'diagram';

    const keyElements = Array.isArray(intent.key_elements) 
      ? intent.key_elements.filter((e: any) => typeof e === 'string')
      : [];

    // Always include standard constraints
    const baseConstraints = [
      'no photographs',
      'no proprietary screenshots',
      'educational diagrams only',
    ];

    const userConstraints = Array.isArray(intent.constraints)
      ? intent.constraints.filter((c: any) => typeof c === 'string')
      : [];

    const constraints = [...new Set([...baseConstraints, ...userConstraints])];

    const priority = typeof intent.priority === 'number' 
      ? Math.max(1, Math.min(10, Math.round(intent.priority)))
      : 5;

    validated.push({
      concept: intent.concept.substring(0, 200),
      visual_type: visualType as VisualIntent['visual_type'],
      key_elements: keyElements.slice(0, 10),
      constraints,
      search_query: sanitizeSearchQuery(intent.search_query),
      priority,
    });
  }

  // Sort by priority (highest first) and limit to top 5
  return validated
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}

/**
 * Sanitize search query to ensure safe, effective searches
 */
function sanitizeSearchQuery(query: string): string {
  // Remove potentially problematic characters
  let cleaned = query
    .replace(/[<>'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);

  // Ensure the query includes terms that help find diagrams
  const diagramTerms = ['diagram', 'illustration', 'flowchart', 'chart', 'graph', 'visual'];
  const hasDigramTerm = diagramTerms.some(term => 
    cleaned.toLowerCase().includes(term)
  );

  if (!hasDigramTerm) {
    cleaned = `${cleaned} diagram`;
  }

  return cleaned;
}

/**
 * Generate visual intent from a chat question.
 * This is used by the AI assistant to fetch visuals for user questions.
 * 
 * @param question - The user's question
 * @returns VisualIntentResult with generated intents (or empty if not visual-appropriate)
 */
export async function generateVisualIntentFromQuestion(
  question: string
): Promise<VisualIntentResult> {
  const startTime = Date.now();
  
  logger.info('visual-intent', `Generating visual intents for question: "${question.substring(0, 100)}..."`);

  try {
    const client = ensureClient();
    const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;

    const prompt = `Analyze this question and determine if an educational diagram/illustration would help the response:

Question: "${question}"

RULES:
1. Only suggest diagrams for questions about processes, relationships, data, or visual concepts
2. Do NOT suggest diagrams for simple definitions or abstract theoretical questions
3. Suggest at most 1-2 visual intents
4. search_query MUST be SHORT (2-4 words) - this is used to search image databases

Return JSON:
{
  "visuals_recommended": true/false,
  "reasoning": "Brief explanation",
  "intents": [
    {
      "concept": "The concept to illustrate",
      "visual_type": "diagram" | "graph" | "plot" | "flow",
      "key_elements": ["element1", "element2"],
      "constraints": ["no photos", "educational only"],
      "search_query": "2-4 word query like 'rectangle area diagram'"
    }
  ]
}

CRITICAL: search_query examples:
✓ GOOD: "rectangle area diagram", "photosynthesis diagram", "DNA structure"
✗ BAD: "educational diagram showing area = length × width" (too long!)

Questions and expected search_query:
- "How do I calculate area of rectangles?" → search_query: "rectangle area diagram"
- "Explain photosynthesis" → search_query: "photosynthesis diagram"
- "What is the difference between HTTP and HTTPS?" → search_query: "HTTP HTTPS comparison"
- "What is Python?" → visuals_recommended: false (definition, too abstract)
- "How do I feel better?" → visuals_recommended: false (not educational/visual)`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const rawResponse = completion.choices[0]?.message?.content || '{}';
    
    let parsed: {
      visuals_recommended?: boolean;
      reasoning?: string;
      intents?: any[];
    };
    
    try {
      parsed = JSON.parse(rawResponse);
    } catch (parseError) {
      logger.error('visual-intent', 'Failed to parse question visual intent response', {
        details: { response: rawResponse.substring(0, 500) },
      });
      
      return {
        intents: [],
        reasoning: 'Failed to parse visual intent response',
        visuals_recommended: false,
        generated_at: new Date().toISOString(),
      };
    }

    // If not recommended, return early
    if (!parsed.visuals_recommended) {
      const duration = Date.now() - startTime;
      logger.debug('visual-intent', `No visuals recommended for question`, {
        duration,
        details: { reasoning: parsed.reasoning },
      });

      return {
        intents: [],
        reasoning: parsed.reasoning || 'Visuals not appropriate for this question',
        visuals_recommended: false,
        generated_at: new Date().toISOString(),
      };
    }

    // Validate and normalize intents (limit to 2 for chat)
    const intents = validateIntents(parsed.intents || []).slice(0, 2);
    
    const duration = Date.now() - startTime;
    logger.info('visual-intent', `Generated ${intents.length} visual intents for question`, {
      duration,
      details: {
        visuals_recommended: true,
        intent_count: intents.length,
      },
    });

    return {
      intents,
      reasoning: parsed.reasoning || 'Visual intents generated for question',
      visuals_recommended: intents.length > 0,
      generated_at: new Date().toISOString(),
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('visual-intent', `Failed to generate visual intents for question: ${(error as Error).message}`, {
      duration,
    });

    return {
      intents: [],
      reasoning: `Error: ${(error as Error).message}`,
      visuals_recommended: false,
      generated_at: new Date().toISOString(),
    };
  }
}

/**
 * Determine if a module would benefit from visual aids.
 * This is a quick check that can be used during path generation.
 * 
 * @param moduleTitle - Title of the module
 * @param moduleDescription - Description of the module
 * @returns boolean indicating if visuals would help
 */
export async function shouldUseVisualAids(
  moduleTitle: string,
  moduleDescription: string
): Promise<boolean> {
  const startTime = Date.now();
  
  logger.debug('visual-intent', `Checking if module would benefit from visuals: "${moduleTitle}"`);

  try {
    const client = ensureClient();
    const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;

    const prompt = `Would the following educational module benefit from illustrative diagrams or visual aids?

Module: ${moduleTitle}
Description: ${moduleDescription}

Answer with JSON only: { "uses_visual_aids": true/false, "reason": "brief explanation" }

Consider:
- Processes, workflows, or sequences → YES
- Relationships between concepts → YES
- Data or mathematical concepts → YES
- Pure definitions or abstract theory → likely NO`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const rawResponse = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(rawResponse);
    
    const duration = Date.now() - startTime;
    logger.debug('visual-intent', `Visual aids check completed`, {
      duration,
      details: { result: parsed.uses_visual_aids, reason: parsed.reason },
    });

    return parsed.uses_visual_aids === true;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.warn('visual-intent', `Failed to check visual aids: ${(error as Error).message}`, {
      duration,
    });
    
    // Default to false on error
    return false;
  }
}
