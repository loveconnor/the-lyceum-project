import { GoogleGenerativeAI, type Content, type GenerativeModel } from '@google/generative-ai';

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

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

const baseSystemInstruction =
  'You are Lyceum, an education-focused assistant. Provide concise, actionable responses and avoid fluff. ' +
  'When creating learning plans, be specific about outcomes, duration, and next steps.';

const ensureClient = () => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  return genAI;
};

const getModel = (systemInstruction?: string): GenerativeModel => {
  const client = ensureClient();

  return client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemInstruction || baseSystemInstruction,
  });
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
  const model = getModel(
    'You are a course curator for Lyceum. Use onboarding inputs to suggest 3-5 course recommendations.',
  );

  const prompt = [
    'Use the onboarding inputs to propose concise course recommendations tailored to the learner.',
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
    'Avoid markdown. Keep summaries short but specific.',
    '',
    'Onboarding data:',
    JSON.stringify(onboardingData, null, 2),
  ].join('\n');

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
    },
  });

  const text = result.response.text().trim();
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
  const model = getModel(
    'You are a topic recommender for Lyceum. Provide 6 concise topics with categories and confidence notes.',
  );

  const prompt = [
    'Based on the onboarding data, return 6 recommended topics.',
    'Respond with JSON only, shape:',
    '{ "topics": [ { "name": string, "category": string, "confidence": string } ] }',
    'Avoid markdown. Keep names <= 60 chars.',
    '',
    'Onboarding data:',
    JSON.stringify(onboardingData, null, 2),
  ].join('\n');

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
    },
  });

  const text = result.response.text().trim();
  const parsed = tryParseJson<{ topics: TopicRecommendation[] }>(text);

  return parsed?.topics || [];
};

export const generateCourseOutline = async (
  payload: CourseOutlineRequest,
): Promise<CourseOutlineResponse> => {
  const { course, audienceProfile, modulesCount = 5 } = payload;

  const model = getModel(
    'You are an expert curriculum designer for Lyceum. Build tight outlines with measurable outcomes.',
  );

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

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.45,
      topP: 0.9,
    },
  });

  const text = result.response.text().trim();
  const parsed = tryParseJson<CourseOutlineResponse>(text);

  return {
    course: parsed?.course,
    raw: text,
  };
};

export const runAssistantChat = async (
  messages: ChatMessage[],
  context?: string,
): Promise<AssistantReply> => {
  const model = getModel(
    context
      ? `${baseSystemInstruction} Ground answers in the provided context.`
      : baseSystemInstruction,
  );

  const history: Content[] = messages.slice(0, -1).map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.role === 'system' ? `System: ${message.content}` : message.content }],
  }));

  const latest = messages[messages.length - 1];
  const chat = model.startChat({ history });

  const prompt = [context ? `Context: ${context}` : '', latest.content].filter(Boolean).join('\n\n');

  const result = await chat.sendMessage(prompt);
  const text = result.response.text().trim();

  return {
    reply: text,
    raw: text,
  };
};
