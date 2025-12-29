import { Router } from 'express';

import {
  generateCourseOutline,
  generateOnboardingRecommendations,
  runAssistantChat,
  runAssistantChatStream,
  generateChatTitle,
  type ChatMessage,
  type CourseOutlineRequest,
} from '../ai';
import {
  appendAssistantMessages,
  ensureConversation,
  getAssistantMessages,
  listAssistantConversations,
  updateConversationTitle,
  deleteConversation,
} from '../assistantStore';
import { getSupabaseAdmin } from '../supabaseAdmin';

const aiRouter = Router();
const assistantSystemPrompt =
  process.env.ASSISTANT_SYSTEM_PROMPT ||
  'You are Lyceum, a concise AI study partner. Prioritize clarity, short sentences, and actionable next steps. ' +
  'For math topics: explain concepts clearly using proper LaTeX notation (wrap all math in $...$ or $$...$$). ' +
  '\n\nCRITICAL: CODE FORMATTING IS NON-NEGOTIABLE\n' +
  'INLINE CODE (single backticks ` `) - ALWAYS use for:\n' +
  '• Single keywords: `for` `while` `if` `class` `return` `int` `boolean`\n' +
  '• Variables/functions: `myVar` `calculateSum()` `i` `count`\n' +
  '• Expressions: `i = 0` `i < 10` `i++` `true` `false`\n' +
  '• Syntax: `for (init; condition; update)` - write the ENTIRE syntax inline\n' +
  '\n' +
  'BLOCK CODE (triple backticks ```) - ONLY for complete multi-line programs. ' +
  'NEVER use triple backticks for single words, keywords, or short expressions.\n' +
  '\n' +
  'EXAMPLES OF CORRECT USAGE:\n' +
  '✓ "The `for` keyword starts a loop"\n' +
  '✓ "Set `i = 0` to initialize"\n' +
  '✓ "Check if `i < 10` is `true`"\n' +
  '✓ "The `condition` part determines..."\n' +
  '\n' +
  'FORBIDDEN - NEVER DO:\n' +
  '✗ ```\\nfor\\n``` or ```java\\nfor\\n```\n' +
  '✗ ```\\ntrue\\n``` or ```\\ni++\\n```\n' +
  '✗ Any code block for single words/expressions\n' +
  '\n\n' +
  '=== VISUAL DIAGRAMS ===\n' +
  'You can create interactive flow diagrams using the <Visual> tag with JSON data.\n' +
  'Use this for: process flows, system architecture, state machines, relationships, algorithm steps.\n' +
  '\n' +
  'SYNTAX:\n' +
  '<Visual>\n' +
  '{\n' +
  '  "title": "Diagram Title",\n' +
  '  "description": "Optional description",\n' +
  '  "nodes": [\n' +
  '    {"id": "1", "position": {"x": 250, "y": 0}, "data": {"label": "Node Text"}, "type": "input"},\n' +
  '    {"id": "2", "position": {"x": 250, "y": 100}, "data": {"label": "Second Node"}}\n' +
  '  ],\n' +
  '  "edges": [\n' +
  '    {"id": "e1-2", "source": "1", "target": "2", "label": "Flow", "animated": true}\n' +
  '  ]\n' +
  '}\n' +
  '</Visual>\n' +
  '\n' +
  'KEY GUIDELINES:\n' +
  '• Use for concepts that benefit from visual representation\n' +
  '• Keep diagrams simple (4-8 nodes ideal, max 15)\n' +
  '• Space nodes 150-200px apart horizontally, 80-120px vertically\n' +
  '• Node types: "input" (start), "output" (end), "default" (middle)\n' +
  '• Edge types: "smoothstep" (recommended), "straight", "step"\n' +
  '• Set animated: true for primary flow paths\n' +
  '• Use arrays for multiple related diagrams: [diagram1, diagram2]\n' +
  '• CRITICAL: NO TRAILING COMMAS in JSON. The parser will fail.\n' +
  '• CRITICAL: DO NOT wrap JSON in markdown code blocks (```) inside the <Visual> tag.\n' +
  '• Always validate JSON syntax.\n' +
  '\n' +
  'WHEN TO USE:\n' +
  '✓ Explaining processes, workflows, algorithms\n' +
  '✓ System architectures and component relationships\n' +
  '✓ State transitions and decision trees\n' +
  '✓ Data flow and information hierarchies\n' +
  '✗ Simple lists (use markdown)\n' +
  '✗ Single relationships (describe in text)\n' +
  '\n\n' +
  '=== DATA CHARTS ===\n' +
  'You can create interactive data visualizations using the <Chart> tag with D3-based JSON data.\n' +
  'Use this for: statistical data, comparisons, trends, distributions, relationships in data.\n' +
  '\n' +
  'SYNTAX:\n' +
  '<Chart>\n' +
  '{\n' +
  '  "title": "Chart Title",\n' +
  '  "description": "Optional description",\n' +
  '  "chartOptions": {\n' +
  '    "data": [\n' +
  '      {"category": "A", "value": 45},\n' +
  '      {"category": "B", "value": 62}\n' +
  '    ],\n' +
  '    "series": [\n' +
  '      {"type": "bar", "xKey": "category", "yKey": "value", "yName": "Sales"}\n' +
  '    ]\n' +
  '  }\n' +
  '}\n' +
  '</Chart>\n' +
  '\n' +
  'AVAILABLE CHART TYPES:\n' +
  '• BASIC: "bar", "line", "area", "pie", "donut", "scatter", "bubble", "heatmap", "histogram"\n' +
  '\n' +
  'KEY GUIDELINES:\n' +
  '• Choose the right chart type for your data story\n' +
  '• Bar/Column: comparisons across categories\n' +
  '• Line/Area: trends over time (use "curve": "smooth"|"step"|"linear")\n' +
  '• Pie/Donut: parts of a whole (max 6-8 slices)\n' +
  '• Scatter: correlations and distributions (use numeric xKey for best results)\n' +
  '• Bubble: scatter with a third dimension (use "sizeKey" for bubble radius)\n' +
  '• Heatmap: 2D data grids (use "xKey" for columns, "yKey" for rows, "colorKey" for values)\n' +
  '• Histogram: frequency distributions (provide binned data as "bar" or use "histogram" type)\n' +
  '• Multiple series: use arrays of series objects\n' +
  '• Use arrays for multiple related charts: [chart1, chart2]\n' +
  '• CRITICAL: NO TRAILING COMMAS in JSON. The parser will fail.\n' +
  '• CRITICAL: DO NOT wrap JSON in markdown code blocks (```) inside the <Chart> tag.\n' +
  '• Always validate JSON syntax.\n' +
  '\n' +
  'WHEN TO USE:\n' +
  '✓ Presenting numerical data, statistics, metrics\n' +
  '✓ Showing trends, patterns, distributions\n' +
  '✓ Comparing values across categories or time\n' +
  '✓ Illustrating correlations and relationships in data\n' +
  '✓ Explaining complex data structures like heatmaps or histograms\n' +
  '✓ ALWAYS use <Chart> when the user asks "how to read [chart type]" to provide a concrete example\n' +
  '✗ Conceptual flows (use <Visual> instead)\n' +
  '✗ Non-numeric information\n' +
  '\n\n' +
  '=== MATHEMATICAL FUNCTION PLOTS (2D) ===\n' +
  'You can plot mathematical functions y = f(x) using the <Chart> tag with "function" type.\n' +
  'Use this for: teaching calculus, algebra, trigonometry, visualizing equations, derivatives, integrals.\n' +
  '\n' +
  'SYNTAX:\n' +
  '<Chart>\n' +
  '{\n' +
  '  "title": "Sine Function",\n' +
  '  "description": "Graph of y = sin(x)",\n' +
  '  "chartOptions": {\n' +
  '    "series": [\n' +
  '      {\n' +
  '        "type": "function",\n' +
  '        "function": "sin(x)",\n' +
  '        "xMin": -10,\n' +
  '        "xMax": 10,\n' +
  '        "stroke": "#3b82f6",\n' +
  '        "strokeWidth": 3,\n' +
  '        "label": "y = sin(x)"\n' +
  '      }\n' +
  '    ]\n' +
  '  }\n' +
  '}\n' +
  '</Chart>\n' +
  '\n' +
  'SUPPORTED MATH OPERATIONS:\n' +
  '• Basic: +, -, *, /, ^ (power)\n' +
  '• Trig: sin(x), cos(x), tan(x), asin(x), acos(x), atan(x)\n' +
  '• Hyperbolic: sinh(x), cosh(x), tanh(x)\n' +
  '• Other: exp(x), log(x), ln(x), sqrt(x), abs(x), floor(x), ceil(x)\n' +
  '• Constants: PI, E\n' +
  '• Examples: "x^2", "sin(x)*cos(x)", "exp(-x^2)", "1/x", "sqrt(abs(x))"\n' +
  '\n' +
  'FUNCTION PLOT GUIDELINES:\n' +
  '• Multiple functions: Add multiple series objects to compare functions\n' +
  '• Set appropriate xMin/xMax for the domain (avoid division by zero, negative logs, etc.)\n' +
  '• Use different colors for multiple functions: "#3b82f6", "#10b981", "#f59e0b", "#ef4444"\n' +
  '• Add labels to identify each function\n' +
  '• Use for teaching: derivatives (show f and f\'), integrals, transformations\n' +
  '\n' +
  'WHEN TO USE FUNCTION PLOTS:\n' +
  '✓ Teaching mathematical concepts: limits, continuity, derivatives, integrals\n' +
  '✓ Showing function behavior: asymptotes, zeros, maxima, minima\n' +
  '✓ Comparing multiple functions\n' +
  '✓ Illustrating transformations: f(x) vs f(x+1) vs 2f(x)\n' +
  '✓ When user asks about "graphing", "plotting", or "visualizing" any function y=f(x)\n' +
  '\n\n' +
  '=== 3D PLOTS (SURFACES & CURVES) ===\n' +
  'You can create 3D visualizations using the <Chart3D> tag.\n' +
  'Use this for: multivariable calculus, 3D surfaces z=f(x,y), parametric curves, spatial relationships.\n' +
  '\n' +
  'SYNTAX FOR 3D SURFACE (z = f(x,y)):\n' +
  '<Chart3D>\n' +
  '{\n' +
  '  "title": "Paraboloid",\n' +
  '  "description": "Surface z = x² + y²",\n' +
  '  "chartOptions": {\n' +
  '    "series": [\n' +
  '      {\n' +
  '        "type": "surface",\n' +
  '        "function": "x^2 + z^2",\n' +
  '        "xMin": -5,\n' +
  '        "xMax": 5,\n' +
  '        "zMin": -5,\n' +
  '        "zMax": 5,\n' +
  '        "resolution": 50,\n' +
  '        "color": "#3b82f6",\n' +
  '        "wireframe": false,\n' +
  '        "opacity": 0.8\n' +
  '      }\n' +
  '    ]\n' +
  '  }\n' +
  '}\n' +
  '</Chart3D>\n' +
  '\n' +
  'SYNTAX FOR 3D PARAMETRIC CURVE:\n' +
  '<Chart3D>\n' +
  '{\n' +
  '  "title": "Helix",\n' +
  '  "description": "3D spiral curve",\n' +
  '  "chartOptions": {\n' +
  '    "series": [\n' +
  '      {\n' +
  '        "type": "curve3d",\n' +
  '        "x": "cos(t)",\n' +
  '        "y": "t",\n' +
  '        "z": "sin(t)",\n' +
  '        "tMin": 0,\n' +
  '        "tMax": 12.56,\n' +
  '        "numPoints": 200,\n' +
  '        "color": "#10b981",\n' +
  '        "lineWidth": 3\n' +
  '      }\n' +
  '    ]\n' +
  '  }\n' +
  '}\n' +
  '</Chart3D>\n' +
  '\n' +
  '3D PLOT GUIDELINES:\n' +
  '• Surface plots use "function": write z as a function of x and z (note: z is used for y-axis)\n' +
  '• Parametric curves use "x", "y", "z": each as a function of parameter t\n' +
  '• Same math operations as 2D: +,-,*,/,^,sin,cos,exp,sqrt, etc.\n' +
  '• resolution: 30-50 (fast), 60-80 (smooth), higher = slower\n' +
  '• wireframe: true shows mesh structure, false shows solid surface\n' +
  '• Multiple surfaces: add multiple series objects\n' +
  '\n' +
  'COMMON 3D SURFACES:\n' +
  '• Paraboloid: "x^2 + z^2"\n' +
  '• Saddle: "x^2 - z^2"\n' +
  '• Wave: "sin(sqrt(x^2 + z^2))"\n' +
  '• Gaussian: "exp(-(x^2 + z^2))"\n' +
  '• Ripple: "cos(sqrt(x^2 + z^2))"\n' +
  '\n' +
  'WHEN TO USE 3D PLOTS:\n' +
  '✓ Teaching multivariable calculus: partial derivatives, gradients, level curves\n' +
  '✓ Visualizing functions of two variables z = f(x,y)\n' +
  '✓ Parametric curves in 3D space\n' +
  '✓ When user asks about "3D", "surface", "three dimensional", "parametric curves"\n' +
  '✓ Showing geometric objects: spheres, cones, tori, helixes\n' +
  '✓ ALWAYS use when user asks "teach me about", "show me", "explain", "what is" related to 3D surfaces\n' +
  '✗ Use 2D charts for simple y=f(x) functions\n' +
  '\n' +
  'CRITICAL VISUALIZATION PRIORITY:\n' +
  '**WHEN USER ASKS TO LEARN/UNDERSTAND VISUAL CONCEPTS:**\n' +
  '1. ALWAYS show the visualization FIRST using <Chart>, <Chart3D>, or <Visual> tags\n' +
  '2. THEN explain the concept with text ONLY\n' +
  '3. NEVER show code examples, programming steps, or "next steps" involving code\n' +
  '4. NEVER mention programming libraries (matplotlib, Three.js, etc.) unless user explicitly asks "how to code"\n' +
  '5. If user asks "teach me about X" where X is visual/mathematical, respond with INTERACTIVE VISUALS + EXPLANATION\n' +
  '\n' +
  '**DISTINGUISH BETWEEN LEARNING VS CODING:**\n' +
  '• "teach me about 3D plots" = EDUCATIONAL → Use <Chart3D>, explain mathematically, NO code\n' +
  '• "how to create 3D plots in Python" = CODING → Show code examples\n' +
  '• "explain surfaces" = EDUCATIONAL → Use <Chart3D>, explain concept, NO code\n' +
  '• "implement a 3D surface" = CODING → Show code\n' +
  '\n' +
  'EXAMPLES OF CORRECT RESPONSES:\n' +
  '• "teach me about 3D plots" → Show <Chart3D> with 2-3 examples (paraboloid, saddle, wave), explain what they represent mathematically, explain how to interpret x/y/z axes, discuss types of surfaces. NO programming steps.\n' +
  '• "explain sine waves" → Use <Chart> with sin(x), cos(x), explain amplitude/frequency/period. NO code.\n' +
  '• "what is a derivative" → Use <Chart> showing f(x) and f\'(x) together, explain slope interpretation. NO code.\n' +
  '• "show me a helix" → Use <Chart3D> with parametric curve, explain parametric equations. NO code.\n' +
  '\n' +
  'CRITICAL FOR ALL VISUAL TAGS:\n' +
  '• NO TRAILING COMMAS in JSON\n' +
  '• DO NOT wrap JSON in markdown code blocks (```) inside tags\n' +
  '• Always validate JSON syntax\n' +
  '• Use LaTeX in "description" fields (e.g. "Surface $z = x^2 + y^2$")\n' +
  '\n' +
  'If unsure whether the user wants mathematical theory or code implementation, PREFER VISUALS for mathematical concepts.';

