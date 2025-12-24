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
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
};

const tryParseJson = <T>(text: string): T | null => {
  try {
    return JSON.parse(stripCodeFences(text)) as T;
  } catch {
    return null;
  }
};

export interface GenerateLabRequest {
  learningGoal: string;
  context?: string;
  userProfile?: {
    level?: string;
    interests?: string[];
    completedTopics?: string[];
  };
}

export interface GeneratedLabResponse {
  title: string;
  description: string;
  template_type: 'analyze' | 'build' | 'derive' | 'explain' | 'explore' | 'revise';
  template_data: any;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number;
  topics: string[];
  raw: string;
}

const TEMPLATE_SELECTION_PROMPT = `You are a lab template selector for Lyceum, an educational platform. Your job is to choose the best template type for a learning goal.

Available templates:
1. **analyze** - For data analysis, visualization, statistics, pattern recognition
2. **build** - For hands-on coding practice, learning syntax, writing functions, implementing algorithms, practicing programming concepts. Use when someone wants to "learn how to code/write/implement" something.
3. **derive** - For mathematical derivations, proofs, symbolic manipulation, step-by-step problem solving, and theoretical reasoning
4. **explain** - For understanding and analyzing EXISTING code that's already written, code review, explaining how specific code works
5. **explore** - For simulations, experiments, parameter exploration, interactive learning
6. **revise** - For writing improvement, documentation, essays, technical writing

Key distinction: Use "build" when the learner wants to WRITE code to learn (e.g., "learn how to write X", "practice coding Y"). Use "explain" only when analyzing EXISTING code.

Based on the learning goal, respond with JSON only:
{
  "template_type": "analyze" | "build" | "derive" | "explain" | "explore" | "revise",
  "reasoning": "Brief explanation of why this template fits"
}`;

