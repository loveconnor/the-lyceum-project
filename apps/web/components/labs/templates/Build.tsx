"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useState } from "react";
import { BuildLabData } from "@/types/lab-templates";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LabStepPanel } from "@/components/labs/lab-step-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Editor from "@monaco-editor/react";
import { 
  CheckCircle2, 
  Lightbulb, 
  Terminal,
  Check,
  Loader2,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLabAI } from "@/hooks/use-lab-ai";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { EditorWidget, createEditorValue, extractPlainText } from "@/components/widgets";
import { MultipleChoiceWidget } from "@/components/widgets/multiple-choice-widget";
import { CodeEditorWidget } from "@/components/widgets/code-editor-widget";
import { LabLearningWidget, isLearnByDoingWidgetType } from "@/components/labs/lab-learning-widget";

// Helper function to convert literal \n to actual newlines
const convertNewlines = (text: string | undefined) => {
  if (!text) return "";
  return text.replace(/\\n/g, "\n");
};

const getDefaultStarterCode = (language: string): string => {
  if (language === "python") {
    return "# Start coding here\n";
  }
  return "// Start coding here\n";
};

// Helper to extract JSON from AI responses
function extractJSON<T>(text: string): T {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  return JSON.parse(cleaned) as T;
}

type StepFeedback = {
  text: string;
  approved: boolean;
  correctIds?: string[];
  incorrectIds?: string[];
};

type TestResult = {
  passed: boolean;
  description: string;
  feedback?: string;
};

type BuildProgressData = {
  stepResponses?: Record<string, string>;
  code?: string;
  testResults?: TestResult[];
  output?: string[];
  feedback?: StepFeedback;
  completedStepCode?: Record<string, string>;
};

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
  instruction?: string;
  keyQuestions?: string[];
  prompt?: string;
  requiresInput?: boolean;
  starterCode?: string;
  skeletonCode?: string;
  widgets: Array<{
    type: string;
    config: any;
  }>;
}

type StepLikeWithStarter = {
  starterCode?: string;
  skeletonCode?: string;
  widgets?: Array<{
    type?: string;
    config?: Record<string, unknown>;
  }>;
};

const normalizeStarterCode = (value: string): string => value.replace(/\r\n/g, "\n");

const toStarterCode = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? normalizeStarterCode(value) : null;
};

const getStepStarterCode = (step?: StepLikeWithStarter): string | null => {
  if (!step) return null;

  const directStarter =
    toStarterCode(step.starterCode) ??
    toStarterCode(step.skeletonCode);
  if (directStarter) return directStarter;

  if (!Array.isArray(step.widgets)) return null;
  for (const widget of step.widgets) {
    if (widget?.type !== "code-editor") continue;
    const config = widget.config ?? {};
    const widgetStarter =
      toStarterCode(config.starterCode) ??
      toStarterCode(config.starter_code) ??
      toStarterCode(config.skeletonCode);
    if (widgetStarter) return widgetStarter;
  }

  return null;
};

const getDefaultWidgetsForStep = (stepId: string, stepTitle: string, prompt?: string): Step["widgets"] => {
  const normalized = `${stepId} ${stepTitle}`.toLowerCase();
  const isPrimaryCodeStep =
    normalized.includes("implement") ||
    normalized.includes("code") ||
    normalized.includes("write");
  const isCodeReviewStep = normalized.includes("test") || normalized.includes("debug");

  if (isPrimaryCodeStep || isCodeReviewStep) {
    const widgets: Step["widgets"] = [
      {
        type: "code-editor",
        config: {
          label: "Implementation",
          description: prompt || "Write and run your solution."
        }
      }
    ];

    if (isCodeReviewStep) {
      widgets.push({
        type: "editor",
        config: {
          label: "Testing Notes",
          placeholder: "Summarize test results and debugging observations...",
          description: prompt
        }
      });
    }

    return widgets;
  }

  return [
    {
      type: "editor",
      config: {
        label: "Your Response",
        placeholder: "Type your answer here...",
        description: prompt
      }
    }
  ];
};

const ensureBuildStepWidgets = (
  stepId: string,
  stepTitle: string,
  widgets: Step["widgets"] | undefined,
  prompt?: string
): Step["widgets"] => {
  if (widgets && widgets.length > 0) {
    return widgets;
  }
  return getDefaultWidgetsForStep(stepId, stepTitle, prompt);
};

const INITIAL_STEPS = (stepPrompts?: BuildLabData['stepPrompts'], aiSteps?: BuildLabData['steps']): Step[] => {
  // If AI-generated steps exist, use them
  if (aiSteps && aiSteps.length > 0) {
    return aiSteps.map((step, idx) => ({
      id: step.id,
      title: step.title,
      status: idx === 0 ? "current" as const : "pending" as const,
      instruction: step.instruction,
      keyQuestions: step.keyQuestions,
      prompt: step.prompt,
      requiresInput: true,
      starterCode: step.starterCode,
      skeletonCode: step.skeletonCode,
      widgets: ensureBuildStepWidgets(step.id, step.title, step.widgets as Step["widgets"] | undefined, step.prompt)
    }));
  }
  
  // Otherwise use legacy format
  if (!stepPrompts) {
    return [
      {
        id: "implement",
        title: "Implement",
        status: "current",
        prompt: "Write your solution in the code editor",
        widgets: getDefaultWidgetsForStep("implement", "Implement", "Write your solution in the code editor")
      }
    ];
  }
  
  return [
    { 
      id: "understand", 
      title: "Understand problem", 
      status: "current",
      prompt: stepPrompts.understand,
      requiresInput: true,
      widgets: getDefaultWidgetsForStep("understand", "Understand problem", stepPrompts.understand)
    },
    { 
      id: "design", 
      title: "Design approach", 
      status: "pending",
      prompt: stepPrompts.design,
      requiresInput: true,
      widgets: getDefaultWidgetsForStep("design", "Design approach", stepPrompts.design)
    },
    { 
      id: "implement", 
      title: "Implement", 
      status: "pending",
      prompt: "Write your solution in the code editor",
      widgets: getDefaultWidgetsForStep("implement", "Implement", "Write your solution in the code editor")
    },
    { 
      id: "test", 
      title: "Test & debug", 
      status: "pending",
      prompt: stepPrompts.test,
      requiresInput: true,
      widgets: getDefaultWidgetsForStep("test", "Test & debug", stepPrompts.test)
    },
    { 
      id: "explain", 
      title: "Explain solution", 
      status: "pending",
      prompt: stepPrompts.explain,
      requiresInput: true,
      widgets: getDefaultWidgetsForStep("explain", "Explain solution", stepPrompts.explain)
    },
  ];
};

