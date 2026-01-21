import OpenAI from "openai";

export const maxDuration = 30;

type UITree = {
  root: string;
  elements: Record<string, any>;
};

type JsonPatch = {
  op: "set" | "add" | "replace" | "remove";
  path: string;
  value?: any;
};

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
- Markdown: { content: string } - Rich text using Markdown (supports lists, tables, code, math, and custom <Visual>, <Chart> tags)

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
- CodeFill: { title?: string, description?: string, codeTemplate?: string, gaps?: Array<{ id: string, expectedId: string }>, options?: Array<{ id: string, label: string, type?: string }>, scenarios?: Array<{ id: string, title?: string, description?: string, codeTemplate: string, gaps: Array<{ id: string, expectedId: string }>, options: Array<{ id: string, label: string, type?: string }> }>, showHeader?: boolean, showOptions?: boolean, showControls?: boolean, showScenarioNavigation?: boolean } - Drag-and-drop code fill activity with optional scenario navigation
- FillInTheBlank: { title?: string, description?: string, textTemplate: string, blanks: Array<{ id: string, correctAnswers: string[], placeholder?: string, hint?: string }>, wordBank?: string[], caseSensitive?: boolean } - Drag-and-drop fill-in-the-blank activity
- NumericInput: { label?: string, placeholder?: string, unit?: string, correctAnswer: number, allowScientific?: boolean, tolerance?: number, range?: [number, number], showFeedback?: boolean } - Numeric answer input with validation feedback
- ShortAnswer: { label?: string, description?: string, question?: string, placeholder?: string, maxLength?: number, rows?: number, showCounter?: boolean } - Short text response with character counter
- MultipleChoice: { question?: string, options?: Array<{ id: string, label: string }>, correctOptionId?: string, correctOptionIds?: string[], minSelections?: number, misconceptions?: Record<string, string>, shuffle?: boolean, showFeedback?: boolean, questions?: Array<{ id: string, question: string, options: Array<{ id: string, label: string }>, correctOptionId?: string, correctOptionIds?: string[], minSelections?: number, misconceptions?: Record<string, string> }> } - Multiple-choice question with feedback (single or multiple)
- TrueFalse: { statement: string, correctAnswer: boolean, explanation?: string, requireConfidence?: boolean, showFeedback?: boolean } - True/False question with optional confidence check
- Matching: { leftItems: Array<{ id: string, label: string }>, rightItems: Array<{ id: string, label: string }>, shuffleRight?: boolean, title?: string, description?: string, showProgress?: boolean } - Match items from left to right by clicking
- OrderSteps: { items: Array<{ id: string, label: string }>, correctOrder?: string[], explanation?: string, title?: string, description?: string, shuffleOnReset?: boolean, showStatus?: boolean, showFeedback?: boolean } - Reorder steps by dragging to the correct sequence
- DragDrop: { title?: string, description?: string, categories: Array<{ id: string, label: string }>, items: Array<{ id: string, label: string, correctCategoryId?: string }>, showStatus?: boolean, showFeedback?: boolean } - Drag items into categories
- DiagramSelection: { title?: string, description?: string, imagePath?: string, diagramType?: "default"|"image"|"d3", d3Diagram?: { nodes: Array<{ id: string, label?: string, x?: number, y?: number }>, links?: Array<{ source: string, target: string }> }, width?: number, height?: number, regions: Array<{ id: string, label?: string, x: number, y: number, width: number, height: number, borderRadius?: string | number }>, multiSelect?: boolean, showLabels?: boolean } - Select regions on a diagram image or D3 diagram
- EquationBuilder: { tokens?: string[], slots?: number, showPreview?: boolean, allowCopy?: boolean } - Build a LaTeX equation from tokens with validation (tokens and slots are configurable)

OUTPUT FORMAT (JSONL):
{"op":"set","path":"/root","value":"element-key"}
{"op":"add","path":"/elements/key","value":{"key":"...","type":"...","props":{...},"children":[...]}}

NEVER return a full JSON tree object like {"root":...,"elements":...}. Only JSONL patch lines are allowed.

