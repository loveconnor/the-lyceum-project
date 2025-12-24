import OpenAI from 'openai';

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

const stripCodeFences = (text: string): string => {
  let cleaned = text.trim();
  
  // Remove markdown code fences (json, js, or no language specified)
  cleaned = cleaned.replace(/^```(?:json|javascript|js)?\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/i, '');
  
  // Remove any leading/trailing whitespace again
  return cleaned.trim();
};

// Attempt to repair common JSON issues
const repairJson = (text: string): string => {
  let repaired = text;
  
  // Fix unescaped backslashes in LaTeX (common issue)
  // Match patterns like \frac, \int, \sum, etc. that should be \\frac, \\int, \\sum
  repaired = repaired.replace(/(?<!\\)\\([a-zA-Z]+)/g, '\\\\$1');
  
  // Fix unescaped newlines inside strings (replace literal newlines with \n)
  // This is a simplified approach - find strings and ensure newlines are escaped
  
  // Fix trailing commas before ] or }
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  return repaired;
};

const tryParseJson = <T>(text: string): T | null => {
  const cleaned = stripCodeFences(text);
  
  // First attempt: try parsing as-is
  try {
    return JSON.parse(cleaned) as T;
  } catch (firstError) {
    console.log('First parse attempt failed, trying to repair JSON...');
    
    // Second attempt: try with repairs
    try {
      const repaired = repairJson(cleaned);
      return JSON.parse(repaired) as T;
    } catch (secondError) {
      console.error('JSON parse error after repair attempt:', secondError);
      console.error('First 1000 chars:', text.substring(0, 1000));
      console.error('Last 500 chars:', text.substring(text.length - 500));
      
      // Try to find the error location
      if (secondError instanceof SyntaxError) {
        const match = secondError.message.match(/position (\d+)/);
        if (match) {
          const pos = parseInt(match[1]);
          console.error('Context around error position:', cleaned.substring(Math.max(0, pos - 100), pos + 100));
        }
      }
      return null;
    }
  }
};

// Fix literal \n strings in content (AI sometimes generates \\n which becomes literal \n after JSON parse)
const fixLiteralNewlines = (obj: unknown): unknown => {
  if (typeof obj === 'string') {
    // Replace literal \n with actual newlines
    return obj.replace(/\\n/g, '\n');
  }
  if (Array.isArray(obj)) {
    return obj.map(fixLiteralNewlines);
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = fixLiteralNewlines(value);
    }
    return result;
  }
  return obj;
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
            "question": "Clear, specific question testing understanding (wrap any math in $ like: What is $x^2 + y^2$?)",
            "options": [
              { "id": "A", "text": "Option A text (if math: $\\\\mathbf{v} = (3, 4)$)" },
              { "id": "B", "text": "Option B text (if math: $x = 3 + 4i$)" },
              { "id": "C", "text": "Option C text" },
              { "id": "D", "text": "Option D text" }
            ],
            "correct": "B",
            "explanation": "Brief explanation of why this is correct (wrap math in $ as well)"
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
              "background": "hsl(var(--primary) / 0.1)",
              "border": "1px solid hsl(var(--primary) / 0.2)",
              "borderRadius": "8px",
              "padding": "16px 24px",
              "fontSize": "14px",
              "fontWeight": 600,
              "width": 200,
              "color": "#000000"
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
            "style": { "stroke": "hsl(var(--primary) / 0.3)", "strokeWidth": 2 },
            "markerEnd": { "type": "arrowclosed", "color": "hsl(var(--primary) / 0.5)" }
          }
        ]
      }
    ]
  }
}

Guidelines:
- Use CSS variables for colors in visuals (e.g., hsl(var(--primary) / 0.1)) to ensure theme compatibility.
- For node text color, ALWAYS use pure black "#000000" to ensure maximum readability on the light-colored nodes, regardless of the user's theme.
- Create 2-4 chapters with rich content
- Each chapter should take 5-15 minutes to read
- Include 1-2 quiz questions per chapter (simple questions to check understanding)
- Include 3-5 key concepts with thorough explanations
- Include 2-4 practical exercises
- Include 4-6 assessment questions (more comprehensive)
- Use markdown formatting for better readability (headings, bold, lists, code blocks for CODE only)
- Make content specific, actionable, and pedagogically sound
- Write in an engaging, conversational but professional tone
- Include real-world examples and applications

CRITICAL MATH FORMATTING RULES (MUST FOLLOW):
- ALL mathematical expressions, formulas, equations, variables, and symbols MUST be wrapped in dollar signs
- Inline math: wrap in single $ like $x^2 + y^2 = z^2$ or $\\mathbf{v}$ or $\\alpha$
- Block math: wrap in double $$ on own line like $$\\int_0^1 f(x) dx$$
- This applies to ALL content: chapter content, quiz questions, quiz options, explanations, examples, everywhere
- Examples of what MUST be wrapped:
  * Variables: $x$, $y$, $v$, $\\alpha$, $\\beta$
  * Expressions: $x + y$, $2x - 3$, $\\frac{a}{b}$
  * Vectors: $\\mathbf{v}$, $\\vec{u}$
  * Functions: $f(x)$, $\\sin(x)$, $\\log(n)$
  * Equations: $E = mc^2$, $a^2 + b^2 = c^2$
  * Sets: $\\{1, 2, 3\\}$
- NEVER write raw LaTeX without $ delimiters (e.g., "\\mathbf{v}" is WRONG, "$\\mathbf{v}$" is CORRECT)
- NEVER use triple backtick code blocks for math - only use $ delimiters
- Remember to escape backslashes in JSON strings (use \\\\ for a single backslash in LaTeX commands)
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
  const maxRetries = 2;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retrying path outline generation (attempt ${attempt}/${maxRetries})...`);
      }

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
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed for path outline:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  throw lastError;
}

export async function generateModuleContent(
  moduleTitle: string,
  moduleDescription: string,
  pathContext: string,
  difficulty: string,
  orderIndex: number
): Promise<GeneratedModule['content']> {
  const maxRetries = 1;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retrying module generation for "${moduleTitle}" (attempt ${attempt}/${maxRetries})...`);
        // Short delay before retry when generating in parallel
        await new Promise(resolve => setTimeout(resolve, 500));
      }

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
        max_tokens: 12000,
        response_format: { type: 'json_object' },
      });

      const rawResponse = completion.choices[0]?.message?.content || '{}';
      const finishReason = completion.choices[0]?.finish_reason;
      
      console.log(`Module "${moduleTitle}" content generated (${rawResponse.length} chars, finish_reason: ${finishReason})`);
      
      // Check if response was truncated
      if (finishReason === 'length') {
        console.error('WARNING: Response was truncated due to max_tokens limit!');
      }
      
      const parsed = tryParseJson<{ content: GeneratedModule['content'] }>(rawResponse);

      if (!parsed || !parsed.content) {
        console.error('Failed to parse module content. Raw response:', rawResponse.substring(0, 500));
        throw new Error('Failed to parse AI response for module content');
      }

      // Fix any literal \n strings in the content
      return fixLiteralNewlines(parsed.content) as GeneratedModule['content'];
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed for module "${moduleTitle}":`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
  throw lastError;
}