const TEMPLATE_GENERATORS: Record<string, string> = {
  analyze: `Generate a data analysis lab with this JSON structure:
{
  "labTitle": string,
  "description": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimated_duration": number (in minutes),
  "topics": string[],
  "data": {
    "question": "Research question to answer",
    "dataset": {
      "name": "Dataset name",
      "description": "What the data represents",
      "source": "Data source",
      "columns": ["column1", "column2", ...],
      "rows": [
        {"column1": value, "column2": value, ...},
        ...
      ]
    },
    "steps": [
      {
        "id": "step1",
        "title": "Step title",
        "description": "What to do",
        "hints": ["hint1", "hint2"]
      }
    ]
  }
}
Include 5-10 realistic data rows and 4-5 analysis steps.`,

  build: `Generate a coding challenge lab with this JSON structure:
{
  "labTitle": string,
  "description": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimated_duration": number (in minutes),
  "topics": string[],
  "data": {
    "problemStatement": "Detailed description of the coding challenge (use LaTeX for math: $x^2$)",
    "initialCode": "// Starting code template with function signature and comments",
    "language": "javascript" | "typescript" | "python" | "java" | "cpp",
    "testCases": [
      {
        "id": "test1",
        "input": "test input",
        "expectedOutput": "expected output",
        "description": "What this test checks",
        "stepId": "implement-solution" (optional - associates test with a specific step)
      }
    ],
    "steps": [
      {
        "id": "unique-id",
        "title": "Step title",
        "widgets": [
          {
            "type": "text-input",
            "config": {
              "label": "Label for the input",
              "placeholder": "Placeholder text",
              "description": "Optional guidance",
              "showPreview": false
            }
          },
          {
            "type": "multiple-choice",
            "config": {
              "label": "Question text",
              "choices": [
                {"id": "c1", "name": "Option 1"},
                {"id": "c2", "name": "Option 2"}
              ]
            }
          },
          {
            "type": "code-editor",
            "config": {
              "label": "Implementation",
              "description": "Write your code here"
            }
          }
        ]
      }
    ]
  }
}
Create 4-6 structured steps for the coding process. Each step should use appropriate widgets to guide the learner.

Example step sequence:
1. Understand the problem: Use text-input or multiple-choice to check understanding of requirements.
2. Plan your approach: Use text-input for pseudocode or algorithm design.
3. Implement solution: Use code-editor widget.
4. Test and debug: Use code-editor widget and provide guidance on debugging.
5. Analyze complexity: Use multiple-choice or text-input to discuss time/space complexity.

WIDGET CONFIGURATION DETAILS:
**text-input**: 
  - label: Question or instruction (can use LaTeX)
  - description: Helper text (can use LaTeX, optional)
  - placeholder: Example text in PLAIN ENGLISH ONLY (no LaTeX)
  - showPreview: true (for math) or false (for normal text/pseudocode)
  - mathMode: true (for multi-line math equations) or false (default)

**multiple-choice**:
  - label: Question text (can use LaTeX)
  - choices: Array of {id, name, formula (optional)}
  - multiSelect: true/false
  - showExplanation: true/false

Include 3-5 test cases with clear descriptions.
Provide realistic starter code (5-15 lines) with function signature and helpful comments.`,

  derive: `Generate a step-by-step problem-solving lab (for math derivations, proofs, symbolic manipulation, or step-by-step reasoning) with this JSON structure:
{
  "labTitle": string,
  "description": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimated_duration": number (in minutes),
  "topics": string[],
  "data": {
    "problemStatement": "What to derive (use LaTeX: $x^2$, $$\\\\frac{d}{dx}$$)",
    "givens": ["Given equation 1", "Given equation 2"],
    "goal": "Target equation or result",
    "availableRules": [
      {"id": "rule1", "name": "Rule name", "formula": "$latex$", "description": "When to use"}
    ],
    "steps": [
      {
        "id": "identify-parts",
        "title": "Identify $u$ and $dv$",
        "widgets": [
          {
            "type": "multiple-choice",
            "config": {
              "label": "Select which expression should be $u$ (the part to differentiate)",
              "description": "Choose the expression that becomes simpler when differentiated",
              "choices": [
                {"id": "choice1", "name": "Option 1", "formula": "$x$"},
                {"id": "choice2", "name": "Option 2", "formula": "$e^x$"}
              ],
              "multiSelect": false,
              "showExplanation": true,
              "explanationLabel": "Explain your choice",
              "explanationPlaceholder": "Why did you choose this as u?"
            }
          }
        ]
      },
      {
        "id": "compute",
        "title": "Compute $du$ and $v$",
        "widgets": [
          {
            "type": "derivation-steps",
            "config": {
              "showInstructions": true
            }
          }
        ]
      },
      {
        "id": "apply-formula",
        "title": "Apply Integration by Parts",
        "widgets": [
          {
            "type": "text-input",
            "config": {
              "label": "Write the integration by parts formula with your values",
              "description": "Substitute your u, du, v, and dv into the formula",
              "placeholder": "Type your answer with LaTeX...",
              "showPreview": true
            }
          }
        ]
      }
    ]
  }
}

CRITICAL - WIDGET REQUIREMENTS:
1. EVERY step MUST have a "widgets" array with at least one widget
2. Use "text-input" for: explaining concepts, restating problems, verification, conclusions
3. Use "multiple-choice" for: selecting rules/methods/approaches (set multiSelect and showExplanation appropriately)
4. Use "derivation-steps" for: step-by-step mathematical work, showing calculations

WIDGET CONFIGURATION DETAILS:
**text-input**: 
  - label: Question or instruction (can use LaTeX)
  - description: Helper text (can use LaTeX, optional)
  - placeholder: Example text in PLAIN ENGLISH ONLY (no LaTeX - placeholders can't render math)
  - showPreview: true (for math) or false
  - mathMode: true (for multi-line math equations where each line is a separate expression) or false (default - for prose/explanations)

**multiple-choice**:
  - label: Question text (can use LaTeX)
  - description: Instructions (can use LaTeX)
  - choices: Array of {id, name, formula (optional - can use LaTeX)}
  - multiSelect: true for multiple selections, false for single
  - showExplanation: true to require explanation text
  - explanationLabel: Label for explanation field (can use LaTeX)
  - explanationPlaceholder: Placeholder for explanation in PLAIN ENGLISH ONLY (no LaTeX)

**derivation-steps**:
  - showInstructions: true

RESPONSE FORMAT:
{
  "labTitle": string,
  "description": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimated_duration": number (in minutes),
  "topics": string[],
  "data": {
    "problemStatement": "The integral or derivation problem",
    "availableRules": [
      {"id": "rule-1", "name": "Rule Name", "formula": "$LaTeX formula$"}
    ],
    "conceptCheck": {
      "question": "A thought-provoking question related to the problem",
      "explanation": "Optional explanation/hint"
    },
    "steps": [...] // As shown in example above
  }
}

Use proper LaTeX notation ($...$). Include 5-8 calculus/algebra rules relevant to THIS specific problem. Include a conceptCheck with a question that helps students understand WHY they're using certain approaches. Create 3-5 steps where EACH step has widgets appropriate for its learning activity.`,

  explain: `Generate a code explanation lab with this JSON structure:
{
  "labTitle": string,
  "description": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimated_duration": number (in minutes),
  "topics": string[],
  "data": {
    "artifact": {
      "title": "Code title",
      "description": "What the code does",
      "code": "// Actual code to explain (10-30 lines)",
      "language": "javascript" | "python" | "typescript" | "java" | etc
    },
    "steps": [
      {
        "id": "unique-id",
        "title": "Step title",
        "instruction": "What the learner should do",
        "keyQuestions": ["Question 1?", "Question 2?", ...],
        "prompt": "Specific guidance for this step"
      }
    ]
  }
}
Create 3-5 steps tailored to the code complexity. Each step should have:
- Unique id (e.g., "read-structure", "trace-execution", "identify-patterns")
- Clear title and instructions
- 2-4 key questions specific to THIS code
- Helpful prompts/hints

Example step types: analyze structure, predict output, trace execution, identify edge cases, optimize performance, explain complexity.
Provide working, realistic code (10-30 lines).`,

  explore: `Generate an interactive exploration lab with this JSON structure:
{
  "labTitle": string,
  "description": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimated_duration": number (in minutes),
  "topics": string[],
  "data": {
    "simulation": {
      "title": "Simulation name",
      "description": "What can be explored",
      "scenario": "Starting scenario description"
    },
    "paramConfig": [
      {
        "id": "param1",
        "label": "Parameter name",
        "min": number,
        "max": number,
        "default": number,
        "step": number,
        "unit": "unit",
        "description": "What this controls"
      }
    ],
    "hypothesis": "What learners should predict",
    "steps": [
      {
        "id": "step1",
        "title": "Exploration step",
        "instructions": ["Do this", "Observe that"],
        "questions": ["What happens when...", "Why does..."]
      }
    ]
  }
}
Include 3-5 parameters and 3-4 exploration steps.`,

  revise: `Generate a writing revision lab with this JSON structure:
{
  "labTitle": string,
  "description": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimated_duration": number (in minutes),
  "topics": string[],
  "data": {
    "writingTask": {
      "title": "Writing task name",
      "description": "What to write about",
      "purpose": "Why this writing matters",
      "audience": "Who will read this"
    },
    "originalDraft": "The draft text to revise (2-3 paragraphs)",
    "rubricCriteria": [
      {
        "id": "criteria1",
        "name": "Criterion name",
        "description": "What to evaluate",
        "weight": "high" | "medium" | "low"
      }
    ],
    "improvementAreas": [
      {
        "area": "Structure" | "Clarity" | "Argument" | etc,
        "suggestions": ["suggestion1", "suggestion2"]
      }
    ],
    "steps": [
      {
        "id": "step1",
        "focus": "What to revise",
        "prompt": "Guidance for this revision"
      }
    ]
  }
}
Include a realistic draft with issues, 4-5 rubric criteria, and 3-4 revision steps.`
};