interface BuildTemplateProps {
  data: BuildLabData;
  labId?: string;
  moduleContext?: {
    pathId: string;
    moduleId: string;
    onComplete?: () => void;
  };
}

export default function BuildTemplate({ data, labId, moduleContext }: BuildTemplateProps) {
  const { theme } = useTheme();
  const { labTitle, description, initialCode, language, testCases, hints, stepPrompts, steps: aiSteps } = data;
  
  // Ensure language is valid, fallback to detecting from code or default to java
  const detectedLanguage = language || 'java';
  
  const [steps, setSteps] = useState<Step[]>(() => INITIAL_STEPS(stepPrompts, aiSteps));
  const [code, setCode] = useState(() => {
    const initialSteps = INITIAL_STEPS(stepPrompts, aiSteps);
    const firstStepStarterCode = getStepStarterCode(initialSteps[0]);
    const normalizedInitialCode = initialCode.trim().length > 0 ? initialCode : "";
    return firstStepStarterCode || normalizedInitialCode || getDefaultStarterCode(detectedLanguage);
  });
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  
  // Dynamic step responses based on step IDs
  const [stepResponses, setStepResponses] = useState<Record<string, string>>({});
  const [accessedSteps, setAccessedSteps] = useState<Set<string>>(new Set());
  
  // Track completed code for each step
  const [completedStepCode, setCompletedStepCode] = useState<Record<string, string>>({});
  
  // AI feedback state
  const [stepFeedback, setStepFeedback] = useState<Record<string, StepFeedback>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getAssistance, loading: aiLoading } = useLabAI(labId);
  const currentStepRef = React.useRef<HTMLButtonElement>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasShownCompletionModal, setHasShownCompletionModal] = useState(false);
  const [showLabOverview, setShowLabOverview] = useState(false);
  const [hasLoadedProgress, setHasLoadedProgress] = useState(false);
  
  // Extract method implementation from code for a specific step
  const extractMethodFromCode = useCallback((fullCode: string, stepId: string): string => {
    const stepData = aiSteps?.find(s => s.id === stepId);
    const stepStarter = getStepStarterCode(stepData);
    if (!stepData || !stepStarter) return fullCode;
    
    // Get method signature from the step scaffold to identify extraction target.
    const lines = stepStarter.split('\n');
    const signatureLine = lines.find((l: string) => l.includes('(') && (l.includes('public') || l.includes('private') || l.includes('protected')));
    
    if (!signatureLine) return fullCode;
    
    // Extract method name from signature (e.g., "getSign" from "public static String getSign(int n)")
    const methodNameMatch = signatureLine.match(/\s+(\w+)\s*\(/);
    if (!methodNameMatch) return fullCode;
    
    const methodName = methodNameMatch[1];
    
    // Find and extract this method from the full code
    const codeLines = fullCode.split('\n');
    
    // Skip any class declarations or braces before the method
    let methodStartIndex = -1;
    for (let i = 0; i < codeLines.length; i++) {
      const line = codeLines[i].trim();
      // Skip class declarations and opening braces
      if (line.startsWith('public class') || line.startsWith('class ') || line === '{' || line === '') {
        continue;
      }
      // Found the method signature
      if (line.includes(methodName) && line.includes('(') && 
          (line.includes('public') || line.includes('private') || line.includes('protected'))) {
        methodStartIndex = i;
        break;
      }
    }
    
    if (methodStartIndex === -1) return fullCode;
    
    // Find the closing brace of this method
    let braceCount = 0;
    let methodEndIndex = methodStartIndex;
    let inMethod = false;
    
    for (let i = methodStartIndex; i < codeLines.length; i++) {
      const line = codeLines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          inMethod = true;
        } else if (char === '}') {
          braceCount--;
          if (inMethod && braceCount === 0) {
            methodEndIndex = i;
            break;
          }
        }
      }
      
      // Exit as soon as we found the method's closing brace
      if (inMethod && braceCount === 0) {
        break;
      }
    }
    
    // Extract just the method with proper indentation
    const methodLines = codeLines.slice(methodStartIndex, methodEndIndex + 1);
    
    // Filter out any class closing braces or class declarations
    const cleanedLines = methodLines.filter(line => {
      const trimmed = line.trim();
      // Skip class declarations and standalone closing braces that might be class endings
      if (trimmed.startsWith('public class') || trimmed.startsWith('class ')) {
        return false;
      }
      return true;
    });
    
    // Ensure proper indentation (add 2 spaces if not already indented)
    return cleanedLines.map(line => {
      if (line.trim() === '') return '';
      // If line doesn't start with whitespace, add indentation
      if (line[0] !== ' ' && line[0] !== '\t') {
        return '  ' + line;
      }
      return line;
    }).join('\n');
  }, [aiSteps]);
  
  // Compose code from completed steps + current step skeleton
  const getComposedCode = useCallback(() => {
    const currentStepIndex = steps.findIndex(s => s.status === "current");
    if (currentStepIndex === -1) return code;
    
    // Don't use skeleton code composition if we don't have AI steps
    if (!aiSteps || aiSteps.length === 0) return code;
    
    // Get initialCode structure (imports and class declaration)
    const lines = initialCode.split('\n');
    const classStart = lines.findIndex(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('public class') || trimmed.startsWith('class ');
    });
    
    // Build code from completed steps
    const composedLines: string[] = [];
    
    // Add any imports and class header (only once!)
    if (classStart >= 0) {
      // Get everything up to and including the class declaration
      const headerLines = lines.slice(0, classStart + 1);
      composedLines.push(...headerLines);
      composedLines.push(''); // Empty line after class declaration
    }
    
    // Add completed code from previous steps (just the methods)
    for (let i = 0; i < currentStepIndex; i++) {
      const stepId = steps[i].id;
      if (completedStepCode[stepId]) {
        composedLines.push(completedStepCode[stepId]);
        composedLines.push(''); // Empty line between methods
      }
    }
    
    // Add step starter scaffold or saved code for current step
    const currentStep = steps[currentStepIndex];
    
    // Check if we already have completed code for this step
    if (completedStepCode[currentStep.id]) {
      composedLines.push(completedStepCode[currentStep.id]);
      composedLines.push(''); // Empty line after method
    } else {
      const currentStepData = aiSteps?.find((s) => s.id === currentStep.id);
      const starterCode = getStepStarterCode(currentStepData ?? currentStep);
      if (starterCode) {
        // Ensure scaffold has proper indentation
        const starterLines = starterCode.split('\n').map((line: string) => {
          if (line.trim() === '') return '';
          if (line[0] !== ' ' && line[0] !== '\t') {
            return '  ' + line;
          }
          return line;
        });
        composedLines.push(starterLines.join('\n'));
        composedLines.push(''); // Empty line after scaffold
      }
    }
    
    // Close class
    if (classStart >= 0) {
      composedLines.push('}');
    }
    
    return composedLines.join('\n');
  }, [steps, aiSteps, initialCode, completedStepCode, code]);
  
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  // Load progress when component mounts
  React.useEffect(() => {
    if (!labId) {
      setIsLoadingProgress(false);
      return;
    }

    const loadProgress = async () => {
      try {
        const { fetchLabProgress } = await import("@/lib/api/labs");
        const progress = await fetchLabProgress(labId);
        
        if (progress && progress.length > 0) {
          setHasLoadedProgress(true);
          // Restore step feedback from all progress entries
          const feedbackMap: Record<string, StepFeedback> = {};
          progress.forEach((p) => {
            const stepData = p.step_data as Partial<BuildProgressData> | undefined;
            if (stepData?.feedback) {
              feedbackMap[p.step_id] = stepData.feedback;
            }
          });
          setStepFeedback(feedbackMap);

          // Sort progress by timestamp to get the most recent
          const sortedProgress = [...progress].sort((a, b) => {
            const timeA = new Date(a.updated_at).getTime();
            const timeB = new Date(b.updated_at).getTime();
            return timeB - timeA;
          });
          
          const mostRecent = sortedProgress[0];
          const mostRecentData = mostRecent?.step_data as Partial<BuildProgressData> | undefined;
          
          // Restore data from most recent progress entry
          if (mostRecentData) {
            if (mostRecentData.stepResponses) {
              setStepResponses(mostRecentData.stepResponses);
            }
            if (mostRecentData.code) {
              setCode(mostRecentData.code);
            }
            if (mostRecentData.testResults) {
              setTestResults(mostRecentData.testResults);
            }
            if (mostRecentData.output) {
              setOutput(mostRecentData.output);
            }
            if (mostRecentData.completedStepCode) {
              setCompletedStepCode(mostRecentData.completedStepCode);
            }
          }

          // Restore step completion status
          const completedStepIds = progress.filter((p) => p.completed).map((p) => p.step_id);
          const stepsWithProgress = progress.map((p) => p.step_id);
          
          // Mark all steps with progress as accessed
          setAccessedSteps(new Set(stepsWithProgress));
          
          setSteps(prev => {
            const newSteps = prev.map(step => {
              if (completedStepIds.includes(step.id)) {
                return { ...step, status: "completed" as const };
              }
              return step;
            });
            
            // Always go to the first incomplete step (right after all completed ones)
            const firstIncomplete = newSteps.findIndex(s => s.status !== "completed");
            if (firstIncomplete !== -1) {
              newSteps[firstIncomplete] = { ...newSteps[firstIncomplete], status: "current" as const };
            } else {
              // All steps are completed - show completion modal if not already shown
              setHasShownCompletionModal((alreadyShown) => {
                if (!alreadyShown) {
                  setTimeout(() => setShowCompletionModal(true), 500);
                }
                return true;
              });
            }
            
            return newSteps;
          });
        } else {
          // No progress found - this is first time visiting the lab
          // Show the lab overview modal after a brief delay
          setTimeout(() => setShowLabOverview(true), 300);
        }
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [labId]);

  // Auto-scroll to current step when it changes
  React.useEffect(() => {
    if (currentStepRef.current) {
      currentStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [steps]);

  // Check if all steps are completed and show modal (only once)
  React.useEffect(() => {
    const allCompleted = steps.length > 0 && steps.every(s => s.status === "completed");
    if (allCompleted && !hasShownCompletionModal) {
      setShowCompletionModal(true);
      setHasShownCompletionModal(true);
    }
  }, [steps, hasShownCompletionModal]);

  // Mark current step as accessed
  React.useEffect(() => {
    const currentStep = steps.find(s => s.status === "current");
    if (currentStep) {
      setAccessedSteps(prev => new Set([...prev, currentStep.id]));
    }
  }, [steps]);

  const handleRunCode = async () => {
    if (!testCases || testCases.length === 0) {
      toast.error("No test cases available");
      return;
    }

    setIsRunning(true);
    setStepFeedback(prev => ({ ...prev, [currentStep?.id || '']: { ...prev[currentStep?.id || ''], text: '', approved: false } }));
    
    const isTestDebugStep = currentStep?.id.includes("test") || currentStep?.id.includes("debug");
    
    try {
      // Filter test cases for current step (if stepId is specified)
      const currentStepId = currentStep?.id;
      const relevantTests = testCases.filter(tc => 
        !tc.stepId || tc.stepId === currentStepId
      );
      
      if (relevantTests.length === 0) {
        setOutput([`[${new Date().toLocaleTimeString()}] No tests for this step. Continue when ready.`]);
        setIsRunning(false);
        return;
      }
      
      // If on test/debug step, first run the main method to show output
      if (isTestDebugStep && getAssistance) {
        setOutput([`[${new Date().toLocaleTimeString()}] Running your code...`]);
        
        const executionPrompt = `You are a code execution simulator. Execute this ${detectedLanguage} code and show what it would output.

Code to execute:
\`\`\`${detectedLanguage}
${code}
\`\`\`

Simulate running this code (especially the main method if present) and return the console output. Respond in JSON format:
{
  "output": ["line1", "line2", ...]
}

Show exactly what would be printed to the console.`;

        try {
          const execResponse = await getAssistance(executionPrompt, { code });
          const execParsed = extractJSON<{ output: string[] }>(execResponse);
          
          if (execParsed.output && execParsed.output.length > 0) {
            setOutput([
              `[${new Date().toLocaleTimeString()}] Running your code...`,
              ...execParsed.output,
              `\n[${new Date().toLocaleTimeString()}] Now running tests...`
            ]);
          }
        } catch (error) {
          console.error("Failed to execute code:", error);
          setOutput([`[${new Date().toLocaleTimeString()}] Running tests...`]);
        }
      } else {
        setOutput([`[${new Date().toLocaleTimeString()}] Running tests...`]);
      }
      
      // Simulate test execution by asking AI to evaluate code against test cases
      if (getAssistance) {
        const prompt = `You are a code testing assistant. Evaluate this ${detectedLanguage} code against the test cases FOR THE CURRENT STEP ONLY.

Current Step: ${currentStep?.title || 'Unknown'}
Step Instruction: ${currentStep?.instruction || 'Write the code'}

Code to test:
\`\`\`${detectedLanguage}
${code}
\`\`\`

Test cases for this step:
${relevantTests.map((tc, i) => `${i + 1}. ${tc.description || `Test ${i + 1}`}\n   Input: ${tc.input}\n   Expected: ${tc.expectedOutput}`).join('\n')}

IMPORTANT: Only evaluate the functionality required for the current step. If other methods/functions are not implemented yet, that's expected and should not cause test failures for this step.

Analyze the code and determine which tests would pass or fail. Respond in JSON format:
{
  "results": [
    {
      "testNumber": 1,
      "passed": true/false,
      "feedback": "Brief explanation if failed"
    }
  ],
  "overallFeedback": "1-2 sentence summary of what works and what needs fixing"
}`;

        const response = await getAssistance(prompt, { code, testCases: relevantTests });
        const parsed = extractJSON<any>(response);
        
        const results: typeof testResults = parsed.results.map((r: any, idx: number) => ({
          passed: r.passed,
          description: relevantTests[idx]?.description || `Test ${idx + 1}`,
          feedback: r.feedback
        }));
        
        setTestResults(results);
        
        const passedCount = results.filter(r => r.passed).length;
        const outputLines = [
          ...results.map((r, i) => 
            r.passed 
              ? `✓ Test ${i + 1}: ${r.description} (Passed)`
              : `✗ Test ${i + 1}: ${r.description} (Failed)\n  💡 ${r.feedback}`
          ),
          `\n[${new Date().toLocaleTimeString()}] ${passedCount}/${results.length} tests passed`
        ];
        
        setOutput(outputLines);
        
        // Check if current step is implementation-related
        const isImplementStep = currentStep?.id === "implement" || 
                                currentStep?.id.includes("implement") ||
                                currentStep?.id.includes("code") ||
                                currentStep?.id.includes("write");
        
        const isTestDebugStep = currentStep?.id.includes("test") || currentStep?.id.includes("debug");
        
        // If all tests pass, move to next step (skip test/debug if from implement step)
        if (passedCount === results.length) {
          setStepFeedback(prev => ({
            ...prev,
            [currentStep?.id || '']: {
              text: parsed.overallFeedback || "All tests passed! Great work. Moving to the next step.",
              approved: true
            }
          }));
          setTimeout(() => {
            completeStep(currentStep?.id || "", isImplementStep);
          }, 2000);
        } else {
          // Tests failed
          if (isTestDebugStep) {
            // On test/debug steps, provide specific debugging feedback without "Continue" button
            setStepFeedback(prev => ({
              ...prev,
              [currentStep?.id || '']: {
                text: parsed.overallFeedback || "Some tests failed. Review the output above, use print statements to inspect values, and try again.",
                approved: false
              }
            }));
          } else {
            // On implementation steps, allow continuing to debug step
            setStepFeedback(prev => ({
              ...prev,
              [currentStep?.id || '']: {
                text: parsed.overallFeedback || "Some tests failed. Review the feedback and try again, or continue to debug.",
                approved: false
              }
            }));
          }
        }
      } else {
        // Fallback without AI
        setOutput([
          `[${new Date().toLocaleTimeString()}] Running ${testCases.length} test cases...`,
          "Please connect to AI for test evaluation"
        ]);
      }
    } catch (error) {
      toast.error("Failed to run tests: " + (error as Error).message);
      setOutput([`Error: ${(error as Error).message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const executeCommand = (input: string) => {
    const command = input.trim().split(/\s+/)[0]?.toLowerCase();

    switch (command) {
      case "test":
        handleRunCode();
        break;
      case "clear":
        setOutput([]);
        break;
      case "help":
        setOutput(prev => [...prev, "Available commands: test, clear, help"]);
        break;
      default:
        setOutput(prev => [...prev, `Unknown command: ${command}. Type 'help' for available commands.`]);
        break;
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    
    setOutput(prev => [...prev, `> ${commandInput}`]);
    executeCommand(commandInput);
    setCommandInput("");
  };

  const saveProgress = useCallback(async (stepId: string, completed: boolean = false) => {
    if (!labId || !stepId) return;
    
    try {
      const { updateLabProgress } = await import("@/lib/api/labs");
      await updateLabProgress(labId, {
        step_id: stepId,
        step_data: {
          stepResponses,
          code,
          testResults,
          output,
          feedback: stepFeedback[stepId],
          completedStepCode // Save completed code for each step
        },
        completed
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  }, [labId, stepResponses, code, testResults, output, stepFeedback, completedStepCode]);

  // Auto-save code and responses when they change (debounced)
  React.useEffect(() => {
    if (isLoadingProgress) return;

    const currentStep = steps.find(s => s.status === "current");
    if (!currentStep) return;

    const timer = setTimeout(() => {
      void saveProgress(currentStep.id, false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isLoadingProgress, saveProgress, steps]);

  const markLabComplete = useCallback(async () => {
    if (!labId) return;
    
    try {
      const { updateLab } = await import("@/lib/api/labs");
      await updateLab(labId, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      console.log('Lab marked as complete:', labId);
    } catch (error) {
      console.error("Failed to mark lab as complete:", error);
    }
  }, [labId]);

  const completeStep = useCallback(async (id: string, skipTestDebug: boolean = false) => {
    // Extract and save just the method implementation for this step
    const methodCode = extractMethodFromCode(code, id);
    setCompletedStepCode(prev => ({
      ...prev,
      [id]: methodCode
    }));
    
    // Save progress before completing
    await saveProgress(id, true);
    
    // Update steps state
    const updatedSteps = await new Promise<typeof steps>((resolve) => {
      setSteps(prev => {
        const index = prev.findIndex(s => s.id === id);
        if (index === -1) return prev;
        
        const newSteps = [...prev];
        newSteps[index] = { ...newSteps[index], status: "completed" };
        
        // Check if we should skip the next step (test/debug after passing all tests)
        let nextIndex = index + 1;
        if (skipTestDebug && nextIndex < newSteps.length) {
          const nextStep = newSteps[nextIndex];
          // If next step is test/debug related, skip it and save as completed
          if (nextStep.id.includes("test") || nextStep.id.includes("debug")) {
            newSteps[nextIndex] = { ...newSteps[nextIndex], status: "completed" };
            // Save the skipped step as completed too
            saveProgress(nextStep.id, true);
            nextIndex = nextIndex + 1;
          }
        }
        
        // If there's a next step, set it as current
        if (nextIndex < newSteps.length) {
          newSteps[nextIndex] = { ...newSteps[nextIndex], status: "current" };
        }
        // If no next step, all are completed - we'll handle showing the last step later
        
        resolve(newSteps);
        return newSteps;
      });
    });
    
    // Check if all steps are completed and show modal
    const allCompleted = updatedSteps.every(s => s.status === "completed");
    console.log('Complete step called:', id);
    console.log('Updated steps:', updatedSteps.map(s => ({ id: s.id, status: s.status })));
    console.log('All completed?', allCompleted);
    
    if (allCompleted && !hasShownCompletionModal) {
      console.log('Triggering completion modal...');
      setHasShownCompletionModal(true);
      // Mark the lab as complete in the database
      await markLabComplete();
      setTimeout(() => setShowCompletionModal(true), 500);
    }
  }, [code, hasShownCompletionModal, markLabComplete, saveProgress, extractMethodFromCode]);

  const handleSubmit = async () => {
    const currentStep = steps.find(s => s.status === "current");
    if (!currentStep || !getAssistance) return;

    const userResponse = stepResponses[currentStep.id];
    const choiceResponse = stepResponses[`${currentStep.id}-choice`];
    const explainResponse = stepResponses[`${currentStep.id}-explain`];
    const stepName = currentStep.title;
    const hasLearnByDoingWidget = currentStep.widgets?.some((w) => isLearnByDoingWidgetType(w.type));

    const hasResponse =
      userResponse?.trim() ||
      choiceResponse?.trim() ||
      explainResponse?.trim() ||
      hasLearnByDoingWidget;

    if (!hasResponse && currentStep.requiresInput) {
      toast.error("Please provide an answer before submitting");
      return;
    }

    setIsSubmitting(true);
    setStepFeedback(prev => ({ ...prev, [currentStep.id]: { ...prev[currentStep.id], text: '', approved: false } }));

    try {
      // Save progress as user submits (not completed yet)
      await saveProgress(currentStep.id, false);
      
    // Build context about what the student did
    let studentWork = '';
    if (userResponse) studentWork += `Text response: ${userResponse}\n`;
    
    if (choiceResponse) {
      const selectedIds = choiceResponse.split(',').filter(Boolean);
      const selectedChoiceTexts = currentStep.widgets
        ?.filter(w => w.type === 'multiple-choice')
        .flatMap(w => w.config.choices || [])
        .filter(c => selectedIds.includes(c.id))
        .map(c => c.name) || [];
      
      if (selectedChoiceTexts.length > 0) {
        studentWork += `Selected options: ${selectedChoiceTexts.join(', ')}\n`;
      } else {
        studentWork += `Selected options: ${choiceResponse}\n`;
      }
    }

    if (explainResponse) studentWork += `Explanation: ${explainResponse}\n`;
    if (!studentWork && hasLearnByDoingWidget) {
      studentWork += "Completed an interactive widget activity.\n";
    }

    const hasTextInput = currentStep.widgets 
      ? currentStep.widgets.some(
          (w) =>
            w.type === "editor" ||
            w.type === "short_answer" ||
            w.type === "ShortAnswer" ||
            (w.type === "multiple-choice" && w.config.showExplanation)
        )
      : !!currentStep.requiresInput;
    
    const prompt = `You are a coding instructor reviewing a student's ${stepName.toLowerCase()} for learning to code.

Step instruction: ${currentStep.instruction || currentStep.title}
${currentStep.keyQuestions ? `Key questions: ${currentStep.keyQuestions.join(', ')}` : ''}

Student's work:
${studentWork}

Current code they're working on:
\`\`\`${detectedLanguage}
${code}
\`\`\`

Evaluate if their response demonstrates understanding. 
IMPORTANT: If the student provided a multiple-choice answer, evaluate if it is correct. Do NOT ask for a written explanation if they have already answered the question correctly via multiple choice.
${!hasTextInput ? "IMPORTANT: There is NO text box for the student to provide a written explanation. Do NOT ask them to explain their answer or provide more details. Only evaluate the multiple-choice selection or code provided." : ""}

Respond ONLY in this JSON format:
{
  "approved": true/false,
  "feedback": "Brief constructive feedback (2-3 sentences). If they were wrong, explain why and what the correct answer is.",
  "correctIds": ["id1", "id2"], // If multiple choice, the IDs of the correct options
  "incorrectIds": ["id3"] // If multiple choice, the IDs of the incorrect options the student selected
}

Approve if they show reasonable understanding or selected the correct option. If not approved, explain what's missing or incorrect.`;

      const response = await getAssistance(prompt, { step: currentStep.id, code });
      
      try {
        const parsed = extractJSON<{ approved: boolean; feedback: string; correctIds?: string[]; incorrectIds?: string[] }>(response);
        setStepFeedback(prev => ({
          ...prev,
          [currentStep.id]: {
            text: parsed.feedback,
            approved: parsed.approved,
            correctIds: parsed.correctIds,
            incorrectIds: parsed.incorrectIds
          }
        }));
        
        if (parsed.approved) {
          setTimeout(async () => {
            await completeStep(currentStep.id, false);
          }, 2000);
        }
      } catch {
        toast.error("Failed to parse AI response");
      }
    } catch (error) {
      toast.error("Failed to get feedback: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToStep = (id: string) => {
    const stepIndex = steps.findIndex(s => s.id === id);
    if (stepIndex === -1) return;
    
    const step = steps[stepIndex];
    // Can navigate to: completed steps, current step, or steps that have been accessed before
    const canNavigate = step.status === "completed" || step.status === "current" || accessedSteps.has(id);
    if (!canNavigate) return;
    
    // Save current method code for the current step before switching
    const currentStepBefore = steps.find(s => s.status === "current");
    if (currentStepBefore && code !== getComposedCode()) {
      const methodCode = extractMethodFromCode(code, currentStepBefore.id);
      setCompletedStepCode(prev => ({
        ...prev,
        [currentStepBefore.id]: methodCode
      }));
    }
    
    setSteps(prev => prev.map((s, idx) => {
      // Set clicked step as current
      if (idx === stepIndex) {
        return { ...s, status: "current" as const };
      }
      // Remove current status from other steps but preserve their completed status
      if (s.status === "current") {
        return { ...s, status: "pending" as const };
      }
      return s;
    }));

    // Clear feedback when moving to a different step
    // setFeedback(null);
  };

  const currentStep = steps.find(s => s.status === "current") || steps[steps.length - 1];

  React.useEffect(() => {
    if (!currentStep) return;
    const win = window as any;
    win.__markStepComplete = () => {
      void completeStep(currentStep.id);
    };
    return () => {
      if (win.__markStepComplete) {
        delete win.__markStepComplete;
      }
    };
  }, [currentStep, completeStep]);
  
  // Update code when step changes to show composed code (completed steps + current scaffold).
  React.useEffect(() => {
    if (isLoadingProgress) return; // Wait for progress to finish loading
    
    // Don't recompose if all steps are completed - keep the final code as is
    const allCompleted = steps.length > 0 && steps.every(s => s.status === "completed");
    if (allCompleted) return;

    const currentStepIndex = currentStep ? steps.findIndex((s) => s.id === currentStep.id) : -1;
    const isFreshFirstStep =
      !hasLoadedProgress &&
      currentStepIndex === 0 &&
      Object.keys(completedStepCode).length === 0;
    if (isFreshFirstStep) return;
    
    if (currentStep && aiSteps && aiSteps.length > 0) {
      const currentStepData = aiSteps.find((s) => s.id === currentStep.id);
      const hasStarterCode = Boolean(getStepStarterCode(currentStepData ?? currentStep));
      
      if (hasStarterCode) {
        const composed = getComposedCode();
        setCode(composed);
      }
    }
  }, [aiSteps, completedStepCode, currentStep, getComposedCode, hasLoadedProgress, isLoadingProgress, steps]);
  
  const hasCodeEditor = Boolean(currentStep?.widgets.some((w) => w.type === "code-editor"));
  const isCodeEditable = hasCodeEditor;

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Step List */}
        <LabStepPanel
          steps={steps}
          accessedSteps={accessedSteps}
          currentStepRef={currentStepRef}
          onStepClick={goToStep}
          labOverview={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLabOverview(true)}
              className="w-full justify-start gap-2 text-xs"
            >
              <Info className="h-3.5 w-3.5" />
              Lab Overview
            </Button>
          }
        />

        <ResizableHandle withHandle />

        {/* Center Panel: Primary Workspace */}
        <ResizablePanel defaultSize={75} minSize={40}>
          {hasCodeEditor ? (
            <ResizablePanelGroup direction="horizontal">
              {/* Step Instructions Section */}
              <ResizablePanel defaultSize={40} minSize={20}>
                <div className="h-full w-full overflow-y-auto overflow-x-auto">
                  <div className="p-6 space-y-6">
                    {/* Dynamic Widget Rendering (Non-code) */}
                    {currentStep && (
                      <div className="space-y-6 pb-4">
                        {/* Step Instructions */}
                        {currentStep.instruction && (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <Markdown>{currentStep.instruction}</Markdown>
                          </div>
                        )}

                        {/* Key Questions */}
                        {currentStep.keyQuestions && currentStep.keyQuestions.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">Key Questions</h4>
                            <ul className="space-y-1.5 list-disc list-inside">
                              {currentStep.keyQuestions.map((q, i) => (
                                <li key={i} className="text-sm text-muted-foreground">{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {currentStep.widgets ? (
                          <div className="space-y-6">
                            {currentStep.widgets.filter(w => w.type !== "code-editor").map((widget, idx) => {
                              if (widget.type === "editor") {
                                return (
                                  <EditorWidget
                                    key={idx}
                                    label={widget.config.label || ""}
                                    description={widget.config.description}
                                    placeholder={widget.config.placeholder || ""}
                                    initialValue={createEditorValue(stepResponses[currentStep.id] || '')}
                                    onChange={(value) => setStepResponses({...stepResponses, [currentStep.id]: extractPlainText(value)})}
                                    height={widget.config.height || widget.config.minHeight || "200px"}
                                    variant={widget.config.variant || "default"}
                                    readOnly={widget.config.readOnly === true}
                                  />
                                );
                              }
                              
                              if (widget.type === "multiple-choice") {
                                const currentFeedback = stepFeedback[currentStep.id];
                                return (
                                  <MultipleChoiceWidget
                                    key={idx}
                                    label={widget.config.label || ""}
                                    description={widget.config.description}
                                    choices={widget.config.choices || []}
                                    selectedIds={(stepResponses[`${currentStep.id}-choice`] || '').split(',').filter(Boolean)}
                                    onSelectionChange={(ids) => setStepResponses({...stepResponses, [`${currentStep.id}-choice`]: ids.join(',')})}
                                    multiSelect={widget.config.multiSelect !== false}
                                    showExplanation={widget.config.showExplanation === true}
                                    explanation={stepResponses[`${currentStep.id}-explain`] || ''}
                                    onExplanationChange={(value) => setStepResponses({...stepResponses, [`${currentStep.id}-explain`]: value})}
                                    explanationLabel={widget.config.explanationLabel}
                                    explanationPlaceholder={widget.config.explanationPlaceholder}
                                    correctIds={currentFeedback?.correctIds}
                                    incorrectIds={currentFeedback?.incorrectIds}
                                    disabled={isSubmitting || aiLoading || currentFeedback?.approved}
                                  />
                                );
                              }
                              if (isLearnByDoingWidgetType(widget.type)) {
                                return (
                                  <LabLearningWidget
                                    key={idx}
                                    widgetType={widget.type}
                                    config={widget.config}
                                    widgetKey={`${currentStep.id}-lbd-${idx}`}
                                  />
                                );
                              }
                              return null;
                            })}
                          </div>
                        ) : (
                          /* Legacy Fallback (Non-code) */
                          <div className="space-y-4">
                            {currentStep.instruction && (
                              <Markdown className="text-sm text-muted-foreground leading-relaxed">
                                {currentStep.instruction}
                              </Markdown>
                            )}
                            {currentStep.requiresInput && (
                              <EditorWidget
                                label="Your Response"
                                placeholder="Type your answer here..."
                                initialValue={createEditorValue(stepResponses[currentStep.id] || "")}
                                onChange={(value) => setStepResponses({...stepResponses, [currentStep.id]: extractPlainText(value)})}
                                height="200px"
                              />
                            )}
                          </div>
                        )}

                        {/* Feedback Display */}
                        {stepFeedback[currentStep.id] && (
                          <Card className={cn(
                            "border-2",
                            stepFeedback[currentStep.id].approved ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"
                          )}>
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start gap-3">
                                {stepFeedback[currentStep.id].approved ? (
                                  <Check className="w-4 h-4 text-green-500 mt-0.5" />
                                ) : (
                                  <Info className="w-4 h-4 text-amber-500 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className="text-xs font-medium mb-0.5">
                                    {stepFeedback[currentStep.id].approved ? "Great work!" : "Keep going!"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{stepFeedback[currentStep.id].text}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Action Buttons (Non-code) */}
                        <div className="flex justify-end gap-3 pt-2">
                          {currentStep.widgets?.some(w => w.type !== "code-editor") && (
                            <Button 
                              onClick={handleSubmit}
                              disabled={isSubmitting || aiLoading || (currentStep.requiresInput && !stepResponses[currentStep.id]?.trim() && !stepResponses[`${currentStep.id}-choice`]?.trim())}
                              size="sm"
                              className="min-w-[120px]"
                            >
                              {isSubmitting || aiLoading ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                  Reviewing...
                                </>
                              ) : (
                                "Submit for Feedback"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={60} minSize={30}>
                <ResizablePanelGroup direction="vertical">
                  {/* Editor Section */}
                  <ResizablePanel defaultSize={70} minSize={30}>
                <div className="h-full w-full overflow-hidden">
                  {currentStep?.widgets ? (
                    currentStep.widgets.filter(w => w.type === "code-editor").map((widget, idx) => (
                      <CodeEditorWidget
                        key={idx}
                        label={widget.config.label}
                        description={widget.config.description}
                        language={detectedLanguage}
                        value={code}
                        onChange={setCode}
                        onRun={handleRunCode}
                        isRunning={isRunning}
                        readOnly={!isCodeEditable}
                        variant="full"
                      />
                    ))
                  ) : (
                    <CodeEditorWidget
                      label="Implementation"
                      language={detectedLanguage}
                      value={code}
                      onChange={setCode}
                      onRun={handleRunCode}
                      isRunning={isRunning}
                      readOnly={!isCodeEditable}
                      variant="full"
                    />
                  )}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Console Section */}
              <ResizablePanel defaultSize={25} minSize={10}>
                <div className={cn(
                  "flex flex-col h-full border-t",
                  theme === "light" ? "bg-zinc-50" : "bg-[#0d1117]"
                )}>
                  <div className={cn(
                    "flex items-center justify-between px-4 py-2 border-b",
                    theme === "light" ? "border-border bg-zinc-100/50" : "border-white/5 bg-white/5"
                  )}>
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-muted-foreground/40" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Console Output</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/20 font-mono">Type &apos;help&apos; for commands</span>
                  </div>
                  <ScrollArea className="flex-1 h-0">
                    <div className="p-4 font-mono text-xs space-y-1.5">
                      {output.length === 0 ? (
                        <p className="text-muted-foreground/40 italic">Click &quot;Run Tests&quot; or type &apos;test&apos; in the console...</p>
                      ) : (
                        output.map((line, i) => (
                          <div key={i} className={cn(
                            "py-0.5 break-all",
                            line.startsWith(">") ? "text-blue-500 font-bold" :
                            line.startsWith("[") ? "text-muted-foreground/60" : 
                            line.includes("✗") ? "text-red-500" : 
                            line.includes("✓") ? "text-emerald-500" : "text-foreground/80"
                          )}>
                            {line}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <form onSubmit={handleCommandSubmit} className={cn(
                    "p-2 border-t",
                    theme === "light" ? "border-border bg-zinc-100/30" : "border-white/5 bg-black/20"
                  )}>
                    <div className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded border focus-within:border-primary/50 transition-colors",
                      theme === "light" ? "bg-background border-border" : "bg-black/40 border-white/10"
                    )}>
                      <span className="text-primary font-bold text-xs select-none">$</span>
                      <input 
                        type="text"
                        value={commandInput}
                        onChange={(e) => setCommandInput(e.target.value)}
                        placeholder="Enter command..."
                        className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-foreground/80 placeholder:text-muted-foreground/40"
                      />
                    </div>
                  </form>
                </div>
              </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            /* No Editor Layout */
            <ScrollArea className="h-full w-full">
              <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
                {/* Reference Code */}
                <div className="space-y-4">
                  <div className="rounded-lg overflow-hidden border bg-[#1e1e1e]">
                    <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                        {detectedLanguage} (Read Only)
                      </span>
                    </div>
                    <div className="h-[200px]">
                      <Editor
                        height="100%"
                        language={detectedLanguage}
                        theme={theme === "light" ? "light" : "vs-dark"}
                        value={code}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: "on",
                          readOnly: true,
                          domReadOnly: true,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          padding: { top: 12, bottom: 12 },
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Separator className="opacity-50" />

                {/* Dynamic Widget Rendering */}
                {currentStep && (
                  <div className="space-y-8 pb-20">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{steps.findIndex(s => s.id === currentStep.id) + 1}</span>
                      </div>
                      <h3 className="text-lg font-semibold">
                        <Markdown>{currentStep.title}</Markdown>
                      </h3>
                    </div>

                    {/* Step Instructions */}
                    {currentStep.instruction && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{currentStep.instruction}</Markdown>
                      </div>
                    )}

                    {/* Key Questions */}
                    {currentStep.keyQuestions && currentStep.keyQuestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Key Questions</h4>
                        <ul className="space-y-1.5 list-disc list-inside">
                          {currentStep.keyQuestions.map((q, i) => (
                            <li key={i} className="text-sm text-muted-foreground">{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentStep.widgets ? (
                      <div className="space-y-8">
                        {currentStep.widgets.map((widget, idx) => {
                          if (widget.type === "editor") {
                            return (
                              <EditorWidget
                                key={idx}
                                label={widget.config.label || ""}
                                description={widget.config.description}
                                placeholder={widget.config.placeholder || ""}
                                initialValue={createEditorValue(stepResponses[currentStep.id] || '')}
                                onChange={(value) => setStepResponses({...stepResponses, [currentStep.id]: extractPlainText(value)})}
                                height={widget.config.height || widget.config.minHeight || "200px"}
                                variant={widget.config.variant || "default"}
                                readOnly={widget.config.readOnly === true}
                              />
                            );
                          }
                          
                          if (widget.type === "multiple-choice") {
                            const currentFeedback = stepFeedback[currentStep.id];
                            return (
                              <MultipleChoiceWidget
                                key={idx}
                                label={widget.config.label || ""}
                                description={widget.config.description}
                                choices={widget.config.choices || []}
                                selectedIds={(stepResponses[`${currentStep.id}-choice`] || '').split(',').filter(Boolean)}
                                onSelectionChange={(ids) => setStepResponses({...stepResponses, [`${currentStep.id}-choice`]: ids.join(',')})}
                                multiSelect={widget.config.multiSelect !== false}
                                showExplanation={widget.config.showExplanation === true}
                                explanation={stepResponses[`${currentStep.id}-explain`] || ''}
                                onExplanationChange={(value) => setStepResponses({...stepResponses, [`${currentStep.id}-explain`]: value})}
                                explanationLabel={widget.config.explanationLabel}
                                explanationPlaceholder={widget.config.explanationPlaceholder}
                                correctIds={currentFeedback?.correctIds}
                                incorrectIds={currentFeedback?.incorrectIds}
                                disabled={isSubmitting || aiLoading || currentFeedback?.approved}
                              />
                            );
                          }
                          if (isLearnByDoingWidgetType(widget.type)) {
                            return (
                              <LabLearningWidget
                                key={idx}
                                widgetType={widget.type}
                                config={widget.config}
                                widgetKey={`${currentStep.id}-lbd-${idx}`}
                              />
                            );
                          }
                          return null;
                        })}
                      </div>
                    ) : (
                      /* Legacy Fallback */
                      <div className="space-y-6">
                        {currentStep.instruction && (
                          <Markdown className="text-base text-muted-foreground leading-relaxed">
                            {currentStep.instruction}
                          </Markdown>
                        )}
                        {currentStep.requiresInput && (
                          <EditorWidget
                            label="Your Response"
                            placeholder="Type your answer here..."
                            initialValue={createEditorValue(stepResponses[currentStep.id] || "")}
                            onChange={(value) => setStepResponses({...stepResponses, [currentStep.id]: extractPlainText(value)})}
                            height="250px"
                          />
                        )}
                      </div>
                    )}

                    {/* Feedback Display */}
                    {stepFeedback[currentStep.id] && (
                      <Card className={cn(
                        "border-2",
                        stepFeedback[currentStep.id].approved ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"
                      )}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            {stepFeedback[currentStep.id].approved ? (
                              <Check className="w-5 h-5 text-green-500 mt-0.5" />
                            ) : (
                              <Info className="w-5 h-5 text-amber-500 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium mb-1">
                                {stepFeedback[currentStep.id].approved ? "Great work!" : "Keep going!"}
                              </p>
                              <p className="text-sm text-muted-foreground">{stepFeedback[currentStep.id].text}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || aiLoading || (currentStep.requiresInput && !stepResponses[currentStep.id]?.trim() && !stepResponses[`${currentStep.id}-choice`]?.trim())}
                        className="min-w-[150px]"
                      >
                        {isSubmitting || aiLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Reviewing...
                          </>
                        ) : (
                          "Submit for Feedback"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={(open) => {
        setShowCompletionModal(open);
        // If closing and there's no module context, don't navigate
        if (!open && !moduleContext) {
          // Just close the modal, user can review
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-center text-2xl">Lab Complete! 🎉</DialogTitle>
            <DialogDescription className="text-center text-base">
              Congratulations! You&apos;ve successfully completed <strong>{labTitle}</strong>. 
              Great work mastering these concepts!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              onClick={async () => {
                // Ensure lab is marked complete before navigating
                await markLabComplete();
                setShowCompletionModal(false);
                if (moduleContext?.onComplete) {
                  moduleContext.onComplete();
                } else {
                  window.location.href = "/labs";
                }
              }}
              className="w-full"
            >
              {moduleContext ? "Continue to Next Module" : "Back to Labs"}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowCompletionModal(false)}
              className="w-full"
            >
              Review Lab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lab Overview Dialog */}
      <Dialog open={showLabOverview} onOpenChange={setShowLabOverview}>
        <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[90vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{labTitle}</DialogTitle>
            <DialogDescription className="sr-only">
              Overall lab instructions and problem statement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Lab Description */}
            {description && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{convertNewlines(description)}</Markdown>
                </div>
              </div>
            )}

            {/* Problem Statement */}
            {data.problemStatement && data.problemStatement !== "No problem statement provided." && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Problem Statement</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{convertNewlines(data.problemStatement)}</Markdown>
                </div>
              </div>
            )}

            {/* Hints if available */}
            {hints && hints.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Available Hints</h3>
                <div className="space-y-3">
                  {hints.map((hintItem, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                      <div className="flex-1 text-sm leading-relaxed">
                        {typeof hintItem === 'string' ? hintItem : hintItem.hint}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowLabOverview(false)} className="w-full sm:w-auto">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
