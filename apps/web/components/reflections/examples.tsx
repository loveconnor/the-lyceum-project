import React from "react";
import { ReflectionModal } from "@/components/reflections";
import { shouldTriggerReflection } from "@/types/reflections";

export function ModuleCompletionWithReflection() {
  const [showReflection, setShowReflection] = React.useState(false);
  const moduleId = "module-intro-hooks";
  const moduleTitle = "Introduction to React Hooks";

  const handleModuleComplete = () => {
    if (shouldTriggerReflection({ event: "module_completed" })) {
      setShowReflection(true);
    }
  };

  return (
    <>
      <button onClick={handleModuleComplete}>Complete Module</button>
      <ReflectionModal
        open={showReflection}
        onOpenChange={setShowReflection}
        contextType="module"
        contextId={moduleId}
        contextTitle={moduleTitle}
      />
    </>
  );
}

export function LabCompletionWithReflection() {
  const [showReflection, setShowReflection] = React.useState(false);
  const labId = "lab-123";
  const labTitle = "Understanding React Hooks";

  const handleLabComplete = () => {
    if (
      shouldTriggerReflection({
        event: "lab_completed",
        attemptCount: 2,
        timeSpentMinutes: 15,
      })
    ) {
      setShowReflection(true);
    }
  };

  return (
    <>
      <button onClick={handleLabComplete}>Complete Lab</button>
      <ReflectionModal
        open={showReflection}
        onOpenChange={setShowReflection}
        contextType="lab"
        contextId={labId}
        contextTitle={labTitle}
      />
    </>
  );
}

export function ExerciseSubmissionWithReflection() {
  const [attemptCount, setAttemptCount] = React.useState(0);
  const [showReflection, setShowReflection] = React.useState(false);

  const handleSubmit = (isCorrect: boolean) => {
    const nextAttempts = attemptCount + 1;
    setAttemptCount(nextAttempts);

    if (
      isCorrect &&
      shouldTriggerReflection({
        event: "exercise_submitted",
        attemptCount: nextAttempts,
        timeSpentMinutes: 12,
        hadDifficulty: nextAttempts > 1,
      })
    ) {
      setShowReflection(true);
    }
  };

  return (
    <>
      <button onClick={() => handleSubmit(true)}>Submit Exercise</button>
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
