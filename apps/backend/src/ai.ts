import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface OnboardingRecommendations {
  recommendations: Array<{
    title: string;
    summary: string;
    rationale: string;
    difficulty: string;
    estimated_hours?: number;
    suggested_formats?: string[];
  }>;
  suggested_learning_style?: string;
  raw: string;
}

export interface CourseOutlineRequest {
  course: {
    title: string;
    summary?: string;
    goals?: string[];
    prerequisites?: string[];
    level?: string;
    formatPreferences?: string[];
  };
  audienceProfile?: string;
  modulesCount?: number;
}

export interface CourseOutlineResponse {
  course?: {
    title: string;
    overview: string;
    level: string;
    duration_hours?: number;
    modules: Array<{
      title: string;
      objective: string;
      key_topics: string[];
      practice_ideas: string[];
      assessment: string;
      duration_hours?: number;
    }>;
  };
  raw: string;
}

export interface AssistantReply {
  reply: string;
  raw: string;
}

export interface TopicRecommendation {
  name: string;
  category: string;
  confidence: string;
  progress?: number;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// Ollama configuration (only available in development)
const USE_OLLAMA = process.env.USE_OLLAMA === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

let openai: OpenAI | null = null;

// Validation: Ensure Ollama is only used in development
if (USE_OLLAMA && NODE_ENV === 'production') {
  throw new Error('Ollama models are not allowed in production. Set USE_OLLAMA=false or change NODE_ENV.');
}

const baseSystemInstruction =
  'You are **Lyceum**, an education-focused AI assistant designed to support deep understanding, not superficial answers. ' +
  'Your role is to guide learners toward conceptual mastery through clear explanations, structured reasoning, and purposeful practice. ' +

  '## Communication Style\n' +
  '- Be **concise, precise, and actionable**. Avoid filler, fluff, motivational clichés, or conversational padding.\n' +
  '- Prefer clarity over verbosity. Every sentence should contribute meaningfully to understanding.\n' +
  '- Use a professional, instructional tone aligned with serious academic learning.\n' +

  '## Markdown & Formatting Rules\n' +
  '- Always use **rich Markdown structure**.\n' +
  '- Use `#`, `##`, and `###` for clear hierarchical headings.\n' +
  '- Use short paragraphs (2–4 sentences max).\n' +
  '- Use bullet points or numbered lists where structure improves comprehension.\n' +
  '- Use `**bold**` for key terms, definitions, and emphasis.\n' +
  '- Use `*italic*` for secondary emphasis, nuance, or contrast.\n' +
  '- Never present dense, unstructured text blocks.\n' +

  '## Code Formatting (CRITICAL - READ CAREFULLY)\n' +
  '**INLINE CODE (single backticks)** - Use for:\n' +
  '- Keywords: `for`, `while`, `if`, `class`, `return`\n' +
  '- Variable/function names: `myVariable`, `calculateSum()`, `getUserData()`\n' +
  '- Single expressions: `i = 0`, `i < 10`, `i++`\n' +
  '- Syntax patterns: `for (initialization; condition; update)`\n' +
  '- File names, class names, technical terms mentioned in text\n' +
  '- ANY code that appears within a sentence or paragraph\n' +
  '\n' +
  '**BLOCK CODE (triple backticks)** - ONLY use for:\n' +
  '- Complete, multi-line working code examples\n' +
  '- Full function/class implementations\n' +
  '- Code that should be copied and run\n' +
  '- Use explicit language tags: ```python, ```javascript, ```java\n' +
  '\n' +
  '**NEVER DO THIS:**\n' +
  '- ❌ ```\\nfor\\n``` or ```java\\nfor\\n``` for single keywords\n' +
  '- ❌ ```\\ntrue\\n``` for boolean values\n' +
  '- ❌ ```\\ni++\\n``` for single expressions\n' +
  '\n' +
  '**CORRECT EXAMPLES:**\n' +
  '- ✓ "The `for` loop iterates..."\n' +
  '- ✓ "Initialize with `int i = 0`"\n' +
  '- ✓ "The `condition` is checked..."\n' +
  '- ✓ "Use `i++` to increment"\n' +
  
