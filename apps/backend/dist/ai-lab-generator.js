"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLabAIAssistance = exports.generateLab = void 0;
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
    return text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
};
const tryParseJson = (text) => {
    try {
        return JSON.parse(stripCodeFences(text));
    }
    catch {
        return null;
    }
};
const TEMPLATE_SELECTION_PROMPT = `You are a lab template selector for Lyceum, an educational platform. Your job is to choose the best template type for a learning goal.

Available templates:
1. **analyze** - For data analysis, visualization, statistics, pattern recognition with datasets
2. **build** - For hands-on coding practice, learning syntax, writing functions, implementing algorithms, practicing programming concepts. Use when someone wants to "learn how to code/write/implement" something.
3. **derive** - For mathematical derivations, proofs, symbolic manipulation, step-by-step problem solving, and theoretical reasoning
4. **explain** - For understanding and analyzing EXISTING code that's already written, code review, explaining how specific code works
5. **explore** - For interactive simulations, science experiments, parameter exploration, "what-if" scenarios, concept discovery through experimentation (NO CODING - perfect for non-programming topics)
6. **revise** - For writing tasks, text editing, document improvement, creative writing, essay revision, communication skills

Key distinctions: 
- Use "build" when the learner wants to WRITE code to learn (e.g., "learn how to write X", "practice coding Y").
- Use "explain" only when analyzing EXISTING code.
- Use "explore" for non-coding interactive learning (science, simulations, parameter testing).
- Use "revise" for any writing or text-based learning goals.

Based on the learning goal, respond with JSON only:
{
  "template_type": "analyze" | "build" | "derive" | "explain" | "explore" | "revise",
  "reasoning": "Brief explanation of why this template fits"
}`;
const TEMPLATE_GENERATORS = {
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
        "instruction": "Clear markdown explanation of what the learner should analyze in this step",
        "keyQuestions": ["Key question 1?", "Key question 2?"],
        "description": "What to do",
        "hints": ["hint1", "hint2"],
        "widgets": [
          {
            "type": "chart",
            "config": {
              "charts": [{
                "title": "Data Visualization",
                "chartOptions": {
                  "data": (reference to dataset.rows),
                  "series": [{
                    "type": "bar" | "line" | "scatter" | "area",
                    "xKey": "column_name",
                    "yKey": "column_name",
                    "stroke": "#3b82f6"
                  }]
                }
              }]
            }
          }
        ]
      }
    ]
  }
}
Include 5-10 realistic data rows.

CRITICAL - CREATE UNIQUE STEPS:
Create 3-6 steps with titles SPECIFIC to THIS dataset and research question. DO NOT use generic titles like "Explore the Data" or "Analyze Patterns".

Examples of good step titles:
- For sales data: "Compare Q1 vs Q2 Revenue", "Identify Top-Selling Products", "Calculate Monthly Growth Rate"
- For weather data: "Plot Temperature Trends", "Find Correlation with Humidity", "Predict Tomorrow's High"
- For survey data: "Segment Responses by Age Group", "Calculate Response Rate", "Visualize Satisfaction Distribution"

