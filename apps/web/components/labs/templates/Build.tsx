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
  ThumbsDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useLabAI } from "@/hooks/use-lab-ai";
import { toast } from "sonner";

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
  instruction?: string;
  keyQuestions?: string[];
  prompt?: string;
  requiresInput?: boolean;
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
      requiresInput: true
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
  const [feedback, setFeedback] = useState<{ text: string; approved: boolean } | null>(null);
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
    setFeedback(null);
    
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
          const execParsed = JSON.parse(execResponse);
          
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
        const parsed = JSON.parse(response);
        
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
          setFeedback({ 
            text: parsed.overallFeedback || "All tests passed! Great work. Moving to the next step.", 
            approved: true 
          });
          setTimeout(() => {
            completeStep(currentStep?.id || "", isImplementStep);
            setFeedback(null);
          }, 2000);
        } else {
          // Tests failed
          if (isTestDebugStep) {
            // On test/debug steps, provide specific debugging feedback without "Continue" button
            setFeedback({ 
              text: parsed.overallFeedback || "Some tests failed. Review the output above, use print statements to inspect values, and try again.", 
              approved: false 
            });
          } else {
            // On implementation steps, allow continuing to debug step
            setFeedback({ 
              text: parsed.overallFeedback || "Some tests failed. Review the feedback and try again, or continue to debug.", 
              approved: false 
            });
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
    if (!labId) return;
    
    try {
      const { updateLabProgress } = await import("@/lib/api/labs");
      await updateLabProgress(labId, {
        step_id: stepId,
        step_data: {
          stepResponses,
          code,
          testResults,
          output
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
    const stepName = currentStep.title;

    if (!userResponse?.trim() && currentStep.requiresInput) {
      toast.error("Please provide an answer before submitting");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Save progress as user submits (not completed yet)
      await saveProgress(currentStep.id, false);
      
      const prompt = `You are a coding instructor reviewing a student's ${stepName.toLowerCase()} for learning to code.

Step instruction: ${currentStep.instruction || currentStep.title}
${currentStep.keyQuestions ? `Key questions: ${currentStep.keyQuestions.join(', ')}` : ''}

Student's response:
${userResponse}

Current code they're working on:
\`\`\`${detectedLanguage}
${code}
\`\`\`

Evaluate if their response demonstrates understanding. Respond ONLY in this JSON format:
{
  "approved": true/false,
  "feedback": "Brief constructive feedback (2-3 sentences)"
}

Approve if they show reasonable understanding. If not approved, explain what's missing.`;

      const response = await getAssistance(prompt, { step: currentStep.id, code });
      
      try {
        const parsed = JSON.parse(response);
        setFeedback({ text: parsed.feedback, approved: parsed.approved });
        
        if (parsed.approved) {
          setTimeout(async () => {
            await completeStep(currentStep.id, false);
            setFeedback(null);
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
    !currentStep.requiresInput
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Step List */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={25} className="border-r bg-muted/5">
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {steps.map((step) => {
                  const isAccessible = step.status === "completed" || step.status === "current" || accessedSteps.has(step.id);
                  return (
                    <button
                      key={step.id}
                      ref={step.status === "current" ? currentStepRef : null}
                      onClick={() => goToStep(step.id)}
                      disabled={!isAccessible}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-all duration-200",
                        step.status === "current" 
                          ? "bg-primary/10 border border-primary/20 text-primary font-medium" 
                          : step.status === "completed"
                          ? "text-foreground hover:bg-muted/50 cursor-pointer"
                          : isAccessible
                          ? "text-foreground hover:bg-muted/50 cursor-pointer"
                          : "text-muted-foreground/60 cursor-not-allowed"
                      )}
                    >
                      <p className="text-sm">{step.title}</p>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center Panel: Primary Workspace (Code Editor) */}
        <ResizablePanel defaultSize={55} minSize={40}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={75} minSize={30}>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-background rounded border text-xs font-medium">
                      <Code2 className="w-3.5 h-3.5 text-blue-500" />
                      solution.{getFileExtension()}
                    </div>
                    {!isCodeEditable && (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold py-0 h-5">
                        Read Only
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => setCode(initialCode)}
                      disabled={!isCodeEditable}
                    >
                      Reset
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-8 text-xs gap-1.5 shadow-sm"
                      onClick={handleRunCode}
                      disabled={isRunning || !isCodeEditable}
                    >
                      {isRunning ? (
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      {(currentStep?.id.includes("test") || currentStep?.id.includes("debug")) ? "Run" : "Run Tests"}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 relative bg-[#1e1e1e]">
                  <Editor
                    height="100%"
                    language={detectedLanguage}
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      readOnly: !isCodeEditable,
                      automaticLayout: true,
                      padding: { top: 16, bottom: 16 },
                      domReadOnly: !isCodeEditable,
                    }}
                  />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

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
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Coach Workspace */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="border-l bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b bg-background">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                Coding Workspace
              </h3>
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="p-5 space-y-6">
                {currentStep ? (
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {steps.findIndex(s => s.status === "current") + 1}. {currentStep.title}
                    </label>
                    
                    {currentStep.instruction ? (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {currentStep.instruction}
                      </p>
                    ) : (currentStep.id.includes("test") || currentStep.id.includes("debug")) && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Run the provided test cases. If a test fails, use print statements or a debugger to inspect variable values and fix the logic. Add a main method to test your code manually if needed.
                      </p>
                    )}
                    
                    {currentStep.keyQuestions && currentStep.keyQuestions.length > 0 ? (
                      <Card className="border-none bg-primary/5 shadow-none">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-xs font-medium">Key Questions:</p>
                          <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                            {currentStep.keyQuestions.map((q: string, i: number) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ) : (currentStep.id.includes("test") || currentStep.id.includes("debug")) && (
                      <Card className="border-none bg-primary/5 shadow-none">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-xs font-medium">Key Questions:</p>
                          <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                            <li>Does the method produce the expected output for the sample inputs?</li>
                            <li>What happens with edge cases (empty arrays, negative numbers, etc.)?</li>
                            <li>Are there off-by-one errors in loop bounds?</li>
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    
                    {currentStep.prompt ? (
                      <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Eye className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed font-medium">
                          {currentStep.prompt}
                        </p>
                      </div>
                    ) : (currentStep.id.includes("test") || currentStep.id.includes("debug")) && (
                      <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Eye className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed font-medium">
                          If a test fails, add System.out.println() statements to check variable values at key points. Double-check the loop condition and modulo checks. Remember that &apos;||&apos; means logical OR.
                        </p>
                      </div>
                    )}
                    
                    {!isCodeEditable && currentStep.requiresInput && (
                      <Textarea 
                        placeholder="Type your answer here..."
                        className="min-h-[120px] text-sm"
                        value={stepResponses[currentStep.id] || ""}
                        onChange={(e) => setStepResponses({...stepResponses, [currentStep.id]: e.target.value})}
                      />
                    )}
                    
                    {!currentStep.instruction && !currentStep.keyQuestions && !currentStep.prompt && (
                      <Card className="border-none bg-muted/5 shadow-none">
                        <CardContent className="p-4 text-sm text-muted-foreground">
                          <p>Work on this step in the code editor and mark it as complete when you're done.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">No current step</p>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {feedback && (
              <div className={cn(
                "mx-4 mb-4 p-4 rounded-lg border-2",
                feedback.approved 
                  ? "bg-green-50 border-green-500 dark:bg-green-950" 
                  : "bg-amber-50 border-amber-500 dark:bg-amber-950"
              )}>
                <div className="flex items-start gap-3">
                  {feedback.approved ? (
                    <ThumbsUp className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  ) : (
                    <ThumbsDown className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-semibold mb-1",
                      feedback.approved ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
                    )}>
                      {feedback.approved ? "Great work!" : "Needs improvement"}
                    </p>
                    <p className="text-sm text-foreground/80">{feedback.text}</p>
                    {feedback.approved ? (
                      (() => {
                        const currentStepIndex = steps.findIndex(s => s.status === "current");
                        const isLastStep = currentStepIndex === steps.length - 1;
                        return (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {isLastStep ? "Completing lab..." : "Moving to next step..."}
                          </p>
                        );
                      })()
                    ) : (
                      // Show continue button for failed tests ONLY if in implementation step (not test/debug)
                      isCodeEditable && !(currentStep?.id.includes("test") || currentStep?.id.includes("debug")) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => {
                            completeStep(currentStep?.id || "", false);
                            setFeedback(null);
                          }}
                        >
                          Continue to Debug
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {!isCodeEditable && currentStep?.requiresInput && (
              <div className="p-4 border-t bg-background">
                <Button 
                  className="w-full shadow-sm" 
                  variant="default"
                  onClick={handleSubmit}
                  disabled={!currentStep || !stepResponses[currentStep.id]?.trim() || isSubmitting || aiLoading}
                >
                  {isSubmitting || aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reviewing...
                    </>
                  ) : (
                    "Submit for Feedback"
                  )}
                </Button>
              </div>
            )}
          </div>
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
