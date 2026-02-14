import type { NextRequest } from 'next/server';

import { generateText } from 'ai';
import { NextResponse } from 'next/server';

const NO_EM_DASH_SYSTEM_RULE =
  'Do not use em dashes. Use commas, periods, semicolons, or parentheses instead.';

export async function POST(req: NextRequest) {
  const {
    apiKey: key,
    model = 'gpt-4o-mini',
    prompt,
    system,
  } = await req.json();

  const apiKey = key || process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing ai gateway API key.' },
      { status: 401 }
    );
  }

  try {
    const systemWithStyleRule = system
      ? `${system}\n\nStyle requirement: ${NO_EM_DASH_SYSTEM_RULE}`
      : `Style requirement: ${NO_EM_DASH_SYSTEM_RULE}`;

    const result = await generateText({
      abortSignal: req.signal,
      maxOutputTokens: 50,
      model: `openai/${model}`,
      prompt,
      system: systemWithStyleRule,
      temperature: 0.7,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(null, { status: 408 });
    }

    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}