ALL COMPONENTS support: className?: string[] - array of Tailwind classes for custom styling

RULES:
1. First line sets /root to root element key
2. ALWAYS add the root element with /elements/{rootKey} (never return only /root)
3. Add elements with /elements/{key}
4. Children array contains string keys, not objects
5. Parent first, then children
6. Each element needs: key, type, props
7. Use className for custom Tailwind styling when needed
7a. Prefer Markdown for teaching text, explanations, hints, and multi-paragraph content. Use Text only for short labels.
8. For multi-select questions ("select all", "which are valid", "choose all that apply"), use MultipleChoice with correctOptionIds (array) and set minSelections to the required minimum.
9. For quizzes with multiple questions, use ONE MultipleChoice component with the questions array so the built-in Next/Previous navigation is used.
10. For Matching, a pair is correct only when leftItems[i].id equals rightItems[j].id. Use matching ids for correct pairs (labels can differ).
11. For DragDrop, every item.correctCategoryId must match one of the categories[].id values.
12. For DiagramSelection with D3, set diagramType:"d3" and provide d3Diagram.nodes (id, optional label, optional x/y) and links (source/target). If x/y omitted, a simple grid layout is used.
13. For DiagramSelection, prefer diagramType:"d3" by default; only use imagePath when the prompt explicitly mentions an image URL.
14. For equation-builder requests, use the EquationBuilder component and configure tokens/slots instead of composing a custom keypad layout.
15. Every response must contain at least one /elements/* line.

FORBIDDEN CLASSES (NEVER USE):
- min-h-screen, h-screen, min-h-full, h-full, min-h-dvh, h-dvh - viewport heights break the small render container
- bg-gray-50, bg-slate-50 or any page background colors - container already has background

MOBILE-FIRST RESPONSIVE:
- ALWAYS design mobile-first. Single column on mobile, expand on larger screens.
- Grid: Use columns:1 prop, add className:["sm:grid-cols-2"] or ["md:grid-cols-3"] for larger screens
- DO NOT put page headers/titles inside Card - use Stack with Heading directly
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

CodeFill Requirements:
- When using CodeFill, ALWAYS set showControls:true, showScenarioNavigation:true, showOptions:true, showFeedback:true, autoAdvance:true.
- Provide scenarios with at least 2 items so the Next button advances.

Lesson Structure Requirements:
- The goal is to test the user on the topic with hands-on activities.
- Provide enough steps to teach and assess thoroughly: at least 8 steps, mixing text steps with interactive checks.
- Include detailed text steps (explanations, hints, and guidance) between activities so the user understands before attempting the next task.
- Do NOT create steps that are only a heading. Every text-only step must include at least one Text element under the heading.
- For text-only teaching steps, use Heading/Text (or a Stack of them) directly. Do NOT wrap teaching text in a Card.
- Use Markdown for the teaching text blocks instead of Text when there is more than one sentence or any formatting (lists, code, math).
- If you include a Heading in a step, ALWAYS include a Markdown element in the same step with at least 2 full sentences of explanation or guidance.
- Teaching steps (text-only steps) MUST include a Markdown element with at least 2 full sentences of guidance or explanation.
- Use the Markdown component for explanations, examples, hints, and summaries. Markdown content should be detailed and instructional, not just a single sentence.
- Include lead-in steps that prepare the learner for hands-on work. Before each interactive step, add a short teaching step that frames the task, provides a hint, and shows a small example.
- Include at least 2 hands-on activities per module using interactive components (e.g., MultipleChoice, FillInTheBlank, CodeFill, OrderSteps, Matching).
- Include at least one step that uses Markdown with a code example (fenced code block) and at least one step that uses Markdown with a table.
- For every hands-on activity, ONLY reference concepts, terms, or examples that have already been introduced in earlier steps.
- Ensure there are enough steps for the learner to fully understand the concept, including recap and mastery checks; increase steps beyond the minimum if the topic needs it.

Benefits:
- Stops users from just scrolling through text.
- Encourages playing around with the concepts.
- Makes abstract ideas feel real and touchable.

Combined Vision:
Treat mistakes as learning moments, keep users focused and thinking, and create deep understanding, not just memorization.
`;

const MAX_PROMPT_LENGTH = 2000;
const DEFAULT_OPENAI_MODEL = "gpt-4o";
const DEFAULT_OLLAMA_MODEL = "llama3.2";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434/v1";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
const USE_OLLAMA = process.env.USE_OLLAMA === "true";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

let openai: OpenAI | null = null;

function normalizeOllamaBaseURL(url: string) {
  const trimmed = url.replace(/\/$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

function ensureClient() {
  if (USE_OLLAMA || OPENAI_MODEL.startsWith("gpt-oss:")) {
    if (!openai) {
      openai = new OpenAI({
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
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  }

  return openai;
}

function getModel() {
  if (USE_OLLAMA || OPENAI_MODEL.startsWith("gpt-oss:")) {
    return OLLAMA_MODEL;
  }

  return OPENAI_MODEL;
}

export function sanitizeLearnByDoingPrompt(prompt: unknown) {
  return String(prompt || "").slice(0, MAX_PROMPT_LENGTH);
}

export async function generateLearnByDoingText(prompt: string) {
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

function parsePatchLine(line: string): JsonPatch | null {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) return null;
    return JSON.parse(trimmed) as JsonPatch;
  } catch {
    return null;
  }
}

function setByPath(target: any, path: string, value: any) {
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
  } else {
    current[lastKey] = value;
  }
}

function applyPatch(tree: UITree, patch: JsonPatch): UITree {
  const newTree: UITree = { ...tree, elements: { ...tree.elements } };

  switch (patch.op) {
    case "set":
    case "add":
    case "replace": {
      if (patch.path === "/root") {
        newTree.root = patch.value as string;
        return newTree;
      }

      if (patch.path.startsWith("/elements/")) {
        const pathParts = patch.path.slice("/elements/".length).split("/");
        const elementKey = pathParts[0];
        if (!elementKey) return newTree;

        if (pathParts.length === 1) {
          newTree.elements[elementKey] = patch.value as any;
        } else {
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

function ensureTwoSentences(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const sentenceCount = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean).length;
  if (sentenceCount >= 2) return trimmed;
  return `${trimmed} This step prepares you for the next activity.`;
}

function buildFallbackContent(prompt: string, rawText: string) {
  const base = rawText.trim() ||
    `Let's work through ${prompt} step by step. Focus on the key idea, then continue to the next activity.`;
  return ensureTwoSentences(base);
}

function buildFallbackTree(prompt: string, rawText: string) {
  const heading = prompt?.trim() || "Learn by Doing";
  const content = buildFallbackContent(heading, rawText);
  const tree: UITree = {
    root: "step",
    elements: {
      step: {
        key: "step",
        type: "Stack",
        props: { direction: "vertical", gap: "md" },
        children: ["title", "body"],
      },
      title: {
        key: "title",
        type: "Heading",
        props: { text: heading, level: 2 },
      },
      body: {
        key: "body",
        type: "Markdown",
        props: { content },
      },
    },
  };

  const streamLines = [
    JSON.stringify({ op: "set", path: "/root", value: "step" }),
    JSON.stringify({ op: "add", path: "/elements/step", value: tree.elements.step }),
    JSON.stringify({ op: "add", path: "/elements/title", value: tree.elements.title }),
    JSON.stringify({ op: "add", path: "/elements/body", value: tree.elements.body }),
  ];

  return { tree, streamLines };
}

export async function generateLearnByDoingTree(prompt: string) {
  const text = await generateLearnByDoingText(prompt);
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  let currentTree: UITree = { root: "", elements: {} };

  for (const line of lines) {
    const patch = parsePatchLine(line);
    if (patch) {
      currentTree = applyPatch(currentTree, patch);
    }
  }

  if (!currentTree.root) {
    return buildFallbackTree(prompt, text);
  }

  return { tree: currentTree, streamLines: lines };
}

export async function POST(req: Request) {
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