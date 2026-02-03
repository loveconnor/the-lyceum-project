/**
 * Module Content Synthesizer
 * Generates AI explanations strictly grounded in source registry content
 */

import OpenAI from 'openai';
import type { ExtractedContent, RenderedModuleContent, RenderedSection, RenderedConcept, Citation } from './module-grounding-types';
import { buildCitations } from './module-content-retriever';
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

const SYNTHESIS_SYSTEM_PROMPT = `You are an expert educational content synthesizer for Lyceum, a learning platform.

Your job is to create clear, structured learning content based EXCLUSIVELY on the source material provided.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. You may ONLY explain concepts explicitly present in the provided source text
2. Do NOT add any external knowledge, facts, or examples not in the source
3. If something is not explained in the source, explicitly state: "This concept is not covered in the provided source material"
4. Do NOT make up examples, analogies, or explanations that aren't directly supported by the source
5. When in doubt, be explicit that information is limited to what's in the source
6. Preserve mathematical notation and formulas exactly as they appear in the source
7. Reference figures from the source when they exist and are relevant
8. Create quiz questions based on key facts from the source (do NOT include correct answer in response)
9. Generate visual diagrams to illustrate concepts, processes, or relationships from the source

VISUAL AIDS HANDLING:
- If illustrative visual aids are provided, you may reference them descriptively
- Say "The illustrative diagram shows..." or "As illustrated in the visual..."
- NEVER say "According to the diagram..." (this implies authority)
- NEVER introduce new facts based on what appears in the visuals
- Visual aids are supplemental - the source text is ALWAYS authoritative
- If a visual doesn't match the text perfectly, prioritize the text

OUTPUT FORMAT - Respond with JSON only:
{
  "overview": "A 2-3 paragraph introduction synthesized from the source material. Use markdown formatting.",
  "learning_objectives": [
    "Objective 1 derived from source content",
    "Objective 2 derived from source content"
  ],
  "chapters": [
    {
      "id": 0,
      "title": "Chapter title from source",
      "duration": "10-15 min",
      "content": "Rich markdown READING content ONLY from source material. Include headings, bullet points, math notation if present. Do NOT include quiz questions here.",
      "quizzes": [
        {
          "question": "Question testing understanding of source content",
          "options": [
            { "id": "A", "text": "Option A - use markdown for code with single or triple backticks" },
            { "id": "B", "text": "Option B" },
            { "id": "C", "text": "Option C" },
            { "id": "D", "text": "Option D" }
          ],
          "correct": "B",
          "explanation": "Why this is correct based on the source (can also use markdown/code formatting)"
        }
      ]
    }
  ],
  "key_concepts": [
    {
      "concept": "Concept name from source",
      "explanation": "Explanation ONLY using source text",
      "example_sections": [
        {
          "type": "code" | "conceptual" | "pattern",
          "title": "Example title",
          "items": ["Example from source with detailed explanation"]
        }
      ]
    }
  ],
  "practical_exercises": [
    {
      "title": "Exercise title",
      "description": "Problem based on source material",
      "exercise_type": "short_answer" | "multiple_choice" | "code_editor",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "estimated_time": "5-15 min",
      "correct_answer": "The answer",
      "hints": ["Hint 1", "Hint 2"]
    }
  ],
  "assessment": {
    "questions": [
      {
        "question": "Assessment question",
        "type": "multiple-choice",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "B",
        "explanation": "Why this is correct"
      }
    ]
  },
  "visuals": [
    {
      "title": "Diagram title",
      "description": "What this diagram illustrates from the source",
      "nodes": [
        {
          "id": "node1",
          "position": { "x": 250, "y": 0 },
          "data": { "label": "Concept from source" },
          "type": "default",
          "style": {
            "background": "hsl(var(--primary) / 0.1)",
            "border": "1px solid hsl(var(--primary) / 0.2)",
            "borderRadius": "8px",
            "padding": "16px 24px",
            "width": 200,
            "color": "#000000"
          }
        }
      ],
      "edges": [
        {
          "id": "edge1",
          "source": "node1",
          "target": "node2",
          "label": "relationship",
          "type": "smoothstep",
          "animated": false,
          "style": { "stroke": "hsl(var(--primary) / 0.3)", "strokeWidth": 2 },
          "markerEnd": { "type": "arrowclosed", "color": "hsl(var(--primary) / 0.5)" }
        }
      ]
    }
  ],
  "figures_referenced": ["figure_index_0", "figure_index_1"]
}

If the source material is insufficient to create meaningful content:
{
  "overview": "The provided source material does not contain sufficient information to fully explain this topic.",
  "learning_objectives": [],
  "chapters": [],
  "key_concepts": [],
  "practical_exercises": [],
  "assessment": { "questions": [] },
  "visuals": [],
  "figures_referenced": [],
  "content_unavailable_reason": "Explanation of what's missing"
}`;