export const generateLab = async (request: GenerateLabRequest): Promise<GeneratedLabResponse> => {
  const client = ensureClient();
  const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;

  // Step 1: Select the best template
  const selectionPrompt = `${TEMPLATE_SELECTION_PROMPT}

Learning goal: ${request.learningGoal}
${request.context ? `Context: ${request.context}` : ''}
${request.userProfile?.level ? `User level: ${request.userProfile.level}` : ''}`;

  const selectionCompletion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are a lab template selector. Respond with JSON only.' },
      { role: 'user', content: selectionPrompt },
    ],
    temperature: 0.3,
  });

  const selectionText = selectionCompletion.choices[0]?.message?.content?.trim() || '';
  const selection = tryParseJson<{ template_type: string; reasoning: string }>(selectionText);

  if (!selection || !selection.template_type) {
    throw new Error('Failed to select template type');
  }

  const templateType = selection.template_type;
  const generatorPrompt = TEMPLATE_GENERATORS[templateType];

  if (!generatorPrompt) {
    throw new Error(`Unknown template type: ${templateType}`);
  }

  // Step 2: Generate the lab content
  const contentPrompt = `${generatorPrompt}

Learning goal: ${request.learningGoal}
${request.context ? `Additional context: ${request.context}` : ''}
${request.userProfile?.level ? `User level: ${request.userProfile.level}` : ''}
${request.userProfile?.interests?.length ? `User interests: ${request.userProfile.interests.join(', ')}` : ''}
${request.userProfile?.completedTopics?.length ? `Completed topics: ${request.userProfile.completedTopics.join(', ')}` : ''}

IMPORTANT: The "topics" field must contain 2-5 specific, relevant topic tags (e.g., ["JavaScript", "Algorithms", "Data Structures"] for a coding lab, ["Statistics", "Data Visualization"] for analysis, ["Calculus", "Derivatives"] for math).

Generate a complete, engaging lab. Make it practical and pedagogically sound.
Respond with valid JSON only - no markdown, no explanations.`;

  const contentCompletion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are a lab content generator for Lyceum. Create educational labs that promote deep learning. Respond with JSON only.' },
      { role: 'user', content: contentPrompt },
    ],
    temperature: 0.7,
  });

  const contentText = contentCompletion.choices[0]?.message?.content?.trim() || '';
  const parsed = tryParseJson<any>(contentText);

  if (!parsed || !parsed.labTitle || !parsed.data) {
    throw new Error('Failed to generate valid lab content');
  }

  // Ensure topics are present and meaningful
  let topics = parsed.topics || [];
  if (!topics.length) {
    // Fallback: extract topics from the learning goal
    const goalWords = request.learningGoal.toLowerCase().split(/\s+/);
    const commonTopics = [
      'JavaScript', 'Python', 'TypeScript', 'React', 'Node.js',
      'Algorithms', 'Data Structures', 'Machine Learning', 'AI',
      'Statistics', 'Data Analysis', 'Calculus', 'Linear Algebra',
      'Web Development', 'API', 'Database', 'SQL',
      'CSS', 'HTML', 'Git', 'Testing'
    ];
    topics = commonTopics.filter(topic => 
      goalWords.some(word => topic.toLowerCase().includes(word) || word.includes(topic.toLowerCase()))
    ).slice(0, 3);
    
    // If still empty, use template type as topic
    if (!topics.length) {
      topics = [templateType.charAt(0).toUpperCase() + templateType.slice(1)];
    }
  }

  return {
    title: parsed.labTitle,
    description: parsed.description || '',
    template_type: templateType as any,
    template_data: parsed.data,
    difficulty: parsed.difficulty || 'intermediate',
    estimated_duration: parsed.estimated_duration || 45,
    topics,
    raw: contentText,
  };
};