The number and type of steps should match the complexity of the analysis needed.
Use "chart" widgets to visualize data patterns, trends, and relationships.
Available chart types: bar, line, scatter, area, pie, histogram, heatmap.`,
    build: `Generate a coding challenge lab with this JSON structure:
{
  "labTitle": string,
  "description": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimated_duration": number (in minutes),
  "topics": string[],
  "data": {
    "problemStatement": "Detailed description of the coding challenge (use LaTeX for math: $x^2$)",
    "initialCode": "// Starting code template aligned to covered concepts (can be a simple statement-level scaffold; do not force method/class creation unless covered)",
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
        "instruction": "Clear markdown explanation of what the learner should do in this step and why (THIS IS THE MAIN INSTRUCTIONAL TEXT - always include this)",
        "keyQuestions": ["Key question 1?", "Key question 2?"],
        "skeletonCode": "// Skeleton code for THIS STEP ONLY (minimal scaffold needed for this step)",
        "widgets": [
          // WIDGETS ARE OPTIONAL - only include if the step requires interactive input beyond writing code
          // Most coding steps only need the code editor and don't need additional widgets
          // Only add widgets like text-input or multiple-choice if there's a specific conceptual question to answer
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
CRITICAL - CREATE UNIQUE STEPS:
You MUST create unique, topic-specific steps tailored to THIS specific coding challenge. DO NOT use generic steps like "Understand the Problem", "Plan Your Approach", or "Analyze Time and Space Complexity". 

DO NOT include a step about analyzing time/space complexity unless the user specifically asked about algorithm complexity.

PEDAGOGICAL SCOPE GUARD:
- If context says methods/functions are not in scope, DO NOT create steps that ask learners to define methods/functions.
- If context says classes are not in scope, DO NOT create steps that ask learners to define classes/constructors.
- In those cases, provide fixed scaffolding (if required by language/runtime) and keep learner work to statements, variables, expressions, conditionals, and loops that are already covered.

Instead, create 3-7 steps with titles that are SPECIFIC to the learning goal. Examples of good step titles:
- For array iteration: "Write a for loop to sum array elements", "Handle empty array edge case", "Refactor using reduce()"
- For recursion: "Define the base case", "Implement recursive call", "Add memoization"
- For API calls: "Set up fetch request", "Parse JSON response", "Handle errors with try-catch"
- For sorting: "Compare adjacent elements", "Implement swap logic", "Add optimization for sorted arrays"

Each step should:
1. Have a SPECIFIC, action-oriented title related to THIS problem (not generic titles)
2. Include a clear "instruction" field with markdown text that is COMPLETE and SELF-CONTAINED:
   - State exactly what needs to be implemented/returned/calculated
   - Include all specific values, ranges, conditions, or formulas needed
   - Provide concrete examples when helpful
   - The learner should NOT need to reference the problem statement or lab overview to complete the step
3. Include 2-4 "keyQuestions" to guide the learner's thinking - displayed as text, not as widgets
4. Focus on ONE small concept or coding task
5. Only include widgets if the step requires input BEYOND just writing code (most steps won't need extra widgets)
6. Build progressively toward the complete solution

EXAMPLE - Good step structure (statement-level Java, no new methods):
{
  "id": "complete-discount-logic",
  "title": "Complete the discount logic inside the provided main block",
  "instruction": "Inside the existing main block, compute the final price after discount:\\n\\n- Read subtotal from the existing variable named subtotal\\n- If subtotal is at least 100, apply 10% discount\\n- Otherwise apply 5% discount\\n- Store result in finalPrice and print it\\n\\nDo not create new methods or classes for this step.",
  "keyQuestions": [
    "Which if/else condition checks the threshold correctly?",
    "Where should the computed value be stored before printing?",
    "How can I avoid changing unrelated scaffold code?"
  ],
  "skeletonCode": "double subtotal = 120.0;\\n// TODO: compute finalPrice using if/else\\nSystem.out.println(finalPrice);",
}

EXAMPLE - Bad step structure (do not do this):
{
  "id": "implement-bmi-category",
  "title": "Implement bmiCategory",
  "instruction": "Complete bmiCategory so that it returns the appropriate string based on the BMI value. Use a series of if-else statements to check the ranges defined in the problem statement.",
  // BAD: Doesn't specify what the ranges are or what strings to return - forces learner to look elsewhere
}

The number of steps should match the complexity of the topic - simple topics need fewer steps (3-4), complex topics need more (5-7).

WIDGET CONFIGURATION DETAILS:
**editor**: 
  - label: Question or instruction
  - description: Helper text (optional)
  - placeholder: Example text
  - readOnly: false for editable, true for display only
  - variant: "default" (standard), "fullWidth" (wide layout), "aiChat" (compact)
  - height: CSS height value (e.g., "300px") - optional
  Use for: Rich text responses, essays, explanations, code documentation, formatted notes

**multiple-choice**:
  - label: Question text (can use LaTeX)
  - choices: Array of {id, name, formula (optional)}
  - multiSelect: true/false
  - showExplanation: true/false

**chart**: (2D charts and graphs)
  - type: "chart"
  - config: {
      charts: [{
        title: "Chart Title",
        description: "Chart description",
        chartOptions: {
          series: [{
            type: "function" | "line" | "bar" | "scatter" | "area",
            function: "sin(x)" (for function type - supports math expressions),
            xMin: -10, xMax: 10 (for function type),
            xKey: "x", yKey: "y" (for data types),
            stroke: "#3b82f6",
            strokeWidth: 3
          }],
          data: [{x: 1, y: 2}, ...] (optional, for non-function charts)
        }
      }]
    }
  Supports: Basic math (+,-,*,/,^), Trig (sin,cos,tan), exp, log, sqrt, abs, PI, E

**chart3d**: (3D surface and parametric plots)
  - type: "chart3d"
  - config: {
      charts: [{
        title: "3D Visualization",
        description: "Description",
        chartOptions: {
          series: [{
            type: "surface" | "curve3d" | "scatter3d",
            function: "sin(sqrt(x^2 + z^2))" (for surface: z=f(x,y)),
            x: "cos(t)", y: "t", z: "sin(t)" (for curve3d: parametric),
            xMin: -5, xMax: 5, zMin: -5, zMax: 5 (for surface),
            tMin: 0, tMax: 6.28 (for curve3d),
            resolution: 50 (surface density),
            color: "#3b82f6",
            wireframe: false,
            opacity: 0.8
          }],
          data: [{x:1, y:2, z:3}, ...] (for scatter3d)
        }
      }]
    }
  Use for: 3D surfaces, parametric curves, mathematical visualizations

Include 3-5 test cases with clear descriptions.
Provide realistic starter code (5-15 lines) with function signature and helpful comments.

CRITICAL - TEST CASES:
Every step that includes a "code-editor" widget MUST have at least one corresponding test case in the "testCases" array.
The "stepId" field in the test case MUST match the "id" of the step where the code is written.

CRITICAL - WIDGETS VS INSTRUCTIONS:
- The "instruction" field contains markdown text that EXPLAINS what to do - this is ALWAYS shown as text
- The "keyQuestions" field contains questions to guide thinking - these are ALWAYS shown as text bullets
- Widgets are for INTERACTIVE INPUT where the learner types, selects, or constructs something
- Do NOT create widgets that just display information that should be in "instruction" or "keyQuestions"
- If a step only needs the learner to READ and UNDERSTAND (not input anything), you can omit the "widgets" array entirely

CRITICAL - SKELETON CODE PER STEP:
For each step that involves coding, include a "skeletonCode" field with ONLY the code skeleton for that specific step.
- skeletonCode must be incomplete starter code (TODO placeholders), never a full solved answer
- For a brand-new lab, first step skeleton should be minimal and should not fully complete the requested first-step objective
- Keep each step's skeleton focused and concise

CRITICAL - STEP COUNT:
- Choose the number of steps dynamically based on task complexity
- Do NOT default to 4 steps
- Simple tasks: 2-3 steps
- Medium tasks: 3-5 steps
- Complex tasks: 5-8 steps`,
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
        "instruction": "Clear markdown explanation of what to identify and why (can use LaTeX: $x^2$)",
        "keyQuestions": ["What should you look for?", "Why does this choice matter?"],
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
        "instruction": "Differentiate $u = x$ to get $du = dx$, and integrate $dv = e^x dx$ to get $v = e^x$. Show your work step-by-step using the derivation widget below.",
        "keyQuestions": ["What derivative rule applies to u = x?", "What is the antiderivative of e^x?"],
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
        "instruction": "Substitute your values (u = x, v = e^x, du = dx) into the integration by parts formula: $\\\\int u\\\\,dv = uv - \\\\int v\\\\,du$. This gives us $xe^x - \\\\int e^x dx$. Then evaluate the remaining integral.",
        "keyQuestions": ["Are all values correctly substituted?", "Does the new integral look simpler?"],
        "widgets": [
          {
            "type": "editor",
            "config": {
              "label": "Write the integration by parts formula with your values",
              "description": "Substitute your u, du, v, and dv into the formula",
              "placeholder": "Type your answer...",
              "height": "200px"
            }
          }
        ]
      }
    ]
  }
}

CRITICAL - WIDGET REQUIREMENTS:
1. EVERY step MUST have an "instruction" field (markdown text explaining what to do) - this is the PRIMARY instructional content
2. EVERY step SHOULD have "keyQuestions" array (2-4 questions to guide thinking) - these are displayed as text, NOT as interactive widgets
3. Widgets are OPTIONAL and should only be used when the learner needs to ACTIVELY INPUT something (write code, make selections, enter text responses)
4. Use "editor" for: text responses where learners write explanations, essays, code documentation
5. Use "multiple-choice" for: selecting between actual options that will be validated (NOT for displaying rhetorical questions)
6. Use "derivation-steps" for: step-by-step mathematical work where learners show their calculations
7. The "instruction" and "keyQuestions" fields are for DISPLAYING information. Widgets are for COLLECTING learner input.

WIDGET CONFIGURATION DETAILS:
**editor**: 
  - label: Question or instruction
  - description: Helper text (optional)
  - placeholder: Example text
  - readOnly: false for editable, true for display only
  - variant: "default" (standard), "fullWidth" (wide layout), "aiChat" (compact)
  - height: CSS height value (e.g., "300px") - optional
  Use for: Rich text responses, mathematical explanations, formatted proofs, detailed reasoning

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

**chart**: (2D mathematical function plots)
  - type: "chart"
  - config: {
      charts: [{
        title: "Function Graph",
        description: "Visualization",
        chartOptions: {
          series: [{
            type: "function",
            function: "x^2",
            xMin: -10, xMax: 10,
            stroke: "#3b82f6",
            label: "y = x²"
          }]
        }
      }]
    }
  Supports: +,-,*,/,^,sin,cos,tan,exp,log,sqrt,abs,PI,E
  Use to visualize functions, derivatives, integrals

**chart3d**: (3D surface plots)
  - type: "chart3d"
  - config: {
      charts: [{
        title: "3D Surface",
        chartOptions: {
          series: [{
            type: "surface",
            function: "sin(sqrt(x^2 + z^2))",
            xMin: -5, xMax: 5, zMin: -5, zMax: 5,
            resolution: 50,
            color: "#3b82f6"
          }]
        }
      }]
    }
  Use for multivariable calculus, 3D visualization

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

Use proper LaTeX notation ($...$). Include 5-8 calculus/algebra rules relevant to THIS specific problem. Include a conceptCheck with a question that helps students understand WHY they're using certain approaches.

CRITICAL - CREATE UNIQUE STEPS:
Create 3-6 steps with titles SPECIFIC to THIS mathematical problem. DO NOT use generic titles like "Apply the Formula" or "Simplify the Expression".

Examples of good step titles based on problem type:
- For integration by parts: "Identify $u = x$ and $dv = e^x dx$", "Compute $du$ and $v$", "Apply $uv - \\int v\\,du$"
- For derivative problems: "Apply Chain Rule to $\\sin(x^2)$", "Differentiate the Inner Function", "Combine Using Product Rule"
- For limit problems: "Factor Out $(x-2)$", "Cancel Common Terms", "Evaluate at $x = 2$"

CRITICAL - STEP STRUCTURE (APPLIES TO ALL TEMPLATES):
EVERY step object MUST include:
- "id": unique identifier (kebab-case)
- "title": specific, action-oriented title (can use LaTeX)
- "instruction": markdown text that is COMPLETE and SELF-CONTAINED (3-6 sentences):
  * Must include ALL specific details needed to complete the step
  * Must specify exact values, ranges, formulas, conditions, or outputs expected
  * Should include concrete examples when helpful
  * Learner should NOT need to reference problem statement or lab overview
  * Example: Don't say "check the ranges" - instead say "If BMI < 18.5 return 'Underweight', if 18.5-24.9 return 'Normal'"
- "keyQuestions": array of 2-4 thought-provoking questions (strings, plain English) - displayed as text to guide thinking
- "widgets": array of widget configurations - OPTIONAL, only include if the step requires interactive input

CRITICAL DISTINCTION:
- "instruction" and "keyQuestions" = STATIC TEXT that teaches and guides (always displayed)
- "widgets" = INTERACTIVE ELEMENTS where learners input answers, make selections, or construct solutions (only when needed)

DO NOT use widgets to display questions that should be in "keyQuestions".
DO NOT use multiple-choice widgets for rhetorical/conceptual questions - only use them when the selection will be validated.
DO NOT write vague instructions that reference "the problem statement" or "as described above" - include ALL details directly.

The "instruction" field is the PRIMARY teaching content that appears at the top of each step.
The "keyQuestions" help learners think critically about the concepts.
Widgets are for collecting and validating learner responses.

Each step title should reference ACTUAL mathematical expressions from THIS problem. The number of steps should match the problem's complexity.`,
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
CRITICAL - CREATE UNIQUE STEPS:
Create 3-5 steps with titles SPECIFIC to THIS code and what it does. DO NOT use generic titles like "Analyze the Code" or "Understand the Structure".

Examples of good step titles based on code type:
- For a sorting algorithm: "Trace the First Swap", "Identify the Pivot Selection", "Count Comparisons for Input [3,1,4,1,5]"
- For an API handler: "Follow the Request Object", "Spot the Error Handling Gap", "Predict Response for Invalid Input"
- For a recursive function: "Find the Base Case", "Trace the Call Stack for n=3", "Identify the Recursive Call Pattern"

Each step should have:
- A SPECIFIC title that references actual elements of THIS code
- Clear instructions related to THIS specific implementation
- 2-4 key questions specific to THIS code's logic
- Helpful prompts/hints about THIS code's behavior

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
CRITICAL - CREATE UNIQUE STEPS:
Create 3-5 exploration steps with titles SPECIFIC to THIS simulation/topic. DO NOT use generic titles like "Explore Parameters" or "Observe the Results".

Examples of good step titles based on simulation type:
- For physics simulation: "Double the Mass and Measure Impact", "Find the Critical Velocity", "Compare Friction Coefficients"
- For economics model: "Increase Interest Rate by 1%", "Find the Equilibrium Price", "Test Supply Shock Scenario"
- For biology simulation: "Introduce a Predator", "Vary the Reproduction Rate", "Simulate Drought Conditions"

Include 3-5 parameters with appropriate ranges for THIS specific simulation.`,
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
CRITICAL - CREATE UNIQUE STEPS:
Create 3-4 revision steps with focus areas SPECIFIC to THIS draft's actual problems. DO NOT use generic steps like "Improve Clarity" or "Fix Grammar".

Examples of good step focuses based on actual issues in the draft:
- For an argument essay: "Strengthen the Thesis in Paragraph 1", "Add Evidence for the Climate Claim", "Address the Counterargument"
- For a narrative: "Show the Character's Fear, Don't Tell It", "Add Sensory Details to the Forest Scene", "Vary Sentence Length in the Action Sequence"
- For technical writing: "Define 'API' Before First Use", "Break the 50-Word Sentence Into Three", "Add a Code Example for the Setup Step"

Include a realistic draft with specific issues, 4-5 rubric criteria relevant to THIS writing type.`
};
const generateLab = async (request) => {
    const maxRetries = 2;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`Retrying lab generation (attempt ${attempt}/${maxRetries})...`);
            }
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
            const selection = tryParseJson(selectionText);
            if (!selection || !selection.template_type) {
                throw new Error('Failed to select template type');
            }
            let templateType = selection.template_type;
            // Temporarily disable generating "revise" and "explore" labs; fall back to "build" if chosen
            if (templateType === 'revise') {
                console.warn('Template selector returned "revise" which is disabled; falling back to "build".');
                templateType = 'build';
            }
            if (templateType === 'explore') {
                console.warn('Template selector returned "explore" which is disabled; falling back to "build".');
                templateType = 'build';
            }
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

CRITICAL: If the context above includes "CONCEPTS COVERED IN PREVIOUS MODULES", you MUST only use those concepts in this lab. Do not introduce any new concepts, techniques, syntax, APIs, or knowledge not listed. This ensures proper pedagogical sequencing.

CRITICAL: If the context above includes "FUTURE MODULE CONCEPTS (DO NOT USE YET)", those concepts are strictly prohibited in the generated lab content, steps, code, and tests.

CRITICAL: If the context includes "PROGRAMMING FEATURE GATES (STRICT)", you MUST obey those gates exactly. Do not ask learners to author methods/classes when those gates prohibit them.

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
            const parsed = tryParseJson(contentText);
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
                topics = commonTopics.filter(topic => goalWords.some(word => topic.toLowerCase().includes(word) || word.includes(topic.toLowerCase()))).slice(0, 3);
                // If still empty, use template type as topic
                if (!topics.length) {
                    topics = [templateType.charAt(0).toUpperCase() + templateType.slice(1)];
                }
            }
            return {
                title: parsed.labTitle,
                description: parsed.description || '',
                template_type: templateType,
                template_data: parsed.data,
                difficulty: parsed.difficulty || 'intermediate',
                estimated_duration: parsed.estimated_duration || 45,
                topics,
                raw: contentText,
            };
        }
        catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt + 1} failed for lab generation:`, error.message);
            if (attempt === maxRetries) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
    throw lastError;
};
exports.generateLab = generateLab;
// Helper function for AI assistance within templates
const getLabAIAssistance = async (templateType, userPrompt, context) => {
    const client = ensureClient();
    const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;
    const systemPrompts = {
        analyze: 'You are a data analysis tutor. Help learners understand data patterns, statistical concepts, and visualization. Be clear and concise.',
        build: 'You are a coding mentor. Help learners write code, debug issues, and understand algorithms. Provide hints, not full solutions unless asked.',
        derive: 'You are a mathematics and logic tutor. Help with derivations, proofs, symbolic manipulation, and step-by-step problem solving. Use LaTeX notation ($x^2$, $$\\frac{d}{dx}$$) for mathematical expressions.',
        explain: 'You are a code explanation assistant. Help learners understand how code works, line by line. Explain concepts clearly.',
        explore: 'You are a science experiment guide. Help learners form hypotheses, understand parameters, and interpret results.',
        revise: 'You are a writing coach. Help improve clarity, structure, and argument. Provide specific, actionable feedback.',
    };
    const systemPrompt = systemPrompts[templateType] || 'You are a helpful learning assistant.';
    const messages = [
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
exports.getLabAIAssistance = getLabAIAssistance;
