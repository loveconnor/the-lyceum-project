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
      examples?: string[]; // Legacy support - will be deprecated
      example_sections?: Array<{
        type: 'code' | 'conceptual' | 'pattern' | 'antipattern' | 'applied' | 'real-world';
        title: string;
        items: string[];
      }>;
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
        "content": "READING CONTENT ONLY. Rich markdown with headings, bullet points, code examples if relevant, and clear explanations. 3-5 paragraphs of EDUCATIONAL READING. Do NOT include any quiz questions, 'Quick Check', 'Practice Activity', 'Quiz', or any interactive elements here - those go ONLY in the quizzes array below.",
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
        "example_sections": [
          {
            "type": "pattern",
            "title": "Step-by-Step Solution",
            "items": [
              "**Problem:** Find $\\\\lim_{x \\\\to 2} \\\\frac{x^2-4}{x-2}$\\n\\n**Step 1:** Factor the numerator\\n$x^2 - 4 = (x+2)(x-2)$\\nWe factor because we can cancel the common term with the denominator.\\n\\n**Step 2:** Simplify\\n$\\\\frac{(x+2)(x-2)}{x-2} = x+2$ (for $x \\\\neq 2$)\\nWe cancel since we're taking the limit, not evaluating at $x=2$.\\n\\n**Step 3:** Evaluate\\n$\\\\lim_{x \\\\to 2} (x+2) = 4$\\n\\n**Answer:** The limit is 4.",
              "Second example with similar detailed step-by-step format"
            ]
          }
        ]
      }
    ],
    "practical_exercises": [
      {
        "title": "Short descriptive title for the problem",
        "description": "The actual problem to solve (e.g., 'Solve: $2x + 5 = 13$' or 'Fill in the blank: 4, 5, _, 7, 8')",
        "exercise_type": "short_answer" | "multiple_choice" | "multi_step",
        "difficulty": "beginner" | "intermediate" | "advanced",
        "estimated_time": "5-15 min",
        "correct_answer": "The correct answer (e.g., '4' or 'x = 7')",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "hints": [
          "First hint - a small nudge in the right direction",
          "Second hint - more specific guidance"
        ],
        "worked_example": "Complete step-by-step solution with explanation",
        "common_mistakes": [
          "Common mistake 1 and why it's wrong"
        ]
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
- Include 2-4 practical exercises (MUST be actual problems to solve, see below)
- Include 4-6 assessment questions (more comprehensive)
- Use markdown formatting for better readability (headings, bold, lists, code blocks for CODE only)
- Make content specific, actionable, and pedagogically sound
- Write in an engaging, conversational but professional tone

CHAPTER CONTENT SEPARATION (CRITICAL):
======================================
The chapter "content" field is for READING ONLY. The UI renders this as readable text.
Quiz questions are handled by a SEPARATE quiz component that reads from the "quizzes" array.

✗ DO NOT put these in the "content" field:
  - "Quiz", "Quick Check", "Practice Activity", "Check Your Understanding"
  - Any questions with answer options (A, B, C, D)
  - Any interactive exercises or fill-in-the-blank prompts
  - Numbered quiz questions (1., 2., 3.)

✓ The "content" field should ONLY contain:
  - Educational explanations and reading material
  - Examples that illustrate concepts
  - Definitions and key points
  - Diagrams described in text (actual diagrams go in visuals)

✓ All questions go in the "quizzes" array as structured objects.

PRACTICAL EXERCISES REQUIREMENTS (CRITICAL):
===============================================
Exercises MUST be actual problems with correct answers that can be verified.

EXERCISE TYPES - Choose the right type for each problem:

1. "short_answer" - Simple problems with a single answer
   Examples:
   - "Fill in the blank: 4, 5, _, 7, 8" → correct_answer: "6"
   - "What is 7 × 8?" → correct_answer: "56"
   - "Solve: $2x = 10$" → correct_answer: "5" or "x = 5"
   - "What is the GCD of 12 and 18?" → correct_answer: "6"
   Use when: Single number, single word, or simple expression answer

2. "multiple_choice" - Select from options
   Examples:
   - "Which is prime: 9, 11, 15, 21?" → options: ["9", "11", "15", "21"], correct_answer: "11"
   - "What is $\\sqrt{64}$?" → options: ["6", "7", "8", "9"], correct_answer: "8"
   Use when: Testing recognition, or when there are natural distractor options
   MUST include "options" array with 3-4 choices

3. "multi_step" - Complex problems requiring multiple steps
   Examples:
   - "Factor completely: $x^2 + 7x + 12$" → correct_answer: "(x + 3)(x + 4)"
   - "Find the derivative of $f(x) = 3x^4 - 2x^2 + 5$"
   Use when: Derivations, proofs, or problems requiring work shown
   Include detailed worked_example

For ALL exercise types, you MUST include:
- title: Short descriptive name
- description: The ACTUAL PROBLEM with specific numbers/expressions
- exercise_type: One of "short_answer", "multiple_choice", or "multi_step"
- correct_answer: The exact correct answer for validation
- hints: 1-2 hints that guide without giving the answer
- worked_example: Step-by-step solution

✗ WRONG exercise description examples (DO NOT DO THIS):
  - "Students will practice solving equations" (no specific problem)
  - "Using manipulatives, learners will explore..." (activity, not problem)
  - Missing correct_answer field

ADAPTIVE EXAMPLES STRATEGY (CRITICAL):
- Examples should be adaptive and intentional based on what best helps learners understand each specific concept
- Choose example types that genuinely add clarity—do NOT force real-world examples on every concept
- Each concept should have 1-3 example sections (not all types are needed for every concept)
- Only include example sections that meaningfully contribute to understanding

Example Type Selection Guide:
1. "code" type - Use ONLY for: Programming/software development concepts, syntax, APIs, data structures, algorithms
   - Title examples: "Code Example", "Implementation", "Syntax Example"
   - Show concise, working code snippets with brief explanation
   - Prioritize for: Functions, classes, language features, technical implementations
   - DO NOT USE for: Math, physics, chemistry, or other subjects where code is just a tool (not the subject itself)

2. "conceptual" type - Use for: Abstract concepts, theories, mental models, foundational ideas
   - Title examples: "Conceptual Example", "Mental Model", "Core Idea"
   - Use analogies, explanations, or thought experiments
   - Prioritize for: Theoretical concepts, philosophical ideas, abstract principles

3. "pattern" type - Use for: Best practices, design patterns, common approaches
   - Title examples: "Common Pattern", "Best Practice", "Typical Approach", "Step-by-Step Solution"
   - Show established, recommended ways to solve problems
   - For MATH: Use this for worked problems with FULL step-by-step solutions
   - Prioritize for: Intermediate/advanced topics, architectural concepts, mathematical problem-solving

4. "antipattern" type - Use for: Common mistakes, pitfalls, what to avoid
   - Title examples: "What Not to Do", "Common Mistake", "Pitfall to Avoid"
   - Highlight incorrect approaches with explanation of why they fail
   - Prioritize for: Topics with common misconceptions or frequent errors

5. "applied" type - Use for: Practical application, use cases, problem-solving
   - Title examples: "Applied Example", "Use Case", "Practical Application"
   - Show how concept solves specific problems
   - Prioritize for: Skills, techniques, methodologies

6. "real-world" type - Use ONLY when real-world context genuinely adds clarity
   - Title examples: "Real-World Application", "Industry Example", "Production Use Case"
   - Connect to actual systems, companies, or scenarios
   - Use sparingly—only when concrete real-world context enhances understanding

Selection Strategy by Topic Type:
- Foundational/Abstract concepts → "conceptual" + optionally "applied"
- Programming syntax/technical topics → "code" (primary) + optionally "pattern" or "antipattern"
- Intermediate concepts → "pattern" + "antipattern" + optionally "applied"
- Advanced topics → "pattern" + optionally "applied"
- Practical skills → "applied" + optionally "real-world"
- Theoretical concepts → "conceptual" + optionally "applied"
- Math topics → "pattern" (for step-by-step solutions) + "conceptual" (for theory/intuition)
- Science topics → "conceptual" + "applied" (show experiments, phenomena, calculations—NOT code)
- Design/Architecture → "pattern" + "antipattern" + optionally "real-world"

CRITICAL RULES:
- Do NOT create empty sections
- Do NOT force real-world examples on every concept
- Do NOT use "code" type for math, science, or non-programming topics (use "conceptual", "pattern", or "applied" instead)
- Only use "code" type when the learning goal is programming/software development itself
- Prioritize clarity and learning value over metaphor

MATH-SPECIFIC REQUIREMENTS (ABSOLUTELY CRITICAL - MUST FOLLOW):
==================================================================
For ANY mathematics topic (calculus, algebra, linear algebra, etc.):

1. STRUCTURE REQUIREMENT:
   - Use "pattern" type with title "Step-by-Step Solution" or "Worked Example"
   - Each item in the items array is ONE COMPLETE worked problem with full walkthrough
   
2. CONTENT REQUIREMENT - Each item MUST contain ALL of these:
   ✓ **Problem:** statement with proper LaTeX
   ✓ **Step 1:** First step of solution with work shown
      - Show the mathematical work
      - Explain WHY we do this step
   ✓ **Step 2:** Second step with work shown
      - Show the mathematical work  
      - Explain the reasoning
   ✓ **Step 3:** Continue until problem is solved
   ✓ **Answer:** Final answer with interpretation
   
3. FORMAT REQUIREMENTS:
   - Use \\n\\n for line breaks between sections (newlines in JSON string)
   - Use $...$ for inline math, $$...$$ for display math
   - Remember to escape backslashes: \\\\ for LaTeX commands in JSON
   - Each step needs: operation shown + reasoning explained
   
4. EXAMPLE OF CORRECT FORMAT (this is what each item should look like):
   "**Problem:** Find $\\\\lim_{x \\\\to 2} \\\\frac{x^2-4}{x-2}$\\n\\n**Step 1:** Factor the numerator\\n$x^2 - 4 = (x+2)(x-2)$\\nWe factor because we can cancel the common term with the denominator.\\n\\n**Step 2:** Simplify the expression\\n$\\\\frac{(x+2)(x-2)}{x-2} = x+2$ (for $x \\\\neq 2$)\\nWe cancel the $(x-2)$ terms since we're taking the limit as $x$ approaches 2, not evaluating at 2.\\n\\n**Step 3:** Evaluate the limit\\n$\\\\lim_{x \\\\to 2} (x+2) = 2+2 = 4$\\nNow the limit is straightforward to evaluate.\\n\\n**Answer:** The limit is 4."

5. WHAT NOT TO DO (INCORRECT):
   ✗ "Approaching $x=2$ for $f(x) = \\frac{x^2-4}{x-2}$ simplifies to $f(x) = x+2$, so the limit is 4."
   ✗ Brief explanations without step-by-step work
   ✗ Just showing the answer without the process
   
6. GOAL: TEACH the problem-solving PROCESS, not just show answers
   - Students need to see HOW to solve similar problems
   - Every step needs both the math AND the reasoning
   - Think like a tutor explaining to a student

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
