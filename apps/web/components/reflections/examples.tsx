/**
 * Reflections Integration Examples
 * 
 * CRITICAL TIMING PRINCIPLES:
 * 
 * PRIMARY TRIGGER: Module completion
 * - Modules are the smallest unit where meaningful integration happens
 * - By module end, learner has engaged with multiple concepts/exercises/labs
 * - Enough context to evaluate understanding while details are still concrete
 * - Module reflections inform subsequent modules and recommendations
 * 
 * Path-level reflections are optional and integrative:
 * - Focus on connecting modules, not recalling details
 * - Too late for actionable insight if it's the only reflection
 * - Can exist alongside module reflections for broader synthesis
 * 
 * Reflections should appear AFTER meaningful cognitive effort, not during it.
 * They surface when:
 * - Module/lab/exercise completion has occurred
 * - Decisions have been made and reasoning applied
 * - Friction or challenges have been encountered
 * - A clear stopping point has been reached
 * - Details are still fresh in the learner's mind
 * 
 * DO NOT trigger reflections:
 * - During active problem solving
 * - On entry to content (before any work)
 * - In the middle of multi-step activities
 * - As an interruption to flow
 * 
 * Purpose: Close the loop after effort, consolidate understanding,
 * and assess readiness before moving forward.
 */

import React from 'react';
import { ReflectionModal } from '@/components/reflections';
import type { ReflectionContextType } from '@/types/reflections';
import { shouldTriggerReflection } from '@/types/reflections';

/**
 * Example 1: After Module Completion (PRIMARY PATTERN)
 * 
 * This is the main reflection trigger. Modules are the smallest meaningful
 * integration point where learners have enough context to reflect meaningfully.
 */
export function ModuleCompletionWithReflection() {
  const [showReflection, setShowReflection] = React.useState(false);
  const [moduleId] = React.useState('module-intro-hooks');
  const [moduleTitle] = React.useState('Introduction to React Hooks');
  const [itemsCompleted] = React.useState(5); // Labs, exercises, readings

  const handleModuleComplete = async () => {
    // 1. Mark module as complete
    // await markModuleAsComplete(moduleId);
    
    // 2. ALWAYS show reflection after module completion
    const shouldReflect = shouldTriggerReflection({
      event: 'module_completed',
    });

    if (shouldReflect) {
      setShowReflection(true);
    }
  };

  const handleReflectionComplete = async () => {
    // 3. Use reflection data to inform next module or recommendations
    console.log('Module reflection captured, adapting next module');
    // await updateLearningPathRecommendations(moduleId, reflectionData);
  };

  return (
    <>
      <div>
        <p>Module progress: {itemsCompleted}/5 items completed</p>
        <button onClick={handleModuleComplete}>
          Complete Module
        </button>
      </div>

      <ReflectionModal
        open={showReflection}
        onOpenChange={setShowReflection}
        contextType="module"
        contextId={moduleId}
        contextTitle={moduleTitle}
        onComplete={handleReflectionComplete}
      />
    </>
  );
}

/**
 * Example 1: After Lab Completion (CORRECT)
 * 
 * Trigger immediately after the learner completes all steps and receives
 * approval. This captures fresh details while closing the loop on effort.
 */