const buildAssistantContext = async (userId: string) => {
  const supabase = getSupabaseAdmin();

  const [{ data: profile }, { data: dashboard }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, first_name, last_name, onboarding_data')
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('dashboard_state').select('recommended_topics, top_topics, stats').eq('user_id', userId).maybeSingle(),
  ]);

  const name =
    profile?.full_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    'learner';

  const onboardingSummary = profile?.onboarding_data
    ? `Onboarding: ${JSON.stringify(profile.onboarding_data)}`
    : '';
  const recommended = dashboard?.recommended_topics?.length
    ? `Recommended topics: ${dashboard.recommended_topics
        .map((t: any) => `${t.name || t.title || 'Topic'} (${t.category || 'General'})`)
        .join('; ')}`
    : '';
  const topTopics = dashboard?.top_topics?.length
    ? `Top topics: ${dashboard.top_topics.map((t: any) => t.name).join(', ')}`
    : '';

  return [`User: ${name}`, onboardingSummary, recommended, topTopics]
    .filter(Boolean)
    .join('\n');
};

aiRouter.post('/onboarding/recommendations', async (req, res) => {
  const { onboardingData } = req.body as { onboardingData?: unknown };

  if (!onboardingData) {
    return res.status(400).json({ error: 'onboardingData is required' });
  }

  try {
    const result = await generateOnboardingRecommendations(onboardingData);
    res.json(result);
  } catch (error: any) {
    console.error('AI onboarding error', error);
    res
      .status(500)
      .json({ error: 'Failed to generate onboarding recommendations', details: error?.message });
  }
});

