"use client";

import React, { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
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
  Play, 
  CheckCircle2, 
  Circle, 
  Lightbulb, 
  MessageSquare, 
  Terminal,
  HelpCircle,
  Code2,
  ChevronRight,
  AlertCircle,
  Check,
  Eye,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Info
} from "lucide-react";
import { cn, extractJSON } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useLabAI } from "@/hooks/use-lab-ai";
import { toast } from "sonner";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { TextInputWidget } from "@/components/labs/widgets/text-input-widget";
import { MultipleChoiceWidget } from "@/components/labs/widgets/multiple-choice-widget";
import { CodeEditorWidget } from "@/components/labs/widgets/code-editor-widget";

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
  instruction?: string;
  keyQuestions?: string[];
  prompt?: string;
  requiresInput?: boolean;
  widgets?: Array<{
    type: "text-input" | "multiple-choice" | "code-editor";
    config: any;
  }>;
}

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
      widgets: (step as any).widgets
    }));
  }
  
  // Otherwise use legacy format
  if (!stepPrompts) {
    return [
      { id: "implement", title: "Implement", status: "current", prompt: "Write your solution in the code editor" }
    ];
  }
  
  return [
    { 
      id: "understand", 
      title: "Understand problem", 
      status: "current",
      prompt: stepPrompts.understand,
      requiresInput: true
    },
    { 
      id: "design", 
      title: "Design approach", 
      status: "pending",
      prompt: stepPrompts.design,
      requiresInput: true
    },
    { 
      id: "implement", 
      title: "Implement", 
      status: "pending",
      prompt: "Write your solution in the code editor"
    },
    { 
      id: "test", 
      title: "Test & debug", 
      status: "pending",
      prompt: stepPrompts.test,
      requiresInput: true
    },
    { 
      id: "explain", 
      title: "Explain solution", 
      status: "pending",
      prompt: stepPrompts.explain,
      requiresInput: true
    },
  ];
};

interface BuildTemplateProps {
  data: BuildLabData;
  labId?: string;
}