export function LabCompletionWithReflection() {
  const [showReflection, setShowReflection] = React.useState(false);
  const [labId] = React.useState('lab-123');
  const [labTitle] = React.useState('Understanding React Hooks');
  const [attemptCount] = React.useState(3);
  const [timeSpent] = React.useState(15);

  const handleLabComplete = async () => {
    // 1. Mark lab as complete
    // await markLabAsComplete(labId);
    
    // 2. Check if reflection should trigger (after meaningful effort)
    const shouldReflect = shouldTriggerReflection({
      event: 'lab_completed',
      attemptCount,
      timeSpentMinutes: timeSpent,
    });

    if (shouldReflect) {
      setShowReflection(true);
    }
  };

  const handleReflectionComplete = () => {
    // Navigate to next activity after reflection
    console.log('Reflection completed, ready for next step');
  };

  return (
    <>
      <button onClick={handleLabComplete}>
        Complete Lab
      </button>

      <ReflectionModal
        open={showReflection}
        onOpenChange={setShowReflection}
        contexAfter Exercise Submission (CORRECT)
 * 
 * Trigger after submitting an exercise where meaningful cognitive effort occurred.
 * Look for signals: multiple attempts, time spent, or difficulty encountered.
 */
export function ExerciseSubmissionWithReflection() {
  const [attemptCount, setAttemptCount] = React.useState(0);
  const [timeSpent] = React.useState(12);
  const [hadDifficulty] = React.useState(true);
  const [showReflection, setShowReflection] = React.useState(false);

  const handleSubmit = async (isCorrect: boolean) => {
    setAttemptCount(prev => prev + 1);
    
    // Only trigger reflection if exercise is complete AND meaningful effort was made
    if (isCorrect) {
      const shouldReflect = shouldTriggerReflection({
        event: 'exercise_submitted',
        attemptCount: attemptCount + 1,
        timeSpentMinutes: timeSpent,
        hadDifficulty,
      });

      if (shouldReflect) {
        // Wait a moment for the success feedback, then show reflection
        setTimeout(() => setShowReflection(true), 500);
      }
    }
  };

  return (
    <>
      <button onClick={() => handleSubmit(true)ty yet
    const shouldPromptReflection = attemptCount >= 2 && !hasReflected;
    
    if (shouldPromptReflection) {
      setShowReflection(true);
    }
  };

  return (
    <>
      <button onClick={handleActivityComplete}>
        Submit Solution
      </button>

      <ReflectionModal
        open={showReflection}
        onOpenChange={setShowReflection}
        contextType="exercise"
        contextId="exercise-456"
        contextTitle="Implementing useEffect"
      />
    </>
  );
}

/**
 * Example 3: Reflection in Lab Viewer
 * 
 * Shows how to integrate reflection button into lab templates
 */
export function LabViewerWithReflection() {
  const [showReflection, setShowReflection] = React.useState(false);
  const labId = 'lab-789';
  const labTitle = 'Building a State Machine';

  return (
    <div>
      {/* Lab content */}
      <div className="lab-content">
        {/* Your lab UI here */}
      </div>

      {/* Reflection trigger */}
      <div className="flex justify-end mt-4">
        <button
          onClick={() => setShowReflection(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Reflect on this lab
        </button>
      </div>

      <ReflectionModal
        open={showReflection}
        onOpenChange={setShowReflection}
        contextType="lab"
        contextId={labId}
        contextTitle={labTitle}
      />
    </div>
  );
}

/**
 * Example 4: Using Reflection as a Standalone Page
 * 
 * Navigate to a dedicated reflection page, useful for review sessions
 * or when reflection is a required step in the learning path.
 */
export function ReflectionPage() {
  // This would be a full page component, e.g., in app/(main)/reflections/[id]/page.tsx
  const handleBack = () => {
    // Navigate back to previous page
    // router.back()
  };

  const handleComplete = () => {
    // Navigate to next activity or path overview
    // router.push('/labs')
  };

  return (
    <div>
      {/* Use ReflectionView for full-page experience */}
      {/* <ReflectionView
        contextType="lab"
        contextId="lab-123"
        contexBefore Progression (CORRECT)
 * 
 * At natural stopping points before advancing to new concepts or difficulty.
 * This ensures understanding is consolidated before moving forward.
 */
export function BeforeProgressionReflection() {
  const [currentModule] = React.useState('intro-to-hooks');
  const [nextModule] = React.useState('advanced-patterns');
  const [hasReflected, setHasReflected] = React.useState(false);
  const [showReflection, setShowReflection] = React.useState(false);

  const handleNext = () => {
    // Before progressing to a significantly harder module, ensure reflection
    const shouldReflect = shouldTriggerReflection({
      event: 'before_progression',
    });

    if (shouldReflect && !hasReflected) {
      setShowReflection(true);
    } else {
      // Proceed to next activity
      console.log('Moving to:', nextModule);
    }
  };

  return (
    <>
      <button onClick={handleNext}>
        Continue to Advanced Patterns
      </button>

      <ReflectionModal
        open={showReflection}
        onOpenChange={setShowReflection}
        contextType="module"
        contextId={currentModule}
        contextTitle="Introduction to Hooks"
        onComplete={() => {
          setHasReflected(true);
          // Now proceed to next module
          console.log('Moving to:', nextModule);
        }}
      />
    </>
  );
}

/**
 * Example 6: Path Completion Reflection (OPTIONAL, INTEGRATIVE)
 * 
 * Path-level reflections should be optional and focused on integration,
 * not detail recall. They connect modules and assess overall progress.
 * The primary reflections should happen at the module level.
 */
export function PathCompletionReflection() {
  const [showReflection, setShowReflection] = React.useState(false);
  const [pathId] = React.useState('path-react-fundamentals');
  const [pathTitle] = React.useState('React Fundamentals');
  const [modulesCompleted] = React.useState(8);
  const [isFirstCompletion] = React.useState(true);

  const handlePathComplete = () => {
    // Path completion reflection is optional and integrative
    const shouldReflect = shouldTriggerReflection({
      event: 'path_completed',
      isFirstCompletion,
    });

    if (shouldReflect) {
      // Optionally show a path-level reflection focused on synthesis
      setShowReflection(true);
    } else {
      // Skip to next path or recommendations
      console.log('Path complete, moving to recommendations');
    }
  };

  return (
    <>
      <div>
        <p>Completed all {modulesCompleted} modules!</p>
        <button onClick={handlePathComplete}>
          Complete Path
        </button>
      </div>

      {/* Path reflection focuses on connecting modules, not recalling details */}
      <ReflectionModal
        open={showReflection}
        onOpenChange={setShowReflection}
        contextType="path_item"
        contextId={pathId}
        contextTitle={`Reflecting on ${pathTitle}`}
        onComplete={() => {
          console.log('Path reflection captured (optional, integrative)');
        }}
      />
    </>
  );
}

/**
 * ANTI-PATTERN: DO NOT DO THIS
 * 
 * Triggering reflection on page load or entry to content
 */
export function WrongTriggerOnEntry() {
  // ❌ WRONG: Showing reflection before any work has been done
  React.useEffect(() => {
    // setShowReflection(true); // NO!
  }, []);

  return null;
}

/**
 * ANTI-PATTERN: DO NOT DO THIS
 * 
 * Interrupting active problem solving
 */
export function WrongTriggerDuringWork() {
  const [currentStep, setCurrentStep] = React.useState(1);

  const handleStepComplete = () => {
    setCurrentStep(prev => prev + 1);
    
    // ❌ WRONG: Don't interrupt multi-step flow
    // if (currentStep === 2) {
    //   setShowReflection(true); // NO!
    // }
  };

  return null     contextType="module"
        contextId="module-123"
        contextTitle="Introduction to Hooks"
        onComplete={() => {
          setHasReflected(true);
          // Can now proceed to next activity
        }}
      />
    </>
  );
}