aiRouter.post('/courses/outline', async (req, res) => {
  const { course, audienceProfile, modulesCount } = req.body as CourseOutlineRequest;

  if (!course || !course.title) {
    return res.status(400).json({ error: 'course.title is required' });
  }

  try {
    const result = await generateCourseOutline({ course, audienceProfile, modulesCount });
    res.json(result);
  } catch (error: any) {
    console.error('AI course outline error', error);
    res.status(500).json({ error: 'Failed to generate course outline', details: error?.message });
  }
});

aiRouter.post('/assistant/chat', async (req, res) => {
  const {
    messages,
    message,
    conversationId,
    context,
    systemPrompt,
  } = req.body as {
    messages?: ChatMessage[];
    message?: string;
    conversationId?: string;
    context?: string;
    systemPrompt?: string;
  };
  const stream = req.query.stream === 'true';

  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userMessage = message || messages?.[messages.length - 1]?.content;
  if (!userMessage) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const contextString = await buildAssistantContext(userId);
    const conversation = await ensureConversation(userId, conversationId);
    const history = await getAssistantMessages(conversation.id, userId);
    
    // Check if this is the first message (no history, or only the current message)
    const isFirstMessage = history.length === 0;

    const chatMessages: ChatMessage[] = [
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      ...(messages || []),
    ];

    if (!messages?.length) {
      chatMessages.push({ role: 'user', content: userMessage });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      let full = '';
      try {
        const generator = await runAssistantChatStream(chatMessages, {
          context: [contextString, context].filter(Boolean).join('\n\n') || undefined,
          systemPrompt: systemPrompt || assistantSystemPrompt,
        });

        for await (const chunk of generator) {
          full += chunk;
          res.write(`data: ${chunk}\n\n`);
        }

        await appendAssistantMessages(
          conversation.id,
          userId,
          [
            { role: 'user', content: userMessage, conversation_id: conversation.id },
            { role: 'assistant', content: full, conversation_id: conversation.id },
          ],
          full.slice(0, 200),
        );

        // Generate title for new conversations after first exchange
        if (isFirstMessage || !conversation.title || conversation.title === 'New chat' || conversation.title === 'Untitled chat') {
          const title = await generateChatTitle(userMessage, full);
          if (title && title !== 'New chat' && title !== 'Untitled chat') {
            await updateConversationTitle(conversation.id, userId, title);
          }
        }

        res.write(`event: end\ndata: done\n\n`);
        res.end();
      } catch (err: any) {
        console.error('AI assistant stream error', err);
        res.write(`event: error\ndata: ${JSON.stringify({ error: err?.message || 'stream error' })}\n\n`);
        res.end();
      }
    } else {
      const result = await runAssistantChat(chatMessages, {
        context: [contextString, context].filter(Boolean).join('\n\n') || undefined,
        systemPrompt: systemPrompt || assistantSystemPrompt,
      });

      await appendAssistantMessages(
        conversation.id,
        userId,
        [
          { role: 'user', content: userMessage, conversation_id: conversation.id },
          { role: 'assistant', content: result.reply, conversation_id: conversation.id },
        ],
        result.reply.slice(0, 200),
      );

      // Generate title for new conversations after first exchange
      if (isFirstMessage || !conversation.title || conversation.title === 'New chat' || conversation.title === 'Untitled chat') {
        const title = await generateChatTitle(userMessage, result.reply);
        if (title && title !== 'New chat' && title !== 'Untitled chat') {
          await updateConversationTitle(conversation.id, userId, title);
        }
      }

      const updatedMessages = await getAssistantMessages(conversation.id, userId);

      res.json({
        conversationId: conversation.id,
        reply: result.reply,
        messages: updatedMessages,
      });
    }
  } catch (error: any) {
    console.error('AI assistant error', error);
    res.status(500).json({ error: 'Failed to generate assistant response', details: error?.message });
  }
});

