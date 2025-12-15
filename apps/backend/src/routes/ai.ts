import { Router } from 'express';

import {
  generateCourseOutline,
  generateOnboardingRecommendations,
  runAssistantChat,
  type ChatMessage,
  type CourseOutlineRequest,
} from '../ai';

const aiRouter = Router();

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
  const { messages, context } = req.body as { messages?: ChatMessage[]; context?: string };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const result = await runAssistantChat(messages, context);
    res.json(result);
  } catch (error: any) {
    console.error('AI assistant error', error);
    res.status(500).json({ error: 'Failed to generate assistant response', details: error?.message });
  }
});

export default aiRouter;
