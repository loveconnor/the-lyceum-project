/**
 * Integration Guide: Adding Reflections to Lab Templates
 * 
 * This guide shows how to integrate the Reflections feature into existing
 * lab templates like Explain, Build, Derive, etc.
 */

import React, { useState } from 'react';
import { ReflectionModal } from '@/components/reflections';

/**
 * Step 1: Import the ReflectionModal component
 * Add this to your lab template imports
 */
// import { ReflectionModal } from '@/components/reflections';

/**
 * Step 2: Add state to control the reflection modal
 * Add this to your lab template component
 */
function LabTemplateWithReflection({ data, labId }: any) {
  // Existing lab state...
  const [showReflection, setShowReflection] = useState(false);
  
  /**
   * Step 3: Trigger reflection at appropriate points
   * 
   * Option A: After completing all steps
   */
  const handleCompleteAllSteps = async () => {
    // Your existing completion logic
    // await markLabComplete();
    
    // Show reflection modal
    setShowReflection(true);
  };
  
  /**
   * Option B: Show reflection button after completion
   */
  const allStepsComplete = true; // Your logic to check completion
  
  /**
   * Option C: Conditional prompting based on attempts
   */
  const attemptCount = 3; // Track this in your lab state
  const shouldPromptReflection = attemptCount >= 2 && !showReflection;
  
  if (shouldPromptReflection && allStepsComplete) {
    setShowReflection(true);
  }
  
  return (
    <div>
      {/* Your existing lab UI */}
      
      {/* Step 4: Add the ReflectionModal at the end of your component */}
      <ReflectionModal
        open={showReflection}
        onOpenChange={setShowReflection}
        contextType="lab"
        contextId={labId}
        contextTitle={data.labTitle}
        onComplete={() => {
          // Optional: Handle post-reflection actions
          console.log('Reflection completed');
        }}
      />
    </div>
  );
}

/**
 * Integration Pattern for Explain Template
 */
export function ExplainTemplateIntegration() {
  return `
// In apps/web/components/labs/templates/Explain.tsx

// 1. Add import at top:
import { ReflectionModal } from '@/components/reflections';

// 2. Add state after existing useState declarations:
const [showReflection, setShowReflection] = useState(false);

// 3. In the handleSubmitLastStep function, after setting all steps complete:
const handleSubmitLastStep = async () => {
  // ... existing completion logic ...
  
  // Trigger reflection after successful completion
  if (response.includes('approved') || feedbackData.approved) {
    setShowReflection(true);
  }
};

// 4. Add the modal before the closing tag of the main return statement:
return (
  <div className="h-full">
    {/* ... existing JSX ... */}
    
    <ReflectionModal
      open={showReflection}
      onOpenChange={setShowReflection}
      contextType="lab"
      contextId={labId || ''}
      contextTitle={labTitle}
    />
  </div>
);
  `;
}

/**
 * Integration Pattern for Build Template
 */
export function BuildTemplateIntegration() {
  return `
// In apps/web/components/labs/templates/Build.tsx

// 1. Add import at top:
import { ReflectionModal } from '@/components/reflections';

// 2. Add state:
const [showReflection, setShowReflection] = useState(false);

// 3. In handleSubmit, after approval is granted:
if (parsed.approved) {
  setCurrentStep(nextStep);
  
  // If this was the last step, show reflection
  if (nextStepIndex >= steps.length) {
    setShowReflection(true);
  }
}

// 4. Add modal to JSX:
<ReflectionModal
  open={showReflection}
  onOpenChange={setShowReflection}
  contextType="lab"
  contextId={labId || ''}
  contextTitle={labTitle}
/>
  `;
}

/**
 * Integration Pattern for Derive Template
 */
export function DeriveTemplateIntegration() {
  return `
// In apps/web/components/labs/templates/Derive.tsx

// 1. Add import:
import { ReflectionModal } from '@/components/reflections';

// 2. Add state:
const [showReflection, setShowReflection] = useState(false);

// 3. After completing all derivation steps:
const handleFinalSubmit = async () => {
  // ... existing logic ...
  
  if (allStepsCorrect) {
    setShowReflection(true);
  }
};

// 4. Add modal:
<ReflectionModal
  open={showReflection}
  onOpenChange={setShowReflection}
  contextType="lab"
  contextId={labId || ''}
  contextTitle={labTitle}
/>
  `;
}

/**
 * Optional: Add Reflection Button to Lab Header
 * 
 * This allows users to manually trigger reflection at any time
 */
export function ReflectionButtonIntegration() {
  return `
// Add to your lab header or toolbar:

<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowReflection(true)}
  className="gap-2"
>
  <Brain className="h-4 w-4" />
  Reflect on this lab
</Button>
  `;
}

/**
 * Complete Example: Minimal Integration
 * 
 * This is the absolute minimum code needed to add reflections
 */
export function MinimalIntegrationExample() {
  const [showReflection, setShowReflection] = useState(false);
  const labId = 'lab-123';
  const labTitle = 'Understanding React Hooks';
  
  return (
    <div>
      {/* Your lab content */}
      
      {/* When lab is complete, show this button */}
      <button onClick={() => setShowReflection(true)}>
        Complete & Reflect
      </button>
      
      {/* The reflection modal */}
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
 * Testing the Integration
 * 
 * To test your integration:
 * 1. Complete a lab to the point where reflection should trigger
 * 2. Verify the modal appears with correct title
 * 3. Fill out all three reflection sections
 * 4. Click "Save Reflection" and verify success toast
 * 5. Re-open the lab and verify the reflection is preserved
 * 6. Test the "Skip for now" button
 */
