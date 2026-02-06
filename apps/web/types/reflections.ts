import type { Value } from 'platejs';

/**
 * Type definitions for the Reflections system
 * 
 * Reflections are structured thinking tools that help learners
 * convert action into understanding after completing activities.
 */

export type ReflectionContextType = 'lab' | 'exercise' | 'module' | 'path_item';

export interface Reflection {
  id: string;
  user_id: string;
  
  // Context information
  context_type: ReflectionContextType;
  context_id: string;
  context_title: string;
  
  // Structured reflection content (stored as Plate editor Value format)
  what_i_tried: Value;
  what_worked_or_failed: Value;
  what_i_would_do_differently: Value;
  
  // Optional metadata
  confidence_level?: number; // 1-5 scale
  time_spent_minutes?: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CreateReflectionInput {
  context_type: ReflectionContextType;
  context_id: string;
  context_title: string;
  what_i_tried: Value;
  what_worked_or_failed: Value;
  what_i_would_do_differently: Value;
  confidence_level?: number;
  time_spent_minutes?: number;
}

export interface UpdateReflectionInput {
  what_i_tried?: Value;
  what_worked_or_failed?: Value;
  what_i_would_do_differently?: Value;
  confidence_level?: number;
  time_spent_minutes?: number;
}

/**
 * Structured prompts for each reflection section
 */
export const REFLECTION_PROMPTS = {
  what_i_tried: {
    title: "What I Tried",
    prompt: "Describe your approach and the steps you took. Be specific about your reasoning and decisions.",
    placeholder: "I started by... Then I... My reasoning was...",
  },
  what_worked_or_failed: {
    title: "What Worked or Didn't Work",
    prompt: "Identify what succeeded and what failed. Focus on outcomes, not judgments.",
    placeholder: "What worked: ... What didn't work: ... The key issue was...",
  },
  what_i_would_do_differently: {
    title: "What I Would Do Differently",
    prompt: "Based on what you learned, how would you approach this next time?",
    placeholder: "Next time I would... I would avoid... A better approach would be...",
  },
} as const;

/**
 * Helper to check if a reflection has meaningful content
 */
export function hasReflectionContent(value: Value): boolean {
  if (!value || value.length === 0) return false;

  type ReflectionTextNode = {
    text?: string;
    children?: ReflectionTextNode[];
  };
  
  // Check if there's any non-empty text
  const hasText = value.some((node) => {
    const typedNode = node as ReflectionTextNode;
    if (typedNode.children) {
      return typedNode.children.some((child) => {
        return child.text && child.text.trim().length > 0;
      });
    }
    return false;
  });
  
  return hasText;
}

/**
 * Helper to check if all required reflection sections have content
 */
export function isReflectionComplete(reflection: Partial<CreateReflectionInput>): boolean {
  return (
    hasReflectionContent(reflection.what_i_tried || []) &&
    hasReflectionContent(reflection.what_worked_or_failed || []) &&
    hasReflectionContent(reflection.what_i_would_do_differently || [])
  );
}

/**
 * Reflection Triggers
 * 
 * PRIMARY TRIGGER: Module completion (smallest meaningful integration point)
 * Modules are where learners engage with multiple concepts, exercises, or labs.
 * By module end, there's enough context to evaluate understanding, identify breakdowns,
 * and capture how reasoning evolved while details are still concrete.
 * 
 * Guidelines for when to show reflections:
 * - AFTER module completion (primary, required reflection point)
 * - AFTER individual labs or exercises (when they involve meaningful effort)
 * - AFTER encountering friction or challenges (valuable learning moments)
 * - At natural stopping points before increasing difficulty
 * 
 * Path-level reflections can exist but should be optional and integrative,
 * focused on connecting modules rather than recalling details.
 * 
 * DO NOT trigger reflections:
 * - During active problem solving
 * - On entry to content (before any work)
 * - In the middle of multi-step activities
 */
export type ReflectionTriggerEvent = 
  | 'module_completed'        // PRIMARY: After completing a module
  | 'lab_completed'            // After individual lab completion
  | 'exercise_submitted'       // After exercise with meaningful effort
  | 'milestone_reached'        // At clear achievement points
  | 'difficulty_threshold'     // Before significant difficulty increase
  | 'before_progression'       // Before advancing to new concepts
  | 'path_completed';          // OPTIONAL: Integrative path-level reflection

export interface ReflectionTriggerContext {
  event: ReflectionTriggerEvent;
  attemptCount?: number;
  timeSpentMinutes?: number;
  hadDifficulty?: boolean;
  isFirstCompletion?: boolean;
}

/**
 * Determine if a reflection should be triggered based on the context
 * 
 * Priority hierarchy:
 * 1. Module completion (always trigger - primary reflection point)
 * 2. Labs/exercises with meaningful effort (2+ attempts or 10+ minutes)
 * 3. Difficulty encountered (shows learning moments)
 * 4. Before progression (ensures readiness)
 * 5. Path completion (optional, integrative)
 */
export function shouldTriggerReflection(context: ReflectionTriggerContext): boolean {
  const { event, attemptCount = 0, timeSpentMinutes = 0, hadDifficulty = false, isFirstCompletion = false } = context;

  // ALWAYS trigger after module completion (primary reflection point)
  if (event === 'module_completed') {
    return true;
  }

  // Always trigger after lab completion (meaningful unit of work)
  if (event === 'lab_completed') {
    return true;
  }

  // Trigger at clear milestones
  if (event === 'milestone_reached') {
    return true;
  }

  // Trigger after multiple attempts (shows meaningful effort)
  if (event === 'exercise_submitted' && attemptCount >= 2) {
    return true;
  }

  // Trigger if significant time was spent (shows engagement)
  if (event === 'exercise_submitted' && timeSpentMinutes >= 10) {
    return true;
  }

  // Trigger if difficulty was encountered (valuable learning moment)
  if (hadDifficulty && attemptCount >= 1) {
    return true;
  }

  // Trigger before progressing to harder content (ensure readiness)
  if (event === 'before_progression') {
    return true;
  }

  // Path completion reflections are optional (integrative, not detail-focused)
  if (event === 'path_completed') {
    return isFirstCompletion; // Only on first completion to avoid repetition
  }

  return false;
}