// Helper function for AI assistance within templates
export const getLabAIAssistance = async (
  templateType: string,
  userPrompt: string,
  context?: any
): Promise<string> => {
  const client = ensureClient();
  const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;

  const systemPrompts: Record<string, string> = {
    analyze: 'You are a data analysis tutor. Help learners understand data patterns, statistical concepts, and visualization. Be clear and concise.',
    build: 'You are a coding mentor. Help learners write code, debug issues, and understand algorithms. Provide hints, not full solutions unless asked.',
    derive: 'You are a mathematics and logic tutor. Help with derivations, proofs, symbolic manipulation, and step-by-step problem solving. Use LaTeX notation ($x^2$, $$\\frac{d}{dx}$$) for mathematical expressions.',
    explain: 'You are a code explanation assistant. Help learners understand how code works, line by line. Explain concepts clearly.',
    explore: 'You are a science experiment guide. Help learners form hypotheses, understand parameters, and interpret results.',
    revise: 'You are a writing coach. Help improve clarity, structure, and argument. Provide specific, actionable feedback.',
  };

  const systemPrompt = systemPrompts[templateType] || 'You are a helpful learning assistant.';

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (context) {
    messages.push({ role: 'system', content: `Context: ${JSON.stringify(context)}` });
  }

  messages.push({ role: 'user', content: userPrompt });

  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() || '';
};