  '## Mathematical Notation (STRICT REQUIREMENT)\n' +
  'IMPORTANT: **All mathematical expressions, symbols, equations, and notation must be written in LaTeX. No exceptions.**\n' +
  '- Inline math must use single dollar signs: $x^2 + y^2$, $\\frac{dy}{dx}$, $\\partial f / \\partial x$.\n' +
  '- Display (centered) equations must use double dollar signs:\n' +
  '  $$\\sum_{i=1}^{n} x_i$$\n' +
  '  $$\\int_0^1 f(x)\\,dx$$\n' +
  '- Use LaTeX for:\n' +
  '  - Greek letters: $\\alpha$, $\\beta$, $\\lambda$\n' +
  '  - Derivatives: $\\frac{d}{dx}$, $\\frac{\\partial}{\\partial x}$\n' +
  '  - Summations and products: $\\sum$, $\\prod$\n' +
  '  - Vectors, matrices, limits, logic symbols, and all formal math notation.\n' +
    '- Never mix plaintext math with LaTeX.\n' +
  'For math topics: explain concepts clearly using proper LaTeX notation (wrap all math in $...$ or $$...$$). ' +
  'When teaching mathematical or visual concepts ("teach me about X", "explain X", "what is X"), focus on conceptual understanding with interactive visuals. ' +
  'Only provide code/implementation when explicitly requested ("how to code X", "implement X in Python").\n\n' +
  '## Pedagogical Priorities\n' +
  '- When teaching **mathematics or technical concepts**, prioritize:\n' +
  '  1. Conceptual explanation\n' +
  '  2. Intuition and reasoning\n' +
  '  3. Formal definitions and structure\n' +
  '  4. Examples only after understanding is established\n' +
    '- Do **not** jump directly to answers without explaining the underlying idea.\n' +
  '- Avoid “answer-first” behavior unless explicitly requested.\n\n' +
  '## Learning Plans & Guidance\n' +
  '- When creating learning plans, modules, or study paths:\n' +
  '  - Clearly define **learning outcomes**.\n' +
  '  - Specify **expected duration** or pacing.\n' +
  '  - Provide concrete **next steps** for the learner.\n' +
  '- Learning content should encourage active thinking, reflection, and application.\n' +
  '- **Next steps** for conceptual learning should be CONCEPTUAL (explore related concepts, try different parameters in the interactive visualization, consider edge cases).\n' +
  '- ONLY provide programming/implementation "next steps" when the user explicitly asks about coding/implementation.\n\n' +
  '## AI Role Constraints\n' +
  '- Act as a **guide and co-reasoner**, not a shortcut or answer engine.\n' +
  '- Encourage learners to articulate their thinking when appropriate.\n' +
  '- Correct misconceptions explicitly and constructively.\n' +
  '- Do not fabricate facts, definitions, or sources.\n' +

  'Your goal is to help learners think clearly, reason correctly, and build durable understanding.';


const ensureClient = () => {
  if (USE_OLLAMA) {
    // Use Ollama (development only)
    if (!openai) {
      console.log(`Using Ollama model: ${OLLAMA_MODEL} at ${OLLAMA_BASE_URL}`);
      openai = new OpenAI({
        baseURL: OLLAMA_BASE_URL,
        apiKey: 'ollama', // Ollama doesn't require a real API key
      });
    }
    return openai;
  }

  // Use OpenAI (production or when USE_OLLAMA=false)
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

export const generateOnboardingRecommendations = async (
  onboardingData: unknown,
): Promise<OnboardingRecommendations> => {
  const prompt = [
    'You are a course curator for Lyceum. Use onboarding inputs to suggest exactly 6 course recommendations.',
    'Return JSON with shape:',
    '{',
    '  "recommendations": [',
    '    {',
    '      "title": string,',
    '      "summary": string,',
    '      "rationale": string,',
    '      "difficulty": "beginner" | "intermediate" | "advanced",',
    '      "estimated_hours": number,',
    '      "suggested_formats": string[]',
    '    }',
    '  ],',
    '  "suggested_learning_style": string',
    '}',
    'Return exactly 6 recommendations.',
    'Avoid markdown. Keep summaries short but specific.',
    '',
    'Onboarding data:',
    JSON.stringify(onboardingData, null, 2),
  ].join('\n');

  const client = ensureClient();
  const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: baseSystemInstruction },
      { role: 'user', content: prompt },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() || '';
  const parsed = tryParseJson<OnboardingRecommendations>(text);

  return {
    recommendations: parsed?.recommendations || [],
    suggested_learning_style: parsed?.suggested_learning_style,
    raw: text,
  };
};

export const generateTopicRecommendations = async (
  onboardingData: unknown,
): Promise<TopicRecommendation[]> => {
  const prompt = [
    'You are a topic recommender for Lyceum. Provide 6 concise topics with categories and confidence notes.',
    'Based on the onboarding data, return 6 recommended topics.',
    'Respond with JSON only, shape:',
    '{ "topics": [ { "name": string, "category": string, "confidence": string } ] }',
    'Avoid markdown. Keep names <= 60 chars.',
    '',
    'Onboarding data:',
    JSON.stringify(onboardingData, null, 2),
  ].join('\n');

  const client = ensureClient();
  const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: baseSystemInstruction },
      { role: 'user', content: prompt },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() || '';
  const parsed = tryParseJson<{ topics: TopicRecommendation[] }>(text);

  return parsed?.topics || [];
};