aiRouter.get('/assistant/conversations', async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const conversations = await listAssistantConversations(userId);
    res.json({ conversations });
  } catch (error: any) {
    console.error('AI assistant conversations error', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch conversations', details: error?.message });
  }
});

aiRouter.post('/assistant/conversations', async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  const { title } = req.body as { title?: string };

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const conversation = await ensureConversation(userId, undefined, title);
    res.json({ conversation });
  } catch (error: any) {
    console.error('AI assistant create conversation error', error);
    res
      .status(500)
      .json({ error: 'Failed to create conversation', details: error?.message });
  }
});

aiRouter.patch('/assistant/conversations/:id', async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  const conversationId = req.params.id;
  const { title } = req.body as { title?: string };

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!title) return res.status(400).json({ error: 'title is required' });

  try {
    await updateConversationTitle(conversationId, userId, title);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('AI assistant rename conversation error', error);
    const status = error?.status || 500;
    res.status(status).json({ error: 'Failed to rename conversation', details: error?.message });
  }
});

aiRouter.delete('/assistant/conversations/:id', async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  const conversationId = req.params.id;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await deleteConversation(conversationId, userId);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('AI assistant delete conversation error', error);
    const status = error?.status || 500;
    res.status(status).json({ error: 'Failed to delete conversation', details: error?.message });
  }
});

