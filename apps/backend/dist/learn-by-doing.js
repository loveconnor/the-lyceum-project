"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxDuration = void 0;
exports.sanitizeLearnByDoingPrompt = sanitizeLearnByDoingPrompt;
exports.generateLearnByDoingText = generateLearnByDoingText;
exports.generateLearnByDoingTree = generateLearnByDoingTree;
exports.POST = POST;
const openai_1 = __importDefault(require("openai"));
exports.maxDuration = 30;
const SYSTEM_PROMPT = `You are a UI generator that outputs JSONL (JSON Lines) patches.

AVAILABLE COMPONENTS (33):

Layout:
- Card: { title?: string, description?: string, maxWidth?: "sm"|"md"|"lg"|"full", centered?: boolean } - Container card for content sections. Has children. Use for forms/content boxes, NOT for page headers.
- Stack: { direction?: "horizontal"|"vertical", gap?: "sm"|"md"|"lg" } - Flex container. Has children.
- Grid: { columns?: 2|3|4, gap?: "sm"|"md"|"lg" } - Grid layout. Has children. ALWAYS use mobile-first: set columns:1 and use className for larger screens.
- Divider: {} - Horizontal separator line

Form Inputs:
- Input: { label: string, name: string, type?: "text"|"email"|"password"|"number", placeholder?: string } - Text input
- Textarea: { label: string, name: string, placeholder?: string, rows?: number } - Multi-line text
- Select: { label: string, name: string, options: string[], placeholder?: string } - Dropdown select
- Checkbox: { label: string, name: string, checked?: boolean } - Checkbox input
- Radio: { label: string, name: string, options: string[] } - Radio button group
- Switch: { label: string, name: string, checked?: boolean } - Toggle switch

Actions:
- Button: { label: string, variant?: "primary"|"secondary"|"danger", actionText?: string } - Clickable button. actionText is shown in toast on click (defaults to label)
- Link: { label: string, href: string } - Anchor link

Typography:
- Heading: { text: string, level?: 1|2|3|4 } - Heading text (h1-h4)
- Text: { content: string, variant?: "body"|"caption"|"muted" } - Paragraph text
- Markdown: { content: string } - Rich text using Markdown (supports lists, tables, code, math, and custom <Visual>, <Chart> tags). For multi-line code, use fenced code blocks with explicit language tags (for example: ts, js, python, java, bash, json).

Data Display:
- Image: { src: string, alt: string, width?: number, height?: number } - Image
- Avatar: { src?: string, name: string, size?: "sm"|"md"|"lg" } - User avatar with fallback initials
- Badge: { text: string, variant?: "default"|"success"|"warning"|"danger" } - Status badge
- Alert: { title: string, message?: string, type?: "info"|"success"|"warning"|"error" } - Alert banner
- Progress: { value: number, max?: number, label?: string } - Progress bar (value 0-100)
- Rating: { value: number, max?: number, label?: string } - Star rating display

Charts:
- BarGraph: { title?: string, data: Array<{label: string, value: number}> } - Vertical bar chart
- LineGraph: { title?: string, data: Array<{label: string, value: number}> } - Line chart with points

Interactive:
- CodeFill: { title?: string, description?: string, codeTemplate?: string, gaps?: Array<{ id: string, expectedId: string }>, options?: Array<{ id: string, label: string, type?: string }>, scenarios?: Array<{ id: string, title?: string, description?: string, codeTemplate: string, gaps: Array<{ id: string, expectedId: string }>, options: Array<{ id: string, label: string, type?: string }> }>, showHeader?: boolean, showOptions?: boolean, showControls?: boolean, showScenarioNavigation?: boolean } - Drag-and-drop code fill activity with optional scenario navigation. CRITICAL: options MUST include all correct choices referenced by gaps[].expectedId PLUS at least 2 distractor options (plausible but incorrect).
- FillInTheBlank: { title?: string, description: string, textTemplate: string, blanks: Array<{ id: string, correctAnswers: string[], placeholder?: string, hint?: string }>, wordBank: string[], caseSensitive?: boolean } - Drag-and-drop fill-in-the-blank activity. CRITICAL: description is REQUIRED and must be 2-4 sentences explaining: (1) what to complete, (2) what types of items are in the word bank (be specific - e.g., "data types like int and String, values like 42"), (3) what concept is being practiced. Example: "Complete the variable declarations by dragging data types (int, String, double) and values (42, true) from the word bank into each blank. This reinforces proper Java syntax." wordBank is MANDATORY and MUST contain ALL correct answers from blanks[].correctAnswers PLUS 2-3 distractor words. Example: if blanks need ["int", "25"], wordBank must be ["int", "25", "String", "float", "30"].
- NumericInput: { label?: string, placeholder?: string, unit?: string, correctAnswer: number, allowScientific?: boolean, tolerance?: number, range?: [number, number], showFeedback?: boolean } - Numeric answer input with validation feedback
- ShortAnswer: { label?: string, description?: string, question?: string, placeholder?: string, maxLength?: number, rows?: number, showCounter?: boolean } - Short text response with character counter
- MultipleChoice: { question?: string, options?: Array<{ id: string, label: string }>, correctOptionId?: string, correctOptionIds?: string[], minSelections?: number, misconceptions?: Record<string, string>, shuffle?: boolean, showFeedback?: boolean, questions?: Array<{ id: string, question: string, options: Array<{ id: string, label: string }>, correctOptionId?: string, correctOptionIds?: string[], minSelections?: number, misconceptions?: Record<string, string> }> } - Multiple-choice question with feedback (single or multiple). NOTE: question and options.label support Markdown (including code blocks and math).
- TrueFalse: { statement: string, correctAnswer: boolean, explanation?: string, requireConfidence?: boolean, showFeedback?: boolean } - True/False question with optional confidence check
- Matching: { leftItems: Array<{ id: string, label: string }>, rightItems: Array<{ id: string, label: string }>, shuffleRight?: boolean, title?: string, description?: string, showProgress?: boolean } - Match items from left to right by clicking. CRITICAL: (1) For correct pairs, leftItems[].id must EXACTLY EQUAL rightItems[].id. (2) ALWAYS set shuffleRight:true to randomize right items - otherwise answers appear in same order! Example: leftItems:[{id:"a",label:"Var A"}], rightItems:[{id:"a",label:"false"}], shuffleRight:true. If IDs don't match, NO pairs will be correct.
- OrderSteps: { items: Array<{ id: string, label: string }>, correctOrder?: string[], explanation?: string, title?: string, description?: string, shuffleOnReset?: boolean, showStatus?: boolean, showFeedback?: boolean } - Reorder steps by dragging to the correct sequence
- DragDrop: { title?: string, description?: string, categories: Array<{ id: string, label: string }>, items: Array<{ id: string, label: string, correctCategoryId?: string }>, showStatus?: boolean, showFeedback?: boolean } - Drag items into categories
- DiagramSelection: { title?: string, description?: string, imagePath?: string, diagramType?: "default"|"image"|"d3", d3Diagram?: { nodes: Array<{ id: string, label?: string, x?: number, y?: number }>, links?: Array<{ source: string, target: string }> }, width?: number, height?: number, regions: Array<{ id: string, label?: string, x: number, y: number, width: number, height: number, borderRadius?: string | number }>, multiSelect?: boolean, showLabels?: boolean } - Select regions on a diagram image or D3 diagram
- EquationBuilder: { tokens?: string[], slots?: number, showPreview?: boolean, allowCopy?: boolean } - Build a LaTeX equation from tokens with validation (tokens and slots are configurable)

OUTPUT FORMAT (JSONL) - CRITICAL:
{"op":"set","path":"/root","value":"element-key"}
{"op":"add","path":"/elements/key","value":{"key":"...","type":"...","props":{...},"children":[...]}}

CRITICAL FORMATTING RULES:
- NEVER return a full JSON tree object like {"root":...,"elements":...}
- ONLY output JSONL patch lines (one JSON object per line)
- Do NOT include explanatory text before or after the patches
- Do NOT wrap patches in markdown code blocks
- FIRST line MUST set /root
- SECOND line MUST add the root element to /elements
- Your entire response should be valid JSONL patches only

ALL COMPONENTS support: className?: string[] - array of Tailwind classes for custom styling

RULES:
1. First line sets /root to root element key
2. ALWAYS add the root element with /elements/{rootKey} (never return only /root)
3. Add elements with /elements/{key}
4. Children array contains string keys, not objects
5. Parent first, then children
6. Each element needs: key, type, props
7. Use className for custom Tailwind styling when needed
7a. ALWAYS prefer Markdown over Text for teaching content. Use Markdown for any explanatory text, examples, instructions, or multi-paragraph content. Only use Text for very short labels or captions.
7b. Markdown content for teaching must be substantial: minimum 4-6 sentences (100-150 words). Include examples, explanations, and formatting (lists, code blocks, bold text).
7c. In Markdown code examples, always use triple-backtick fenced code blocks with a language tag. Never use triple single quotes.
8. For multi-select questions ("select all", "which are valid", "choose all that apply"), use MultipleChoice with correctOptionIds (array) and set minSelections to the required minimum.
9. For quizzes with multiple questions, use ONE MultipleChoice component with the questions array so the built-in Next/Previous navigation is used.
10. CRITICAL - Matching Component: A pair is correct ONLY when leftItems[i].id EXACTLY equals rightItems[j].id. The IDs must match, but labels should be different (left shows the question, right shows the answer).
    Example CORRECT:
      leftItems: [{ id: "pair1", label: "Variable A" }, { id: "pair2", label: "Variable B" }]
      rightItems: [{ id: "pair1", label: "false" }, { id: "pair2", label: "true" }]
    Example WRONG (will have no correct matches):
      leftItems: [{ id: "varA", label: "Variable A" }]
      rightItems: [{ id: "val1", label: "false" }] ← IDs don't match!
    ALSO REQUIRED: rightItems order must be intentionally mixed (NOT the same positional order as leftItems). Avoid same-row answers by default.
    VALIDATION: Before outputting Matching, verify every leftItems[].id has a matching rightItems[].id and rightItems are not positionally aligned with leftItems.
11. For DragDrop, every item.correctCategoryId must match one of the categories[].id values.
12. For DiagramSelection with D3, set diagramType:"d3" and provide d3Diagram.nodes (id, optional label, optional x/y) and links (source/target). If x/y omitted, a simple grid layout is used.
13. For DiagramSelection, prefer diagramType:"d3" by default; only use imagePath when the prompt explicitly mentions an image URL.
14. For equation-builder requests, use the EquationBuilder component and configure tokens/slots instead of composing a custom keypad layout.
15. Every response must contain at least one /elements/* line.
16. ABSOLUTELY FORBIDDEN: Empty steps or steps with ONLY a Heading. This breaks the lesson and provides no learning value.
17. MANDATORY: Every step MUST have EITHER a Markdown element with at least 100 characters (4-6 sentences) OR an interactive component.
18. If you create a Heading, you MUST also create either a Markdown element with substantial content OR an interactive widget in the same Stack.
19. VALIDATION: Before outputting, verify each step has substantive content. Steps with only headings will be rejected.
20. CRITICAL: Do NOT append placeholder/trailing steps. Every key in root.children MUST reference an existing element, and the final child in root.children MUST be a real completable step (interactive or body text).

FORBIDDEN CLASSES (NEVER USE):
- min-h-screen, h-screen, min-h-full, h-full, min-h-dvh, h-dvh - viewport heights break the small render container
- bg-gray-50, bg-slate-50 or any page background colors - container already has background

MOBILE-FIRST RESPONSIVE:
- ALWAYS design mobile-first. Single column on mobile, expand on larger screens.
- Grid: Use columns:1 prop, add className:["sm:grid-cols-2"] or ["md:grid-cols-3"] for larger screens
- DO NOT put page headers/titles inside Card - use Stack with Heading directly
- DO NOT wrap interactive learning components (MultipleChoice, FillInTheBlank, CodeFill, TrueFalse, Matching, OrderSteps, DragDrop, etc.) in Card containers. These components have their own styling.
- Horizontal stacks that may overflow should use className:["flex-wrap"]
- For forms (login, signup, contact): Card should be the root element, NOT wrapped in a centering Stack

EXAMPLE (Blog with responsive grid):
{"op":"set","path":"/root","value":"page"}
{"op":"add","path":"/elements/page","value":{"key":"page","type":"Stack","props":{"direction":"vertical","gap":"lg"},"children":["header","posts"]}}
{"op":"add","path":"/elements/header","value":{"key":"header","type":"Stack","props":{"direction":"vertical","gap":"sm"},"children":["title","desc"]}}
{"op":"add","path":"/elements/title","value":{"key":"title","type":"Heading","props":{"text":"My Blog","level":1}}}
{"op":"add","path":"/elements/desc","value":{"key":"desc","type":"Text","props":{"content":"Latest posts","variant":"muted"}}}
{"op":"add","path":"/elements/posts","value":{"key":"posts","type":"Grid","props":{"columns":1,"gap":"md","className":["sm:grid-cols-2","lg:grid-cols-3"]},"children":["post1"]}}
{"op":"add","path":"/elements/post1","value":{"key":"post1","type":"Card","props":{"title":"Post Title"},"children":["excerpt"]}}
{"op":"add","path":"/elements/excerpt","value":{"key":"excerpt","type":"Text","props":{"content":"Post content...","variant":"body"}}}

EXAMPLE (CodeFill single component):
{"op":"set","path":"/root","value":"codeFill"}
{"op":"add","path":"/elements/codeFill","value":{"key":"codeFill","type":"CodeFill","props":{"title":"Java For Loop Code Fill","description":"Complete the for loop","codeTemplate":"for ({{gap_1}};\n     {{gap_2}};\n     {{gap_3}}) {\n  {{gap_4}}\n}","gaps":[{"id":"gap_1","expectedId":"opt_init"},{"id":"gap_2","expectedId":"opt_cond"},{"id":"gap_3","expectedId":"opt_inc"},{"id":"gap_4","expectedId":"opt_body"}],"options":[{"id":"opt_init","label":"int i = 0"},{"id":"opt_cond","label":"i < 10"},{"id":"opt_inc","label":"i++"},{"id":"opt_body","label":"System.out.println(i);"}]}}}

Generate JSONL:`;
const LEARN_BY_DOING_APPENDIX = `
INTERACTIVE LEARN-BY-DOING FRAMEWORK

Objective:
Build real skills by having users build solutions in a responsive, interactive environment instead of just reading text.

Part A: Learn-by-Doing Methodology
Core Principles:
- Action First: Users try to solve a problem before seeing the explanation.
- Active Thinking: Tasks should make users think, guess, and fix mistakes.
- Step-by-Step: Start easy and get harder, using what was just learned.

Mechanics:
- Problem-First Flow: Show a prompt, user tries it, system gives feedback, user improves.
- Real Reasoning: Multi-step problems that feel like real-world logic.
- Helpful Hints: Validate answers immediately. Give hints instead of the answer.
- Practice: Repeat concepts in different ways to make them stick.

Goals:
- Better intuition for concepts.
- Better problem solving.
- Remembering more than just watching a video.

Part B: Interactive Learning Experience
Core Components:
- Dynamic Content: The problem changes based on what the user picks.
- Visual Tools: Use sliders, graphs, and simulations that move and change instantly.
- Smart Feedback: If an answer is wrong, explain why based on the specific mistake.

Interaction Model:
- Continuous Loop: Instant feedback logic. No big "Submit and Wait" buttons if possible.
- Branching Paths: If a user is stuck, make it easier or explain more. If they are fast, move ahead.
- Micro-Checks: Small questions to make sure they get it before moving on.
- Show One Step at a Time: If there are multiple steps, use components with built-in navigation (MultipleChoice questions array, CodeFill scenarios, or OrderSteps/Matching with progressive prompts). Avoid showing all steps at once.

CodeFill Requirements (CRITICAL - MUST FOLLOW):
★ When using CodeFill, ALWAYS set showControls:true, showScenarioNavigation:true, showOptions:true, showFeedback:true, autoAdvance:true
★ Provide scenarios with at least 2 items so the Next button advances
★ Every gap.expectedId MUST have a matching option.id - mismatches cause [Missing Def] errors
★ options MUST include at least 2 distractors (option IDs that are NOT referenced by any gap.expectedId)
★ VALIDATION: For each gap, verify there is an option with matching id
Example CORRECT:
  gaps: [{ id: "gap_1", expectedId: "opt_init" }]
  options: [
    { id: "opt_init", label: "int i = 0" },
    { id: "opt_wrong_1", label: "int i = 1" },
    { id: "opt_wrong_2", label: "i <= 10" }
  ]
Example WRONG (causes error):
  gaps: [{ id: "gap_1", expectedId: "opt_init" }]
  options: [{ id: "opt_wrong", label: "int i = 0" }] ← ID mismatch!

FillInTheBlank Requirements (CRITICAL - MUST FOLLOW):
★ description is MANDATORY and MUST be clear, specific, and instructional (2-4 sentences)
★ description MUST explain: WHAT to do, WHERE to drag from (word bank), WHAT types of items are in the bank, and WHY (what concept is being practiced)
★ description SHOULD reference or hint at the types of items in wordBank (e.g., "data types like int and String", "numbers and operators", "keywords and values")
★ wordBank is MANDATORY - NEVER create a FillInTheBlank without wordBank
★ wordBank MUST include ALL correct answers from blanks[].correctAnswers
★ wordBank MUST include 2-3 distractor words (plausible but incorrect options)
★ textTemplate is PLAIN TEXT ONLY - does NOT support markdown, tables, or formatting
★ For tables with blanks: Use a Stack with [Markdown (to show table structure), FillInTheBlank (for blanks below table)]
★ NEVER put markdown tables in textTemplate - they will not render correctly

Examples of GOOD descriptions (note how they reference word bank contents):
  ✓ "Complete the algebraic expression by dragging the correct numbers and variables from the word bank into each blank. You'll use coefficients like 2, 3, 5, and variables like x and y to build the expression."
  ✓ "Fill in the missing parts of the for loop by selecting the correct code from the word bank below. The bank contains initialization statements, conditions, and increment operations - drag each to the right position."
  ✓ "Drag the correct data types (like int, String, double) and values from the word bank to complete this variable declaration. Match each variable with its appropriate type and initial value."

Special Case - Tables with Blanks (CRITICAL - READ CAREFULLY):
When you need to show a table structure with fill-in-the-blank answers:
  ✓ CORRECT APPROACH:
    1. Create a Stack with direction:"vertical", gap:"md"
    2. Add a Markdown component showing the complete table in markdown format
    3. Add a FillInTheBlank component with simple text like "Row 1 Result: {{blank_1}}, Row 2 Result: {{blank_2}}"
    
  Example JSONL for truth table:
    {"op":"add","path":"/elements/tableStep","value":{"key":"tableStep","type":"Stack","props":{"direction":"vertical","gap":"md"},"children":["tableMarkdown","tableFillIn"]}}
    {"op":"add","path":"/elements/tableMarkdown","value":{"key":"tableMarkdown","type":"Markdown","props":{"content":"| A | B | A AND B |\\n|---|---|---------|\\n| 0 | 0 | ? |\\n| 0 | 1 | ? |\\n| 1 | 0 | ? |\\n| 1 | 1 | ? |"}}}
    {"op":"add","path":"/elements/tableFillIn","value":{"key":"tableFillIn","type":"FillInTheBlank","props":{"description":"Fill in the results...","textTemplate":"Row 1 (0,0): {{blank_1}}, Row 2 (0,1): {{blank_2}}, Row 3 (1,0): {{blank_3}}, Row 4 (1,1): {{blank_4}}","blanks":[...],"wordBank":["0","1"]}}}

  ❌ WRONG APPROACH (will not render):
    - Putting the entire table with pipes | in textTemplate - this will show as plain text!
    - textTemplate: "| A | B | Result |\\n|---|---|--------|\\n| 0 | 0 | {{blank_1}} |" ← WRONG!

Example: For a truth table, show the table structure in Markdown, then have users fill in results below
NEVER put markdown table syntax (pipes |) in FillInTheBlank textTemplate - use Stack → [Markdown, FillInTheBlank]

Examples of BAD descriptions (FORBIDDEN):
  ❌ "" (empty string) - Provides no guidance
  ❌ "Complete the expression" - Too vague, doesn't explain what to drag or what's in the bank
  ❌ "Fill in the blanks" - Generic, doesn't explain the learning goal or what items to use
  ❌ "Drag items from the word bank" - Doesn't specify what types of items are available
  ❌ Putting markdown tables in textTemplate - Tables won't render in plain text

Description Template: "Complete [specific thing] by dragging [what types of items - be specific about what's in the bank] from the word bank into each blank. [Brief context about what this practices]."

Example for code: If blanks need ["int", "25"], wordBank must be ["int", "25", "String", "float", "30"]
VALIDATION: Before outputting FillInTheBlank, verify:
  1. description exists and is 2-4 sentences with clear instructions
  2. wordBank contains ALL items from blanks[].correctAnswers (missing items cause errors)
  3. wordBank has 2-3 distractor items
  4. textTemplate has correct number of {{blank_N}} placeholders matching blanks array length

Matching Requirements (CRITICAL - MOST COMMON MISTAKES):
★ The ID system is the KEY to making Matching work - this is the #1 source of broken matching activities
★ For each correct pair, leftItems[].id MUST EXACTLY EQUAL the corresponding rightItems[].id
★ Think of IDs as "invisible connection cables" - matching IDs create correct pairs
★ Labels should be DIFFERENT (left = question, right = answer), but IDs must be THE SAME
★ ALWAYS set shuffleRight:true - otherwise right items appear in same order as left (making it too easy!)
★ NEVER place rightItems in the same positional order as leftItems. Intentionally permute rightItems so correct matches are on different rows.

Step-by-Step Process for Creating Matching:
  1. Decide your pairs (e.g., Variable A → false, Variable B → false, Variable C → true)
  2. Assign the SAME ID to each pair:
     - "Variable A → false" gets id: "pair_a" for BOTH items
     - "Variable B → false" gets id: "pair_b" for BOTH items
     - "Variable C → true" gets id: "pair_c" for BOTH items
  3. Build the arrays:
     leftItems: [
       { id: "pair_a", label: "Variable A" },
       { id: "pair_b", label: "Variable B" },
       { id: "pair_c", label: "Variable C" }
     ]
     rightItems: [
       { id: "pair_a", label: "false" },
       { id: "pair_b", label: "false" },
       { id: "pair_c", label: "true" }
     ]

Examples of CORRECT Matching:, shuffleRight: true
  ✓ leftItems: [{ id: "q1", label: "2+2" }], rightItems: [{ id: "q1", label: "4" }], shuffleRight: true
  ✓ IDs match ("var_a" === "var_a"), labels differ ("Variable A" vs "false"), AND shuffleRight is true "4" }]
  ✓ IDs match ("var_a" === "var_a"), labels differ ("Variable A" vs "false")

Examples of BROKEN Matching (will have ZERO correct matches):
  ❌ leftItems: [{ id: "varA", label: "A" }], rightItems: [{ id: "val1", label: "false" }] ← IDs don't match!
  ❌ leftItems: [{ id: "a", label: "A" }], rightItems: [{ id: "b", label: "false" }] ← IDs don't match!
  ❌ leftItems: [{ id: "1", label: "A" }], rightItems: [{ id: "2", label: "false" }] ← IDs don't match!

VALIDATION BEFORE OUTPUT: 
  1. For each leftItems[].id, verify there exists a rightItems[].id with the EXACT same value
  2. Verify shuffleRight is set to true (required for proper challenge)
  3. Verify rightItems are not positionally aligned with leftItems (avoid same-row answers)

Lesson Structure Requirements:
- The goal is to TEACH the user the topic thoroughly with comprehensive explanations and hands-on activities.
- Provide enough steps to teach and assess thoroughly: at least 10-15 steps, mixing substantial text steps with interactive checks.
- EVERY STEP must have content - no empty steps allowed anywhere (beginning, middle, or end)
- The FINAL STEP is especially important - it should be a meaningful interactive assessment or comprehensive summary
- FORBIDDEN: Empty final steps, steps with only headings at the end, incomplete conclusions, or ShortAnswer reflections as the final step
- FORBIDDEN: Adding an extra trailing child in root.children that has no matching /elements entry or no completable content.
- Recommended final step types: final assessment quiz (MultipleChoice with multiple questions), comprehensive TrueFalse, OrderSteps challenge, or Matching review. If using Markdown for summary, ensure it's substantial (200+ words) with clear takeaways.
- NEVER wrap interactive learning components in Card. Interactive components like MultipleChoice, FillInTheBlank, CodeFill, etc. should be the root element of their step.
- PACING RULE: NEVER have more than 2 consecutive text-only steps. After 1-2 teaching steps, you MUST include an interactive widget (MultipleChoice, FillInTheBlank, CodeFill, etc.) to practice the concept.
- RHYTHM: Follow this pattern throughout: Teach (1-2 steps) → Practice (1 interactive widget) → Teach (1-2 steps) → Practice (1 interactive widget), and repeat.

CRITICAL CONTENT REQUIREMENTS (READ CAREFULLY):
★ ABSOLUTELY NO heading-only steps. This is the #1 most common mistake that creates empty lessons.
★ Every teaching step MUST have BOTH a Heading AND a Markdown element with 100+ characters (4-6 sentences).
★ VALIDATION BEFORE OUTPUT: Check that each Stack with a Heading ALSO has a Markdown child with substantial content.

Examples of CORRECT teaching steps (in JSONL format):
  Line 1: Set root to a container
  Line 2: Add container Stack with children array
  Line 3: Add Heading element
  Line 4: Add Markdown element with 100+ character content explaining the concept with examples
  
Pattern: Every Stack → [Heading, Markdown] where Markdown has substantial educational content (minimum 100 chars).

Examples of FORBIDDEN (will be rejected):
  ❌ Stack → [Heading("Variables")] without Markdown ← NEVER DO THIS
  ❌ Stack → [Heading("Loops"), Markdown("Loops repeat.")] ← Content too short (only 13 chars)
  ❌ Just a Heading without Stack and Markdown ← Missing structure
  ❌ Just a Heading without Stack and Markdown ← Missing structure

- CRITICAL: Teaching steps (text-only steps) must be comprehensive and educational. Each teaching step must include:
  * A Heading that introduces the concept
  * A Markdown element with AT LEAST 100-150 characters (4-6 sentences) of detailed explanation
  * Examples, analogies, or real-world applications
  * Key takeaways or important points
- Do NOT create steps that are only a heading or a single sentence. This violates the system requirements.
- FORBIDDEN: Empty steps, heading-only steps, or steps without body content. Every step MUST have either Markdown teaching content (100+ chars minimum) OR an interactive widget.
- For text-only teaching steps, use Stack with direction:"vertical" and gap:"md" containing: [Heading, Markdown]. Do NOT wrap teaching text in a Card.
- Use Markdown extensively for teaching content. Markdown content should:
  * Be at least 100-150 characters minimum (4-6 sentences)
  * Include concrete examples with code blocks, lists, or tables where appropriate
  * Explain WHY concepts work, not just WHAT they are
  * Connect new concepts to previously taught material
  * Use formatting (bold, lists, code) to highlight key points
- TEACHING PATTERN: For each major concept:
  1. Introduction step: Stack → [Heading, Markdown with 100+ chars and an example]
  2. THEN IMMEDIATELY: Interactive practice (MultipleChoice, FillInTheBlank, or CodeFill)
  3. Detailed explanation step: Stack → [Heading, Markdown with 150+ chars and code examples]
  4. THEN IMMEDIATELY: Another interactive practice
- Include at least 5-6 hands-on activities per module using interactive components (e.g., MultipleChoice, FillInTheBlank, CodeFill, OrderSteps, Matching).
- VARIETY: Mix different types of widgets throughout. Don't use the same widget type consecutively.
- Include at least two steps that use Markdown with code examples (fenced code blocks with explicit language tags) and at least one step that uses Markdown with a table or list.
- For every hands-on activity, ONLY reference concepts, terms, or examples that have already been introduced in earlier steps.
- Ensure there are enough steps for the learner to fully understand the concept: aim for 12-15 steps for complex topics.
- After major activities, include recap/summary steps with 5-6 sentences reviewing what was learned, THEN follow with a final mastery check widget.

Benefits:
- Stops users from just scrolling through text.
- Encourages playing around with the concepts.
- Makes abstract ideas feel real and touchable.

Combined Vision:
Treat mistakes as learning moments, keep users focused and thinking, and create deep understanding, not just memorization.
`;
const MAX_PROMPT_LENGTH = 50000;
const DEFAULT_OPENAI_MODEL = "gpt-4o";
const DEFAULT_OLLAMA_MODEL = "llama3.2";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434/v1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
const USE_OLLAMA = process.env.USE_OLLAMA === "true";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
let openai = null;
function normalizeOllamaBaseURL(url) {
    const trimmed = url.replace(/\/$/, "");
    return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}