/**
 * Format extracted content for the AI prompt
 */
function formatSourceContentForPrompt(contents: ExtractedContent[]): string {
  const parts: string[] = [];
  
  contents.forEach((content, index) => {
    parts.push(`--- SOURCE ${index + 1}: ${content.title} ---`);
    parts.push(`Section Path: ${content.section_path.join(' > ')}`);
    parts.push(`Node ID: ${content.node_id}`);
    parts.push(`URL: ${content.url}`);
    parts.push('');
    parts.push('Content:');
    parts.push(content.content_text);
    
    if (content.headings.length > 0) {
      parts.push('');
      parts.push('Headings in this section:');
      content.headings.forEach(h => parts.push(`  - ${h}`));
    }
    
    if (content.figures.length > 0) {
      parts.push('');
      parts.push('Figures available:');
      content.figures.forEach((f, fi) => {
        parts.push(`  [Figure ${index}_${fi}] ${f.caption || f.alt || 'No caption'}`);
        parts.push(`    URL: ${f.url}`);
      });
    }
    
    parts.push('');
    parts.push('---');
    parts.push('');
  });
  
  return parts.join('\n');
}

/**
 * Synthesize module content from extracted source material
 */
export async function synthesizeModuleContent(
  moduleTitle: string,
  moduleDescription: string,
  extractedContents: ExtractedContent[],
  difficulty: string
): Promise<RenderedModuleContent> {
  const startTime = Date.now();
  
  logger.info('content-synthesizer', `Synthesizing content for module: "${moduleTitle}"`, {
    details: { 
      sourcesCount: extractedContents.length,
      difficulty,
    },
  });

  // Handle case where no content was extracted
  if (extractedContents.length === 0) {
    logger.warn('content-synthesizer', 'No extracted content provided for synthesis');
    return {
      overview: 'No source content is available for this module. The requested topic may not be covered in the selected source material.',
      learning_objectives: [],
      sections: [],
      key_concepts: [],
      citations: [],
      figures: [],
      rendered_at: new Date().toISOString(),
      content_unavailable: true,
      unavailable_reason: 'No source content could be retrieved for the selected registry nodes',
    };
  }

  // Build source material for AI
  const sourceText = formatSourceContentForPrompt(extractedContents);
  
  // Collect all figures
  const allFigures = extractedContents.flatMap(c => c.figures);
  
  // Build citations
  const citations = buildCitations(extractedContents);

  const userPrompt = `Create educational content for this learning module:

Module Title: ${moduleTitle}
Module Description: ${moduleDescription}
Difficulty Level: ${difficulty}

The content MUST be derived ONLY from the following source material:

${sourceText}

Remember: ONLY use information present in the source material above. Do NOT add external knowledge.`;

  const client = ensureClient();
  const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYNTHESIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4, // Lower temperature for more faithful reproduction
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    });

    const rawResponse = completion.choices[0]?.message?.content || '{}';
    
    let parsed: {
      overview: string;
      learning_objectives: string[];
      chapters?: { id: number; title: string; duration: string; content: string; quizzes?: any[] }[];
      sections?: { title: string; content: string; source_node_id?: string }[];
      key_concepts: { concept: string; explanation: string; example_sections?: any[]; source_node_id?: string }[];
      practical_exercises?: any[];
      assessment?: { questions: any[] };
      visuals?: any[];
      figures_referenced?: string[];
      content_unavailable_reason?: string;
    };

    try {
      parsed = JSON.parse(rawResponse);
    } catch (parseError) {
      logger.error('content-synthesizer', 'Failed to parse AI response', {
        details: { response: rawResponse.substring(0, 500) },
      });
      return {
        overview: 'Content synthesis failed. Please try again.',
        learning_objectives: [],
        sections: [],
        key_concepts: [],
        citations,
        figures: allFigures,
        rendered_at: new Date().toISOString(),
        content_unavailable: true,
        unavailable_reason: 'AI synthesis produced invalid response',
      };
    }

    const duration = Date.now() - startTime;
    logger.info('content-synthesizer', `Content synthesis complete for "${moduleTitle}"`, {
      duration,
      details: {
        sectionsCount: parsed.sections?.length || 0,
        conceptsCount: parsed.key_concepts?.length || 0,
        hasUnavailableReason: !!parsed.content_unavailable_reason,
      },
    });

    // Filter figures to only those referenced
    let referencedFigures = allFigures;
    if (parsed.figures_referenced && parsed.figures_referenced.length > 0) {
      // Parse figure references like "0_1" (source index _ figure index)
      const refSet = new Set(parsed.figures_referenced);
      referencedFigures = [];
      extractedContents.forEach((content, sourceIdx) => {
        content.figures.forEach((fig, figIdx) => {
          if (refSet.has(`${sourceIdx}_${figIdx}`)) {
            referencedFigures.push(fig);
          }
        });
      });
    }

    // Use chapters if provided, otherwise convert sections to chapters
    const chapters = parsed.chapters || (parsed.sections || []).map((s, idx) => ({
      id: idx,
      title: s.title,
      duration: '10-15 min',
      content: s.content,
      quizzes: []
    }));

    return {
      overview: parsed.overview || '',
      learning_objectives: parsed.learning_objectives || [],
      chapters,
      sections: (parsed.sections || []).map(s => ({
        title: s.title,
        content: s.content,
        source_node_id: s.source_node_id,
      })),
      key_concepts: (parsed.key_concepts || []).map(c => ({
        concept: c.concept,
        explanation: c.explanation,
        example_sections: c.example_sections,
        source_node_id: c.source_node_id,
      })),
      practical_exercises: parsed.practical_exercises || [],
      assessment: parsed.assessment || { questions: [] },
      visuals: parsed.visuals || [],
      citations,
      figures: referencedFigures,
      rendered_at: new Date().toISOString(),
      content_unavailable: !!parsed.content_unavailable_reason,
      unavailable_reason: parsed.content_unavailable_reason,
    };

  } catch (error) {
    logger.error('content-synthesizer', `AI synthesis failed: ${(error as Error).message}`, {
      details: { moduleTitle },
    });

    return {
      overview: 'Content synthesis failed due to an error. Please try again later.',
      learning_objectives: [],
      sections: [],
      key_concepts: [],
      citations,
      figures: allFigures,
      rendered_at: new Date().toISOString(),
      content_unavailable: true,
      unavailable_reason: `Synthesis error: ${(error as Error).message}`,
    };
  }
}

/**
 * Render module content on-demand
 * Main entry point for the rendering flow
 */
export async function renderModuleOnDemand(
  moduleTitle: string,
  moduleDescription: string,
  extractedContents: ExtractedContent[],
  difficulty: string
): Promise<RenderedModuleContent> {
  return synthesizeModuleContent(
    moduleTitle,
    moduleDescription,
    extractedContents,
    difficulty
  );
}