export default function BuildTemplate({ data, labId }: BuildTemplateProps) {
  const { labTitle, description, initialCode, language, testCases, hints, stepPrompts, steps: aiSteps } = data;
  
  // Ensure language is valid, fallback to detecting from code or default to java
  const detectedLanguage = language || 'java';
  
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS(stepPrompts, aiSteps));
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  
  // Dynamic step responses based on step IDs
  const [stepResponses, setStepResponses] = useState<Record<string, string>>({});
  const [accessedSteps, setAccessedSteps] = useState<Set<string>>(new Set());
  
  // AI feedback state
  const [stepFeedback, setStepFeedback] = useState<Record<string, { text: string; approved: boolean; correctIds?: string[]; incorrectIds?: string[] }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getAssistance, loading: aiLoading } = labId ? useLabAI(labId) : { getAssistance: null, loading: false };
  const currentStepRef = React.useRef<HTMLButtonElement>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  // Get file extension based on language
  const getFileExtension = () => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      go: 'go',
      rust: 'rs',
      ruby: 'rb'
    };
    return extensions[detectedLanguage] || 'java';
  };
  
  // Explanation step fields
  const [timeComplexity, setTimeComplexity] = useState("");
  const [complexityJustification, setComplexityJustification] = useState("");
  const [testResults, setTestResults] = useState<Array<{ passed: boolean; description: string; feedback?: string }>>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  // Helper function to auto-wrap math notation for preview
  const previewWithMath = (text: string): string => {
    // If already has $ signs, return as is
    if (text.includes('$')) return text;
    
    // If it contains LaTeX commands or complex operators and is relatively short,
    // treat the whole thing as a single mathematical expression.
    const words = text.trim().split(/\s+/);
    const hasComplexMath = /\\|[\^_{}]/.test(text);
    if (hasComplexMath && words.length <= 5) {
      return `$${text.trim()}$`;
    }
    
    // Split by periods and newlines to handle sentences separately
    const sentences = text.split(/([.!?\n]+)/);
    
    return sentences.map(sentence => {
      // Check if this sentence/fragment contains math patterns
      const hasMathOperators = /[\^*/+\-=\\__{}]|sin|cos|tan|log|ln|sqrt|exp|lim|int|sum|prod|alpha|beta|gamma|delta|theta|pi/i.test(sentence);
      
      if (hasMathOperators) {
        // Wrap entire mathematical expressions in inline math
        return sentence
          // Wrap expressions with operators or LaTeX commands
          .replace(/((?:[a-zA-Z0-9()\s\^*/+\-=\\__{}]+)?(?:sin|cos|tan|log|ln|sqrt|exp|int|sum|prod|lim|frac|partial|alpha|beta|gamma|delta|theta|pi)[a-zA-Z0-9()\s\^*/+\-=\\__{}]*)/gi, (match) => {
            // Don't wrap if it's just plain words without operators or backslashes
            if (/[\^*/+\-=\\__{}]/.test(match) || /sin|cos|tan|log|ln|sqrt|exp|int|sum|prod|lim|frac|partial|\\/.test(match)) {
              // If it's just a word like "integral" or "sum" without operators, don't wrap
              if (/^[a-zA-Z]+$/.test(match.trim()) && !/sin|cos|tan|log|ln|sqrt|exp/.test(match.trim())) {
                return match;
              }
              return `$${match.trim()}$`;
            }
            return match;
          })
          // Catch remaining patterns: standalone x^2, e^x, etc.
          .replace(/\b([a-zA-Z]+\^[a-zA-Z0-9]+)\b/g, '$$$1$$')
          .replace(/\b([a-zA-Z]+_[a-zA-Z0-9]+)\b/g, '$$$1$$') // subscripts
          // Clean up double wrapping
          .replace(/\$\$+/g, '$');
      }
      
      return sentence;
    }).join('');
  };

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
          // Restore step feedback from all progress entries
          const feedbackMap: Record<string, any> = {};
          progress.forEach((p: any) => {
            if (p.step_data?.feedback) {
              feedbackMap[p.step_id] = p.step_data.feedback;
            }
          });
          setStepFeedback(feedbackMap);

          // Sort progress by timestamp to get the most recent
          const sortedProgress = [...progress].sort((a, b) => {
            const timeA = new Date(a.updated_at || a.created_at).getTime();
            const timeB = new Date(b.updated_at || b.created_at).getTime();
            return timeB - timeA;
          });
          
          const mostRecent = sortedProgress[0];
          const latestStepId = mostRecent?.step_id;
          
          // Restore data from most recent progress entry
          if (mostRecent?.step_data) {
            if (mostRecent.step_data.stepResponses) {
              setStepResponses(mostRecent.step_data.stepResponses);
            }
            if (mostRecent.step_data.code) {
              setCode(mostRecent.step_data.code);
            }
            if (mostRecent.step_data.testResults) {
              setTestResults(mostRecent.step_data.testResults);
            }
            if (mostRecent.step_data.output) {
              setOutput(mostRecent.step_data.output);
            }
          }

          // Restore step completion status
          const completedStepIds = progress.filter((p: any) => p.completed).map((p: any) => p.step_id);
          const stepsWithProgress = progress.map((p: any) => p.step_id);
          
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
            }
            
            return newSteps;
          });
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

  // Check if all steps are completed and show modal
  React.useEffect(() => {
    const allCompleted = steps.length > 0 && steps.every(s => s.status === "completed");
    if (allCompleted && !showCompletionModal) {
      setShowCompletionModal(true);
    }
  }, [steps, showCompletionModal]);

  // Mark current step as accessed
  React.useEffect(() => {
    const currentStep = steps.find(s => s.status === "current");
    if (currentStep) {
      setAccessedSteps(prev => new Set([...prev, currentStep.id]));
    }
  }, [steps]);

  // Auto-save code and responses when they change (debounced)
  React.useEffect(() => {
    if (!labId || isLoadingProgress) return;
    
    const currentStep = steps.find(s => s.status === "current");
    if (!currentStep) return;

    const timer = setTimeout(() => {
      saveProgress(currentStep.id, false);
    }, 2000); // Auto-save after 2 seconds of no typing

    return () => clearTimeout(timer);
  }, [code, stepResponses, labId, isLoadingProgress]);

  // Add main method when entering test/debug step
  React.useEffect(() => {
    const currentStep = steps.find(s => s.status === "current");
    if (!currentStep) return;
    
    const isTestDebugStep = currentStep.id.includes("test") || currentStep.id.includes("debug");
    if (isTestDebugStep && detectedLanguage === "java" && !code.includes("public static void main")) {
      // Add main method for Java
      const mainMethod = `\n\n    public static void main(String[] args) {\n        // Test your methods here\n        int[] numbers = {1, 2, 3, 4, 5, 6};\n        System.out.println("Sum of even numbers: " + sumEven(numbers));\n        System.out.println("Maximum value: " + findMax(numbers));\n    }`;
      
      // Insert before last closing brace
      const lastBraceIndex = code.lastIndexOf("}");
      if (lastBraceIndex !== -1) {
        setCode(code.slice(0, lastBraceIndex) + mainMethod + "\n" + code.slice(lastBraceIndex));
      }
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

  const saveProgress = async (stepId: string, completed: boolean = false) => {
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
          feedback: stepFeedback[stepId]
        },
        completed
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  const completeStep = async (id: string, skipTestDebug: boolean = false) => {
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
        
        resolve(newSteps);
        return newSteps;
      });
    });
    
    // Check if all steps are completed and show modal
    const allCompleted = updatedSteps.every(s => s.status === "completed");
    console.log('Complete step called:', id);
    console.log('Updated steps:', updatedSteps.map(s => ({ id: s.id, status: s.status })));
    console.log('All completed?', allCompleted);
    
    if (allCompleted) {
      console.log('Triggering completion modal...');
      setTimeout(() => setShowCompletionModal(true), 500);
    }
  };

  const handleSubmit = async () => {
    const currentStep = steps.find(s => s.status === "current");
    if (!currentStep || !getAssistance) return;

    const userResponse = stepResponses[currentStep.id];
    const choiceResponse = stepResponses[`${currentStep.id}-choice`];
    const explainResponse = stepResponses[`${currentStep.id}-explain`];
    const stepName = currentStep.title;

    const hasResponse = userResponse?.trim() || choiceResponse?.trim() || explainResponse?.trim();

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

    const hasTextInput = currentStep.widgets 
      ? currentStep.widgets.some(w => w.type === 'text-input' || (w.type === 'multiple-choice' && w.config.showExplanation))
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
  
  // Determine if code editor should be read-only
  // Only allow editing during "implement" type steps or steps without text input requirements
  const isCodeEditable = currentStep && (
    currentStep.id === "implement" || 
    currentStep.id.includes("implement") ||
    currentStep.id.includes("code") ||
    currentStep.id.includes("write") ||
    currentStep.id.includes("test") ||
    currentStep.id.includes("debug") ||
    !currentStep.requiresInput ||
    currentStep.widgets?.some(w => w.type === "code-editor")
  );

  const hasCodeEditor = currentStep?.widgets?.some(w => w.type === "code-editor") || 
                        (!currentStep?.widgets && (currentStep?.id.includes("implement") || currentStep?.id.includes("code") || currentStep?.id.includes("write") || currentStep?.id.includes("test") || currentStep?.id.includes("debug")));

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Step List */}
        <LabStepPanel
          steps={steps}
          accessedSteps={accessedSteps}
          currentStepRef={currentStepRef}
          onStepClick={goToStep}
        />

        <ResizableHandle withHandle />

        {/* Center Panel: Primary Workspace */}
        <ResizablePanel defaultSize={75} minSize={40}>
          {hasCodeEditor ? (
            <ResizablePanelGroup direction="vertical">
              {/* Instructions Section */}
              <ResizablePanel defaultSize={20} minSize={10}>
                <ScrollArea className="h-full w-full">
                  <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
                    {/* Problem Statement */}
                    {data.problemStatement && data.problemStatement !== "No problem statement provided." && (
                      <div className="space-y-3">
                        <Badge variant="outline" className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold">
                          Instructions
                        </Badge>
                        <div className="text-lg font-serif leading-relaxed">
                          <Markdown>{data.problemStatement}</Markdown>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Widget Rendering (Non-code) */}
                    {currentStep && (
                      <div className="space-y-6 pb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">{steps.findIndex(s => s.id === currentStep.id) + 1}</span>
                          </div>
                          <h3 className="text-base font-semibold">
                            <Markdown>{currentStep.title}</Markdown>
                          </h3>
                        </div>

                        {currentStep.widgets ? (
                          <div className="space-y-6">
                            {currentStep.widgets.filter(w => w.type !== "code-editor").map((widget, idx) => {
                              if (widget.type === "text-input") {
                                return (
                                  <TextInputWidget
                                    key={idx}
                                    label={widget.config.label || ""}
                                    description={widget.config.description}
                                    placeholder={widget.config.placeholder || ""}
                                    value={stepResponses[currentStep.id] || ''}
                                    onChange={(value) => setStepResponses({...stepResponses, [currentStep.id]: value})}
                                    minHeight={widget.config.minHeight || "120px"}
                                    showPreview={widget.config.showPreview !== false}
                                    previewWithMath={widget.config.showPreview ? previewWithMath : undefined}
                                    mathMode={widget.config.mathMode === true}
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
                              <TextInputWidget
                                label="Your Response"
                                placeholder="Type your answer here..."
                                value={stepResponses[currentStep.id] || ""}
                                onChange={(value) => setStepResponses({...stepResponses, [currentStep.id]: value})}
                                minHeight="150px"
                                showPreview={true}
                                previewWithMath={previewWithMath}
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
                </ScrollArea>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Editor Section */}
              <ResizablePanel defaultSize={55} minSize={30}>
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
                <div className="flex flex-col h-full border-t bg-[#0d1117]">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Console Output</span>
                    </div>
                    <span className="text-[10px] text-white/20 font-mono">Type 'help' for commands</span>
                  </div>
                  <ScrollArea className="flex-1 h-0">
                    <div className="p-4 font-mono text-xs space-y-1.5">
                      {output.length === 0 ? (
                        <p className="text-white/20 italic">Click "Run Tests" or type 'test' in the console...</p>
                      ) : (
                        output.map((line, i) => (
                          <div key={i} className={cn(
                            "py-0.5 break-all",
                            line.startsWith(">") ? "text-blue-400 font-bold" :
                            line.startsWith("[") ? "text-white/40" : 
                            line.includes("✗") ? "text-red-400" : 
                            line.includes("✓") ? "text-emerald-400" : "text-gray-300"
                          )}>
                            {line}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <form onSubmit={handleCommandSubmit} className="p-2 border-t border-white/5 bg-black/20">
                    <div className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded border border-white/10 focus-within:border-primary/50 transition-colors">
                      <span className="text-primary font-bold text-xs select-none">$</span>
                      <input 
                        type="text"
                        value={commandInput}
                        onChange={(e) => setCommandInput(e.target.value)}
                        placeholder="Enter command..."
                        className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-gray-300 placeholder:text-white/10"
                      />
                    </div>
                  </form>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            /* No Editor Layout */
            <ScrollArea className="h-full w-full">
              <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
                {/* Problem Statement */}
                <div className="space-y-4">
                  <Badge variant="outline" className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold">
                    Problem Statement
                  </Badge>
                  <div className="text-xl font-serif leading-relaxed">
                    <Markdown>{data.problemStatement || description || "No problem statement provided."}</Markdown>
                  </div>
                </div>

                {/* Reference Code */}
                <div className="space-y-4">
                  <Badge variant="outline" className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold">
                    Reference Code
                  </Badge>
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
                        theme="vs-dark"
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

                    {currentStep.widgets ? (
                      <div className="space-y-8">
                        {currentStep.widgets.map((widget, idx) => {
                          if (widget.type === "text-input") {
                            return (
                              <TextInputWidget
                                key={idx}
                                label={widget.config.label || ""}
                                description={widget.config.description}
                                placeholder={widget.config.placeholder || ""}
                                value={stepResponses[currentStep.id] || ''}
                                onChange={(value) => setStepResponses({...stepResponses, [currentStep.id]: value})}
                                minHeight={widget.config.minHeight || "150px"}
                                showPreview={widget.config.showPreview !== false}
                                previewWithMath={widget.config.showPreview ? previewWithMath : undefined}
                                mathMode={widget.config.mathMode === true}
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
                          <TextInputWidget
                            label="Your Response"
                            placeholder="Type your answer here..."
                            value={stepResponses[currentStep.id] || ""}
                            onChange={(value) => setStepResponses({...stepResponses, [currentStep.id]: value})}
                            minHeight="200px"
                            showPreview={true}
                            previewWithMath={previewWithMath}
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
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
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
              onClick={() => window.location.href = "/labs"}
              className="w-full"
            >
              Back to Labs
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
    </div>
  );
}