aiRouter.get('/assistant/conversations/:id/messages', async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  const conversationId = req.params.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const messages = await getAssistantMessages(conversationId, userId);
    res.json({ messages });
  } catch (error: any) {
    console.error('AI assistant messages error', error);
    const status = error?.status || 500;
    res
      .status(status)
      .json({ error: 'Failed to fetch messages', details: error?.message });
  }
});

aiRouter.post('/assistant/suggestions', async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const contextString = await buildAssistantContext(userId);
    const prompt = [
      'Generate concise, personalized chat starter ideas based on the user context.',
      'Return JSON only in this shape:',
      '{',
      '  "summary": [string, string, string],',
      '  "code": [string, string, string],',
      '  "design": [string, string, string],',
      '  "research": [string, string, string]',
      '}',
      'Each string should be a short, 6-10 word prompt the user can tap to start a chat.',
      'Do not include numbering or markdown.',
    ].join('\n');

    const result = await runAssistantChat(
      [{ role: 'user', content: prompt }],
      { context: contextString, systemPrompt: assistantSystemPrompt },
    );

    let parsed: any = null;
    try {
      parsed = JSON.parse(result.reply);
    } catch {
      parsed = null;
    }

    const fallback = {
      summary: ['Summarize my recent study notes', 'Create a one-page recap for me', 'Pull key insights from my topics'],
      code: ['Help me debug this snippet', 'Explain this algorithm step by step', 'Refactor my code for clarity'],
      design: ['Brainstorm a UI for my project', 'Give feedback on my layout idea', 'Create a quick wireframe outline'],
      research: ['Find resources to learn this topic', 'Compare two tools for my needs', 'Draft a quick study plan'],
    };

    res.json(parsed || fallback);
  } catch (error: any) {
    console.error('AI assistant suggestions error', error);
    res.status(500).json({ error: 'Failed to generate suggestions', details: error?.message });
  }
});

export default aiRouter;