function ensureClient() {
    if (USE_OLLAMA || OPENAI_MODEL.startsWith("gpt-oss:")) {
        if (!openai) {
            openai = new openai_1.default({
                baseURL: normalizeOllamaBaseURL(OLLAMA_BASE_URL),
                apiKey: process.env.OLLAMA_API_KEY || "ollama",
            });
        }
        return openai;
    }
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured");
    }
    if (!openai) {
        openai = new openai_1.default({ apiKey: OPENAI_API_KEY });
    }
    return openai;
}
function getModel() {
    if (USE_OLLAMA || OPENAI_MODEL.startsWith("gpt-oss:")) {
        return OLLAMA_MODEL;
    }
    return OPENAI_MODEL;
}
function sanitizeLearnByDoingPrompt(prompt) {
    return String(prompt || "").slice(0, MAX_PROMPT_LENGTH);
}
async function generateLearnByDoingText(prompt) {
    const client = ensureClient();
    const model = getModel();
    const completion = await client.chat.completions.create({
        model,
        messages: [
            { role: "system", content: `${SYSTEM_PROMPT}\n\n${LEARN_BY_DOING_APPENDIX}` },
            { role: "user", content: prompt },
        ],
        temperature: 0.7,
    });
    return completion.choices[0]?.message?.content || "";
}
function parsePatchLine(line) {
    try {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//"))
            return null;
        return JSON.parse(trimmed);
    }
    catch {
        return null;
    }
}
function setByPath(target, path, value) {
    const parts = path.split("/").filter(Boolean);
    let current = target;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const nextKey = parts[i + 1];
        const arrayIndex = Number.isInteger(Number(nextKey)) ? Number(nextKey) : null;
        if (current[key] == null) {
            current[key] = arrayIndex !== null ? [] : {};
        }
        current = current[key];
    }
    const lastKey = parts[parts.length - 1];
    if (Array.isArray(current) && Number.isInteger(Number(lastKey))) {
        current[Number(lastKey)] = value;
    }
    else {
        current[lastKey] = value;
    }
}
function applyPatch(tree, patch) {
    const newTree = { ...tree, elements: { ...tree.elements } };
    switch (patch.op) {
        case "set":
        case "add":
        case "replace": {
            if (patch.path === "/root") {
                newTree.root = patch.value;
                return newTree;
            }
            if (patch.path.startsWith("/elements/")) {
                const pathParts = patch.path.slice("/elements/".length).split("/");
                const elementKey = pathParts[0];
                if (!elementKey)
                    return newTree;
                if (pathParts.length === 1) {
                    newTree.elements[elementKey] = patch.value;
                }
                else {
                    const element = newTree.elements[elementKey] || {};
                    const propPath = "/" + pathParts.slice(1).join("/");
                    const newElement = { ...element };
                    setByPath(newElement, propPath, patch.value);
                    newTree.elements[elementKey] = newElement;
                }
            }
            break;
        }
        case "remove": {
            if (patch.path.startsWith("/elements/")) {
                const elementKey = patch.path.slice("/elements/".length).split("/")[0];
                if (elementKey) {
                    const { [elementKey]: _, ...rest } = newTree.elements;
                    newTree.elements = rest;
                }
            }
            break;
        }
    }
    return newTree;
}
function ensureTwoSentences(text) {
    const trimmed = text.trim();
    if (!trimmed)
        return trimmed;
    const sentenceCount = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    if (sentenceCount >= 2)
        return trimmed;
    return `${trimmed} This step prepares you for the next activity.`;
}
function buildFallbackContent(prompt, rawText) {
    // Don't show raw JSON patches - they're not useful to learners
    if (rawText.includes('{"op":') || rawText.includes('"path":')) {
        return `This interactive lesson will guide you through ${prompt}. We'll break down the concepts step by step, with practice activities to reinforce your understanding.

Each step builds on the previous one, so take your time to understand each concept before moving forward. You'll have opportunities to apply what you learn through interactive exercises.

Let's begin by exploring the fundamental concepts, then we'll practice applying them in real scenarios.`;
    }
    const base = rawText.trim() ||
        `Let's work through ${prompt} step by step. We'll explore the key concepts with detailed explanations and examples, then practice applying them through interactive activities. Each step builds on what you've learned.`;
    return ensureTwoSentences(base);
}
function buildFallbackTree(prompt, rawText) {
    const heading = prompt?.trim() || "Learn by Doing";
    const introContent = `Welcome to this interactive lesson on ${heading}. This lesson will guide you through the key concepts with explanations, examples, and hands-on practice activities.

We'll start with an introduction to the fundamental ideas, then explore them in detail with practical examples. You'll have multiple opportunities to test your understanding through interactive exercises.

Let's begin by establishing a foundation of the core concepts.`;
    const conceptContent = `Now that we've introduced the topic, let's dive deeper into the key concepts. Understanding these fundamentals is essential for mastering ${heading}.

We'll explore:
- The main principles and how they work
- Common patterns and best practices
- Real-world applications and examples
- How these concepts connect to what you already know

Pay attention to the examples as they'll help solidify your understanding.`;
    const practiceContent = `Let's apply what you've learned so far. Practice is essential for developing intuition and mastery of ${heading}.

In this section, you'll work through exercises that reinforce the concepts we've covered. Take your time, and don't worry about making mistakes—they're part of the learning process.

Ready to practice? Let's test your understanding with some interactive activities.`;
    const tree = {
        root: "container",
        elements: {
            container: {
                key: "container",
                type: "Stack",
                props: { direction: "vertical", gap: "lg" },
                children: ["step1", "step2", "quiz1", "step3", "practice"],
            },
            step1: {
                key: "step1",
                type: "Stack",
                props: { direction: "vertical", gap: "md" },
                children: ["title1", "intro"],
            },
            title1: {
                key: "title1",
                type: "Heading",
                props: { text: `Introduction to ${heading}`, level: 2 },
            },
            intro: {
                key: "intro",
                type: "Markdown",
                props: { content: introContent },
            },
            step2: {
                key: "step2",
                type: "Stack",
                props: { direction: "vertical", gap: "md" },
                children: ["title2", "concepts"],
            },
            title2: {
                key: "title2",
                type: "Heading",
                props: { text: "Key Concepts", level: 2 },
            },
            concepts: {
                key: "concepts",
                type: "Markdown",
                props: { content: conceptContent },
            },
            quiz1: {
                key: "quiz1",
                type: "TrueFalse",
                props: {
                    statement: `I understand the fundamental concepts of ${heading} and am ready to practice applying them.`,
                    correctAnswer: true,
                    explanation: "Great! Understanding the concepts is the first step. Let's move on to practice activities.",
                    showFeedback: true
                },
            },
            step3: {
                key: "step3",
                type: "Stack",
                props: { direction: "vertical", gap: "md" },
                children: ["title3", "practiceIntro"],
            },
            title3: {
                key: "title3",
                type: "Heading",
                props: { text: "Practice & Application", level: 2 },
            },
            practiceIntro: {
                key: "practiceIntro",
                type: "Markdown",
                props: { content: practiceContent },
            },
            practice: {
                key: "practice",
                type: "MultipleChoice",
                props: {
                    question: `Which of the following best describes a key aspect of ${heading}?`,
                    options: [
                        { id: "a", label: "It requires deep understanding of core concepts" },
                        { id: "b", label: "It can be mastered with a single example" },
                        { id: "c", label: "It has no practical applications" },
                    ],
                    correctOptionId: "a",
                    showFeedback: true,
                    misconceptions: {
                        b: "While examples help, true mastery requires understanding multiple perspectives and applications.",
                        c: "This topic has numerous real-world applications across various domains."
                    }
                },
            },
        },
    };
    const streamLines = [
        JSON.stringify({ op: "set", path: "/root", value: "container" }),
        JSON.stringify({ op: "add", path: "/elements/container", value: tree.elements.container }),
        JSON.stringify({ op: "add", path: "/elements/step1", value: tree.elements.step1 }),
        JSON.stringify({ op: "add", path: "/elements/title1", value: tree.elements.title1 }),
        JSON.stringify({ op: "add", path: "/elements/intro", value: tree.elements.intro }),
        JSON.stringify({ op: "add", path: "/elements/step2", value: tree.elements.step2 }),
        JSON.stringify({ op: "add", path: "/elements/title2", value: tree.elements.title2 }),
        JSON.stringify({ op: "add", path: "/elements/concepts", value: tree.elements.concepts }),
        JSON.stringify({ op: "add", path: "/elements/quiz1", value: tree.elements.quiz1 }),
        JSON.stringify({ op: "add", path: "/elements/step3", value: tree.elements.step3 }),
        JSON.stringify({ op: "add", path: "/elements/title3", value: tree.elements.title3 }),
        JSON.stringify({ op: "add", path: "/elements/practiceIntro", value: tree.elements.practiceIntro }),
        JSON.stringify({ op: "add", path: "/elements/practice", value: tree.elements.practice }),
    ];
    return { tree, streamLines };
}
function validateTreeContent(tree) {
    if (!tree.root || !tree.elements[tree.root]) {
        return { valid: false, reason: "Missing root element" };
    }
    const elements = tree.elements;
    let hasSubstantiveContent = false;
    let emptySteps = [];
    const rootElement = elements[tree.root];
    const rootChildren = Array.isArray(rootElement?.children)
        ? rootElement.children
        : [];
    const interactiveTypes = new Set([
        "MultipleChoice",
        "FillInTheBlank",
        "CodeFill",
        "TrueFalse",
        "Matching",
        "OrderSteps",
        "DragDrop",
        "ShortAnswer",
        "NumericInput",
        "DiagramSelection",
    ]);
    const elementHasBodyText = (element) => {
        if (!element)
            return false;
        if (element.type === "Markdown") {
            return (element.props?.content?.length || 0) >= 50;
        }
        if (element.type === "Text") {
            return (element.props?.content?.length || 0) >= 30;
        }
        if (element.type === "Stack" || element.type === "Card") {
            const children = Array.isArray(element.children) ? element.children : [];
            return children.some((childKey) => {
                const child = elements[childKey];
                if (!child)
                    return false;
                if (interactiveTypes.has(child.type))
                    return true;
                if (child.type === "Markdown")
                    return (child.props?.content?.length || 0) >= 50;
                if (child.type === "Text")
                    return (child.props?.content?.length || 0) >= 30;
                return false;
            });
        }
        return false;
    };
    const isCompletableStepElement = (element) => {
        if (!element)
            return false;
        if (interactiveTypes.has(element.type))
            return true;
        return elementHasBodyText(element);
    };
    const isIntroTextOnlyElement = (key) => {
        const element = elements[key];
        if (!element)
            return false;
        if (element.type === "Text" || element.type === "Markdown" || element.type === "Heading") {
            return true;
        }
        if (element.type === "Stack" || element.type === "Card") {
            const children = Array.isArray(element.children) ? element.children : [];
            if (children.length === 0)
                return false;
            return children.every((childKey) => {
                const child = elements[childKey];
                return child?.type === "Text" || child?.type === "Markdown" || child?.type === "Heading";
            });
        }
        return false;
    };
    // Structural guard: root children must all resolve to real elements.
    if (rootChildren.length > 0) {
        const missingRootChildren = rootChildren.filter((childKey) => !elements[childKey]);
        if (missingRootChildren.length > 0) {
            return {
                valid: false,
                reason: `Root has missing child references: ${missingRootChildren.slice(0, 3).join(", ")}`,
            };
        }
    }
    // Step-by-step guard: final step must be completable (prevents dead-end empty last step).
    if (rootChildren.length > 0) {
        const introChildren = [];
        for (const childKey of rootChildren) {
            if (isIntroTextOnlyElement(childKey)) {
                introChildren.push(childKey);
            }
            else {
                break;
            }
        }
        const stepChildren = rootChildren.slice(introChildren.length);
        if (stepChildren.length === 0) {
            return { valid: false, reason: "No step children found after intro content" };
        }
        for (let i = 0; i < stepChildren.length; i += 1) {
            const stepKey = stepChildren[i];
            const stepElement = elements[stepKey];
            if (!isCompletableStepElement(stepElement)) {
                return {
                    valid: false,
                    reason: `Step ${i + 1} (${stepKey}) is not completable (no body text or interactive widget)`,
                };
            }
        }
        const lastStepKey = stepChildren[stepChildren.length - 1];
        const lastStepElement = elements[lastStepKey];
        if (!isCompletableStepElement(lastStepElement)) {
            return {
                valid: false,
                reason: `Final step ${lastStepKey} is empty or non-completable`,
            };
        }
    }
    // Check each element for content quality
    for (const [key, element] of Object.entries(elements)) {
        // Validate FillInTheBlank components
        if (element.type === 'FillInTheBlank') {
            const description = element.props?.description || '';
            const wordBank = element.props?.wordBank || [];
            const blanks = element.props?.blanks || [];
            const textTemplate = element.props?.textTemplate || '';
            if (description.length < 50) {
                emptySteps.push(`${key} (FillInTheBlank missing proper description: ${description.length} chars)`);
            }
            if (wordBank.length === 0) {
                emptySteps.push(`${key} (FillInTheBlank missing wordBank)`);
            }
            if (blanks.length === 0) {
                emptySteps.push(`${key} (FillInTheBlank has no blanks)`);
            }
            // Check for markdown table syntax in textTemplate (not supported)
            if (textTemplate.includes('|') && textTemplate.includes('---')) {
                emptySteps.push(`${key} (FillInTheBlank has markdown table in textTemplate - use Stack → [Markdown, FillInTheBlank] instead)`);
                console.warn(`[Validation] FillInTheBlank "${key}" contains table syntax in textTemplate - tables won't render in plain text`);
            }
            // Validate that all correctAnswers exist in wordBank
            const allCorrectAnswers = blanks.flatMap((blank) => blank.correctAnswers || []);
            const missingAnswers = allCorrectAnswers.filter((answer) => !wordBank.includes(answer));
            if (missingAnswers.length > 0) {
                emptySteps.push(`${key} (FillInTheBlank: wordBank missing correct answers: ${missingAnswers.join(', ')})`);
                console.warn(`[Validation] FillInTheBlank "${key}" is missing answers in wordBank:`, missingAnswers);
            }
            // Validate distractor count in wordBank (wrong but plausible choices)
            const uniqueCorrectAnswers = new Set(allCorrectAnswers);
            const distractorCount = wordBank.filter((word) => !uniqueCorrectAnswers.has(word)).length;
            if (distractorCount < 2) {
                emptySteps.push(`${key} (FillInTheBlank: wordBank needs at least 2 distractors, found ${distractorCount})`);
                console.warn(`[Validation] FillInTheBlank "${key}" needs more distractors. Found: ${distractorCount}`);
            }
            // Validate that textTemplate has placeholder for each blank
            const blankPattern = /{{blank_\d+}}/g;
            const templateBlanks = textTemplate.match(blankPattern) || [];
            if (templateBlanks.length !== blanks.length) {
                emptySteps.push(`${key} (FillInTheBlank: template has ${templateBlanks.length} blanks but ${blanks.length} defined)`);
            }
            hasSubstantiveContent = true;
            continue;
        }
        // Validate CodeFill components
        if (element.type === 'CodeFill') {
            const gaps = element.props?.gaps || [];
            const options = element.props?.options || [];
            const codeTemplate = element.props?.codeTemplate || '';
            if (gaps.length === 0) {
                emptySteps.push(`${key} (CodeFill has no gaps)`);
            }
            if (options.length === 0) {
                emptySteps.push(`${key} (CodeFill has no options)`);
            }
            // Validate that all expectedIds exist in options
            const optionIds = new Set(options.map((opt) => opt.id));
            const missingOptions = gaps.filter((gap) => !optionIds.has(gap.expectedId));
            if (missingOptions.length > 0) {
                const missingIds = missingOptions.map((g) => g.expectedId).join(', ');
                emptySteps.push(`${key} (CodeFill: options missing IDs for gaps: ${missingIds})`);
                console.warn(`[Validation] CodeFill "${key}" is missing option IDs:`, missingIds);
            }
            // Validate distractor options for challenge quality
            const expectedIds = new Set(gaps.map((gap) => gap.expectedId));
            const distractorCount = options.filter((opt) => !expectedIds.has(opt.id)).length;
            if (distractorCount < 2) {
                emptySteps.push(`${key} (CodeFill: needs at least 2 distractor options, found ${distractorCount})`);
                console.warn(`[Validation] CodeFill "${key}" needs more distractor options. Found: ${distractorCount}`);
            }
            // Validate that codeTemplate has placeholder for each gap
            const gapPattern = /{{gap_\d+}}/g;
            const templateGaps = codeTemplate.match(gapPattern) || [];
            if (templateGaps.length !== gaps.length) {
                emptySteps.push(`${key} (CodeFill: template has ${templateGaps.length} gaps but ${gaps.length} defined)`);
            }
            hasSubstantiveContent = true;
            continue;
        }
        // Validate Matching components
        if (element.type === 'Matching') {
            const leftItems = element.props?.leftItems || [];
            const rightItems = element.props?.rightItems || [];
            const shuffleRight = element.props?.shuffleRight;
            if (leftItems.length === 0 || rightItems.length === 0) {
                emptySteps.push(`${key} (Matching has no items)`);
            }
            else {
                // Check if any left IDs have matching right IDs
                const leftIds = new Set(leftItems.map((item) => item.id));
                const rightIds = new Set(rightItems.map((item) => item.id));
                const matchingIds = [...leftIds].filter(id => rightIds.has(id));
                if (matchingIds.length === 0) {
                    emptySteps.push(`${key} (Matching has ZERO valid pairs - no matching IDs between left and right items)`);
                    console.warn(`[Validation] Matching component "${key}" has mismatched IDs:`);
                    console.warn(`  Left IDs: ${[...leftIds].join(', ')}`);
                    console.warn(`  Right IDs: ${[...rightIds].join(', ')}`);
                }
                // Check if right items are positionally aligned with left items (too easy)
                const comparableLength = Math.min(leftItems.length, rightItems.length);
                const alignedCount = Array.from({ length: comparableLength }).filter((_, idx) => leftItems[idx]?.id === rightItems[idx]?.id).length;
                if (comparableLength > 1 && alignedCount === comparableLength) {
                    emptySteps.push(`${key} (Matching rightItems are in same positional order as leftItems - too easy)`);
                    console.warn(`[Validation] Matching component "${key}" has same-row alignment for all pairs; reorder rightItems`);
                }
                // Check if shuffleRight is enabled
                if (shuffleRight !== true) {
                    emptySteps.push(`${key} (Matching missing shuffleRight:true - answers will appear in same order!)`);
                    console.warn(`[Validation] Matching component "${key}" should set shuffleRight:true to randomize items`);
                }
            }
            hasSubstantiveContent = true;
            continue;
        }
        // Interactive components count as substantive
        if (interactiveTypes.has(element.type)) {
            hasSubstantiveContent = true;
            continue;
        }
        // Check for Markdown with actual content
        if (element.type === 'Markdown') {
            const content = element.props?.content || '';
            if (content.length > 100) { // At least 100 chars for substantive content
                hasSubstantiveContent = true;
            }
            else if (content.length < 50) {
                emptySteps.push(`${key} (Markdown with only ${content.length} chars)`);
            }
            continue;
        }
        // Check for steps that are only headings (Stack with just a Heading child)
        if (element.type === 'Stack' && element.children) {
            const children = element.children;
            const childElements = children.map(childKey => elements[childKey]).filter(Boolean);
            // If Stack only has a Heading and nothing else substantive
            const hasOnlyHeading = childElements.length === 1 && childElements[0]?.type === 'Heading';
            const hasHeadingWithEmptyContent = childElements.length === 2 &&
                childElements.some(c => c?.type === 'Heading') &&
                childElements.some(c => c?.type === 'Markdown' && (c.props?.content?.length || 0) < 50);
            // Check if Stack has no children or all children are missing
            const hasNoRealChildren = childElements.length === 0 || children.some(childKey => !elements[childKey]);
            if (hasOnlyHeading || hasHeadingWithEmptyContent || hasNoRealChildren) {
                emptySteps.push(`${key} (heading-only, insufficient content, or missing children)`);
            }
        }
        // Check for elements that have no type (broken)
        if (!element.type) {
            emptySteps.push(`${key} (missing type - broken element)`);
        }
    }
    if (!hasSubstantiveContent) {
        return { valid: false, reason: "No substantive content found" };
    }
    if (emptySteps.length > 3) {
        return { valid: false, reason: `Too many empty/minimal steps: ${emptySteps.length}` };
    }
    // Log all empty steps for debugging
    if (emptySteps.length > 0) {
        console.warn(`[Validation] Found ${emptySteps.length} empty/minimal steps:`, emptySteps);
    }
    // Should have at least 5 elements for a proper lesson
    if (Object.keys(elements).length < 5) {
        return { valid: false, reason: `Only ${Object.keys(elements).length} elements (need at least 5)` };
    }
    return { valid: true };
}
async function generateLearnByDoingTree(prompt) {
    const text = await generateLearnByDoingText(prompt);
    const lines = text.split("\n").filter((line) => line.trim().length > 0);
    let currentTree = { root: "", elements: {} };
    let validPatchCount = 0;
    let invalidLines = [];
    for (const line of lines) {
        const patch = parsePatchLine(line);
        if (patch) {
            currentTree = applyPatch(currentTree, patch);
            validPatchCount++;
        }
        else if (line.trim() && !line.trim().startsWith("//")) {
            invalidLines.push(line);
        }
    }
    // Count actual elements (exclude root)
    const elementCount = Object.keys(currentTree.elements).length;
    // Basic validation: check structure
    if (!currentTree.root || validPatchCount < 3 || elementCount < 2) {
        console.warn(`[Learn-by-Doing] Generated insufficient content (${validPatchCount} patches, ${elementCount} elements). Using enhanced fallback.`);
        console.warn(`[Learn-by-Doing] Prompt length: ${prompt.length} chars`);
        if (invalidLines.length > 0) {
            console.warn(`[Learn-by-Doing] Invalid lines detected: ${invalidLines.length}`);
            console.warn(`[Learn-by-Doing] First invalid line: ${invalidLines[0].slice(0, 200)}`);
        }
        return buildFallbackTree(prompt, text);
    }
    // Deep validation: check content quality
    const validation = validateTreeContent(currentTree);
    if (!validation.valid) {
        console.warn(`[Learn-by-Doing] Content validation failed: ${validation.reason}. Using enhanced fallback.`);
        console.warn(`[Learn-by-Doing] Generated ${elementCount} elements but content is insufficient.`);
        return buildFallbackTree(prompt, text);
    }
    console.log(`[Learn-by-Doing] Successfully generated tree with ${elementCount} elements (validated)`);
    return { tree: currentTree, streamLines: lines };
}
async function POST(req) {
    const { prompt } = await req.json();
    const sanitizedPrompt = sanitizeLearnByDoingPrompt(prompt);
    const generated = await generateLearnByDoingTree(sanitizedPrompt);
    const text = generated.streamLines.join("\n");
    return new Response(text, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
        },
    });
}
