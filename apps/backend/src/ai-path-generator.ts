import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

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

const stripCodeFences = (text: string): string => {
  let cleaned = text.trim();
  
  // Remove markdown code fences (json, js, or no language specified)
  cleaned = cleaned.replace(/^```(?:json|javascript|js)?\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/i, '');
  
  // Remove any leading/trailing whitespace again
  return cleaned.trim();
};

const tryParseJson = <T>(text: string): T | null => {
  try {
    const cleaned = stripCodeFences(text);
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    console.error('Text that failed to parse:', text.substring(0, 500));
    return null;
  }
};

export interface GeneratePathRequest {
  title: string;
  description?: string;
  difficulty: 'intro' | 'intermediate' | 'advanced';
  estimatedDuration?: string;
  topics?: string[];
}

export interface PathOutline {
  title: string;
  description: string;
  difficulty: string;
  estimated_duration: number;
  topics: string[];
  modules: Array<{
    title: string;
    description: string;
    order_index: number;
  }>;
}

export interface GeneratedModule {
  title: string;
  description: string;
  order_index: number;
  content: {
    overview: string;
    learning_objectives: string[];
    chapters?: Array<{
      title: string;
      duration: string;
      content: string;
      quizzes: Array<{
        question: string;
        options: Array<{
          id: string;
          text: string;
        }>;
        correct: string;
        explanation?: string;
      }>;
    }>;
    key_concepts: Array<{
      concept: string;
      explanation: string;
      examples: string[];
    }>;
    practical_exercises: Array<{
      title: string;
      description: string;
      difficulty: string;
      estimated_time?: string;
    }>;
    resources: Array<{
      type: 'reading' | 'video' | 'interactive';
      title: string;
      description: string;
    }>;
    assessment: {
      questions: Array<{
        question: string;
        type: 'multiple-choice' | 'short-answer' | 'practical';
        options?: string[];
        correct_answer?: string;
        explanation?: string;
      }>;
    };
    visuals?: Array<{
      title: string;
      description?: string;
      nodes: Array<{
        id: string;
        position: { x: number; y: number };
        data: { label: string };
        type?: 'default' | 'input' | 'output';
        style?: {
          background?: string;
          border?: string;
          borderRadius?: string;
          padding?: string;
          fontSize?: string;
          fontWeight?: number;
          width?: number;
          color?: string;
        };
      }>;
      edges: Array<{
        id: string;
        source: string;
        target: string;
        label?: string;
        type?: 'default' | 'straight' | 'step' | 'smoothstep' | 'bezier';
        animated?: boolean;
        style?: {
          stroke?: string;
          strokeWidth?: number;
        };
        labelStyle?: {
          fontSize?: number;
          fontWeight?: number;
        };
        markerEnd?: {
          type: 'arrow' | 'arrowclosed';
          color?: string;
        };
      }>;
    }>;
  };
}

export interface GeneratedPathResponse {
  path: {
    title: string;
    description: string;
    difficulty: string;
    estimated_duration: number;
    topics: string[];
  };
  modules: GeneratedModule[];
  raw: string;
}

const PATH_OUTLINE_PROMPT = `You are an expert curriculum designer for Lyceum, an educational platform. Your job is to create a high-level outline for a learning path.

Given a learning path title and description, generate:
1. Path metadata (refined title, description, difficulty, duration, topics)
2. A sequence of module titles and descriptions that progressively build knowledge

Respond with JSON only in this structure:
{
  "path": {
    "title": "Refined path title",
    "description": "Comprehensive 2-3 sentence description",
    "difficulty": "beginner" | "intermediate" | "advanced",
    "estimated_duration": number (total hours for the entire path),
    "topics": ["topic1", "topic2", ...]
  },
  "modules": [
    {
      "title": "Module title",
      "description": "1-2 sentence module overview",
      "order_index": 0
    }
  ]
}

Guidelines:
- Create 4-6 modules that build progressively
- Each module should take 2-4 hours to complete
- Module titles should be clear and descriptive
- Descriptions should explain what the learner will achieve
- Ensure proper scaffolding between modules`;

const MODULE_CONTENT_PROMPT = `You are an expert curriculum designer for Lyceum. Generate detailed content for a single learning module.

Respond with JSON only in this structure:
{
  "content": {
    "overview": "Detailed 2-4 paragraph markdown overview explaining what this module covers, why it matters, and how it fits into the larger learning path. Use **bold** for emphasis and > for important callouts.",
    "learning_objectives": [
      "Specific, measurable objective 1",
      "Specific, measurable objective 2",
      "Specific, measurable objective 3"
    ],
    "chapters": [
      {
        "id": 0,
        "title": "Chapter title",
        "duration": "5-10 min",
        "content": "Rich markdown content with headings (##, ###), bullet points, code examples if relevant, and clear explanations. Make this substantive and educational - 3-5 paragraphs.",
        "quizzes": [
          {
            "question": "Clear, specific question testing understanding",
            "options": [
              { "id": "A", "text": "Option A text" },
              { "id": "B", "text": "Option B text" },
              { "id": "C", "text": "Option C text" },
              { "id": "D", "text": "Option D text" }
            ],
            "correct": "B",
            "explanation": "Brief explanation of why this is correct"
          }
        ]
      }
    ],
    "key_concepts": [
      {
        "concept": "Concept name",
        "explanation": "Clear 3-4 sentence explanation with depth",
        "examples": ["Concrete example 1", "Concrete example 2", "Real-world example 3"]
      }
    ],
    "practical_exercises": [
      {
        "title": "Exercise title",
        "description": "Detailed description of what the learner will do and what they'll learn",
        "difficulty": "beginner" | "intermediate" | "advanced",
        "estimated_time": "15-30 min"
      }
    ],
    "resources": [
      {
        "type": "reading" | "video" | "interactive",
        "title": "Resource title",
        "description": "What this resource covers and why it's valuable"
      }
    ],
    "assessment": {
      "questions": [
        {
          "question": "Thoughtful assessment question",
          "type": "multiple-choice",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_answer": "Option B",
          "explanation": "Why this answer is correct"
        }
      ]
    },
    "visuals": [
      {
        "title": "Descriptive title for the diagram",
        "description": "Brief explanation of what this diagram shows",
        "nodes": [
          {
            "id": "unique-node-id",
            "position": { "x": 250, "y": 0 },
            "data": { "label": "Node text" },
            "type": "default",
            "style": {
              "background": "#e0f2fe",
              "border": "2px solid #0284c7",
              "borderRadius": "8px",
              "padding": "16px 24px",
              "fontSize": "14px",
              "fontWeight": 600,
              "width": 200
            }
          }
        ],
        "edges": [
          {
            "id": "edge-1",
            "source": "node1",
            "target": "node2",
            "label": "connects to",
            "type": "smoothstep",
            "animated": false,
            "style": { "stroke": "#0284c7", "strokeWidth": 2 },
            "markerEnd": { "type": "arrowclosed", "color": "#0284c7" }
          }
        ]
      }
    ]
  }
}

Guidelines:
- Create 2-4 chapters with rich content
- Each chapter should take 5-15 minutes to read
- Include 1-2 quiz questions per chapter (simple questions to check understanding)
- Include 3-5 key concepts with thorough explanations
- Include 2-4 practical exercises
- Include 4-6 assessment questions (more comprehensive)
- Use markdown formatting for better readability (headings, bold, lists, code blocks)
- Make content specific, actionable, and pedagogically sound
- Write in an engaging, conversational but professional tone
- Include real-world examples and applications
- Generate 2-4 visual diagrams using ReactFlow format:
  - Position nodes using x,y coordinates (canvas is roughly 800x600)
  - For vertical flows: increment y by 100-120 for each row
  - For horizontal flows: increment x by 250-300 for each column
  - Center the diagram around x=300-400
  - Use type "smoothstep" for most edges (creates nice curved connectors)
  - Use type "straight" for direct relationships
  - Use type "step" for hierarchical diagrams
  - Style nodes with colors: primary=#0284c7, success=#16a34a, warning=#ea580c, info=#6366f1
  - Use backgrounds like #e0f2fe (light blue), #dcfce7 (light green), #fef3c7 (light yellow)
  - Set animated: true on edges to highlight important flows
  - Always include markerEnd with type "arrowclosed" for directional edges
  - Give each node a width of 150-250 based on label length`;

export async function generatePathOutline(
  request: GeneratePathRequest
): Promise<PathOutline> {
  const client = ensureClient();
  const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;

  const titleInstruction = request.title 
    ? `Title: ${request.title}`
    : `Generate an appropriate title based on the learning goals described below.`;

  const userPrompt = `Generate a comprehensive learning path outline for:

${titleInstruction}
Description: ${request.description || 'Create a structured learning path'}
Difficulty: ${request.difficulty}
${request.topics && request.topics.length > 0 ? `Focus Topics: ${request.topics.join(', ')}` : ''}

Note: Determine an appropriate total duration (in hours) based on the content scope and difficulty level.
Create module titles and descriptions that build on each other progressively.`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: PATH_OUTLINE_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const rawResponse = completion.choices[0]?.message?.content || '{}';
  
  console.log('Path outline response:', rawResponse.substring(0, 500));
  
  const parsed = tryParseJson<{ path: any; modules: any[] }>(rawResponse);

  if (!parsed || !parsed.path || !parsed.modules) {
    console.error('Failed to parse path outline. Raw response:', rawResponse);
    throw new Error('Failed to parse AI response for path outline');
  }

  return {
    ...parsed.path,
    modules: parsed.modules
  };
}

export async function generateModuleContent(
  moduleTitle: string,
  moduleDescription: string,
  pathContext: string,
  difficulty: string,
  orderIndex: number
): Promise<GeneratedModule['content']> {
  const client = ensureClient();
  const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;

  const userPrompt = `Generate detailed content for this learning module:

Module Title: ${moduleTitle}
Module Description: ${moduleDescription}
Learning Path Context: ${pathContext}
Difficulty Level: ${difficulty}
Module Position: ${orderIndex + 1}

Create comprehensive learning content with chapters, quizzes, concepts, exercises, and assessments.`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: MODULE_CONTENT_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });

  const rawResponse = completion.choices[0]?.message?.content || '{}';
  
  console.log(`Module "${moduleTitle}" content generated (${rawResponse.length} chars)`);
  
  const parsed = tryParseJson<{ content: GeneratedModule['content'] }>(rawResponse);

  if (!parsed || !parsed.content) {
    console.error('Failed to parse module content. Raw response:', rawResponse.substring(0, 500));
    throw new Error('Failed to parse AI response for module content');
  }

  return parsed.content;
}
