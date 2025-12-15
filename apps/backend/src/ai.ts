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
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let openai: OpenAI | null = null;

const baseSystemInstruction =
  'You are Lyceum, an education-focused assistant. Provide concise, actionable responses and avoid fluff. ' +
  'Use rich Markdown structure: clear headings, short paragraphs, bullet/numbered lists, and bold/italic for emphasis. ' +
  'Wrap code in fenced blocks with language tags. Render inline math with $...$ and block math with $$...$$ when helpful. ' +
  'When creating learning plans, be specific about outcomes, duration, and next steps.';

const ensureClient = () => {
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
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
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
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
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
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
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

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
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

  const stream = await client.chat.completions.create({
    model: OPENAI_MODEL,
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