export const generateCourseOutline = async (
  payload: CourseOutlineRequest,
): Promise<CourseOutlineResponse> => {
  const { course, audienceProfile, modulesCount = 5 } = payload;

  const prompt = [
    'Create a concise course outline.',
    `Course title: ${course.title}`,
    course.summary ? `Summary: ${course.summary}` : '',
    course.goals?.length ? `Goals: ${course.goals.join('; ')}` : '',
    course.prerequisites?.length ? `Prerequisites: ${course.prerequisites.join('; ')}` : '',
    course.level ? `Level: ${course.level}` : '',
    course.formatPreferences?.length
      ? `Preferred formats: ${course.formatPreferences.join('; ')}`
      : '',
    audienceProfile ? `Audience profile: ${audienceProfile}` : '',
    '',
    `Aim for ${modulesCount} modules unless the content clearly needs fewer.`,
    'Respond with JSON only, shape:',
    '{',
    '  "course": {',
    '    "title": string,',
    '    "overview": string,',
    '    "level": string,',
    '    "duration_hours": number,',
    '    "modules": [',
    '      {',
    '        "title": string,',
    '        "objective": string,',
    '        "key_topics": string[],',
    '        "practice_ideas": string[],',
    '        "assessment": string,',
    '        "duration_hours": number',
    '      }',
    '    ]',
    '  }',
    '}',
    'Keep topic names short (<= 60 chars) and avoid markdown.',
  ]
    .filter(Boolean)
    .join('\n');

  const client = ensureClient();
  const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: baseSystemInstruction },
      { role: 'user', content: prompt },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() || '';
  const parsed = tryParseJson<CourseOutlineResponse>(text);

  return {
    course: parsed?.course,
    raw: text,
  };
};

type AssistantChatOptions = {
  context?: string;
  systemPrompt?: string;
};

export const runAssistantChat = async (
  messages: ChatMessage[],
  options: AssistantChatOptions = {},
): Promise<AssistantReply> => {
  const systemPrompt = options.systemPrompt
    ? `${options.systemPrompt}\n\n${baseSystemInstruction}`
    : baseSystemInstruction;

  const client = ensureClient();

  const chatMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...(options.context ? [{ role: 'system', content: `Context: ${options.context}` }] : []),
    ...messages.map((m) => ({ role: m.role, content: m.content } as ChatCompletionMessageParam)),
  ];

  const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;
  const completion = await client.chat.completions.create({
    model,
    messages: chatMessages,
  });

  const text = completion.choices[0]?.message?.content?.trim() || '';

  return { reply: text, raw: text };
};

export const runAssistantChatStream = async (
  messages: ChatMessage[],
  options: AssistantChatOptions = {},
): Promise<AsyncGenerator<string>> => {
  const systemPrompt = options.systemPrompt
    ? `${options.systemPrompt}\n\n${baseSystemInstruction}`
    : baseSystemInstruction;

  const client = ensureClient();

  const chatMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...(options.context ? [{ role: 'system', content: `Context: ${options.context}` }] : []),
    ...messages.map((m) => ({ role: m.role, content: m.content } as ChatCompletionMessageParam)),
  ];

  const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;
  const stream = await client.chat.completions.create({
    model,
    messages: chatMessages,
    stream: true,
  });

  async function* generator() {
    for await (const part of stream) {
      const delta = part.choices?.[0]?.delta?.content;
      if (!delta) continue;
      if (typeof delta === 'string') {
        yield delta;
      } else if (Array.isArray(delta)) {
        const text = delta
          .map((d) => (typeof d === 'string' ? d : (d as any).text || ''))
          .join('');
        if (text) yield text;
      }
    }
  }

  return generator();
};

export const generateChatTitle = async (userMessage: string, assistantReply: string): Promise<string> => {
  const client = ensureClient();
  
  const systemPrompt = 
    'You are a concise title generator. Generate a brief, descriptive title (3-5 words max) for a conversation based on the user\'s first question and the assistant\'s response. ' +
    'The title should be a conceptual summary, not just a repetition of the user\'s question. ' +
    'Return ONLY the title text, nothing else. No quotes, no punctuation at the end, no extra formatting.';

  const userPrompt = 
    `User's question: ${userMessage}\n\n` +
    `Assistant's response: ${assistantReply.slice(0, 1000)}\n\n` +
    `Generate a short, descriptive title for this conversation:`;

  try {
    const model = USE_OLLAMA ? OLLAMA_MODEL : OPENAI_MODEL;
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 20,
    });

    const title = completion.choices[0]?.message?.content?.trim();
    if (!title || title.length === 0) return 'New chat';
    
    // Clean up the title: remove quotes, trailing punctuation, and "Title: " prefix
    const cleanedTitle = title
      .replace(/^(Title|Topic|Conversation):\s*/i, '')
      .replace(/^["']|["']$/g, '')
      .replace(/[.!?]$/, '')
      .trim();

    return cleanedTitle.length > 0 ? cleanedTitle.slice(0, 60) : 'New chat';
  } catch (error) {
    console.error('Error generating chat title:', error);
    return 'New chat';
  }
};
