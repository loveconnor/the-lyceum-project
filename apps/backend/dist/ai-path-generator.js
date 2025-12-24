"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePathOutline = generatePathOutline;
exports.generateModuleContent = generateModuleContent;
const openai_1 = __importDefault(require("openai"));
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
const stripCodeFences = (text) => {
    let cleaned = text.trim();
    // Remove markdown code fences (json, js, or no language specified)
    cleaned = cleaned.replace(/^```(?:json|javascript|js)?\s*/i, '');
    cleaned = cleaned.replace(/```\s*$/i, '');
    // Remove any leading/trailing whitespace again
    return cleaned.trim();
};
// Attempt to repair common JSON issues
const repairJson = (text) => {
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
const tryParseJson = (text) => {
    const cleaned = stripCodeFences(text);
    // First attempt: try parsing as-is
    try {
        return JSON.parse(cleaned);
    }
    catch (firstError) {
        console.log('First parse attempt failed, trying to repair JSON...');
        // Second attempt: try with repairs
        try {
            const repaired = repairJson(cleaned);
            return JSON.parse(repaired);
        }
        catch (secondError) {
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
const fixLiteralNewlines = (obj) => {
    if (typeof obj === 'string') {
        // Replace literal \n with actual newlines
        return obj.replace(/\\n/g, '\n');
    }
    if (Array.isArray(obj)) {
        return obj.map(fixLiteralNewlines);
    }
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = fixLiteralNewlines(value);
        }
        return result;
    }
    return obj;
};
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
- IMPORTANT: For mathematical content, use LaTeX syntax with dollar sign delimiters:
  - Inline math: wrap in single dollar signs like $x^2 + y^2 = z^2$
  - Block math: wrap in double dollar signs on own line like $$\\int_0^1 f(x) dx$$
  - NEVER use triple backtick code blocks for math - only use $ delimiters
  - Remember to escape backslashes in JSON strings (use \\\\ for a single backslash)
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
async function generatePathOutline(request) {
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
    const parsed = tryParseJson(rawResponse);
    if (!parsed || !parsed.path || !parsed.modules) {
        console.error('Failed to parse path outline. Raw response:', rawResponse);
        throw new Error('Failed to parse AI response for path outline');
    }
    return {
        ...parsed.path,
        modules: parsed.modules
    };
}
async function generateModuleContent(moduleTitle, moduleDescription, pathContext, difficulty, orderIndex) {
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
    const parsed = tryParseJson(rawResponse);
    if (!parsed || !parsed.content) {
        console.error('Failed to parse module content. Raw response:', rawResponse.substring(0, 500));
        throw new Error('Failed to parse AI response for module content');
    }
    // Fix any literal \n strings in the content
    return fixLiteralNewlines(parsed.content);
}
