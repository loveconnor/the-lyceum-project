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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
  prompt?: string;
  requiresInput?: boolean;
}

const INITIAL_STEPS = (stepPrompts: BuildLabData['stepPrompts']): Step[] => [
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

interface BuildTemplateProps {
  data: BuildLabData;
  labId?: string;
}

export default function BuildTemplate({ data, labId }: BuildTemplateProps) {
  const { labTitle, description, initialCode, language, testCases, hints, stepPrompts } = data;
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS(stepPrompts));
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("coach");
  const [commandInput, setCommandInput] = useState("");
  
  // Step-specific responses
  const [stepResponses, setStepResponses] = useState<Record<string, string>>({
    understand: "",
    design: "",
    test: "",
    explain: ""
  });
  
  // Explanation step fields
  const [timeComplexity, setTimeComplexity] = useState("");
  const [complexityJustification, setComplexityJustification] = useState("");

  const handleRunCode = () => {
    setIsRunning(true);
    setOutput((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Starting tests...`]);
    
    // Simulate code execution and testing with teaching hints
    setTimeout(() => {
      setOutput((prev) => [
        ...prev, 
        "✓ Test Case 1: 'babad' -> 'bab' (Passed)", 
        "✓ Test Case 2: 'cbbd' -> 'bb' (Passed)", 
        "✗ Test Case 3: 'a' -> 'a' (Failed: Expected 'a', got '')",
        "  💡 Hint: This test fails for single-character strings. What's the simplest palindrome?",
        "✗ Test Case 4: 'ac' -> 'a' (Failed: Expected 'a', got '')",
        "  💡 Hint: Your solution revisits the same substrings multiple times.",
        `[${new Date().toLocaleTimeString()}] Tests completed with 2 errors.`
      ]);
      setIsRunning(false);
      setActiveTab("checks");
    }, 1200);
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

  const completeStep = (id: string) => {
    setSteps(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1) return prev;
      
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], status: "completed" };
      
      if (index + 1 < newSteps.length) {
        newSteps[index + 1] = { ...newSteps[index + 1], status: "current" };
      }
      
      return newSteps;
    });
  };

  const currentStep = steps.find(s => s.status === "current") || steps[steps.length - 1];

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Step List */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={25} className="border-r bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                {labTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="p-4 space-y-2">
                {steps.map((step, index) => (
                  <div 
                    key={step.id}
                    className={cn(
                      "group flex items-start gap-3 p-3 rounded-xl transition-all duration-200",
                      step.status === "current" 
                        ? "bg-primary/10 border border-primary/20 shadow-sm" 
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <div className="mt-0.5">
                      {step.status === "completed" ? (
                        <div className="bg-primary rounded-full p-0.5">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      ) : step.status === "current" ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-primary" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className={cn(
                        "text-sm font-medium leading-none",
                        step.status === "pending" && "text-muted-foreground/60",
                        step.status === "current" && "text-primary"
                      )}>
                        {step.title}
                      </p>
                      {step.status === "current" && step.prompt && (
                        <div className="pt-2 space-y-2">
                          <p className="text-xs text-muted-foreground italic leading-relaxed">
                            {step.prompt}
                          </p>
                          {step.requiresInput && step.id !== "implement" && (
                            <Textarea
                              placeholder="Type your response..."
                              className="text-xs min-h-[60px] resize-none"
                              value={stepResponses[step.id] || ""}
                              onChange={(e) => setStepResponses(prev => ({
                                ...prev,
                                [step.id]: e.target.value
                              }))}
                            />
                          )}
                        </div>
                      )}
                      {step.status === "current" && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-auto p-0 text-xs text-primary/80 hover:text-primary"
                          onClick={() => completeStep(step.id)}
                          disabled={step.requiresInput && !stepResponses[step.id]?.trim() && step.id !== "implement"}
                        >
                          Mark as complete <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
                      solution.ts
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => setCode(initialCode)}
                    >
                      Reset
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-8 text-xs gap-1.5 shadow-sm"
                      onClick={handleRunCode}
                      disabled={isRunning}
                    >
                      {isRunning ? (
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      Run Tests
                    </Button>
                  </div>
                </div>
                <div className="flex-1 relative bg-[#1e1e1e]">
                  <Editor
                    height="100%"
                    defaultLanguage={language}
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      readOnly: false,
                      automaticLayout: true,
                      padding: { top: 16, bottom: 16 }
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

        {/* Right Panel: Coach + Checks */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="border-l bg-muted/5">
          <div className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="px-4 pt-4 border-b">
                <TabsList className="w-full grid grid-cols-2 h-9 bg-muted/50 p-1">
                  <TabsTrigger value="coach" className="text-xs gap-2 data-[state=active]:bg-background">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Coach
                  </TabsTrigger>
                  <TabsTrigger value="checks" className="text-xs gap-2 data-[state=active]:bg-background">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Checks
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="coach" className="flex-1 m-0 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-5 space-y-8">
                    {currentStep.id === "understand" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <MessageSquare className="w-4 h-4 text-primary" />
                          </div>
                          <h3 className="text-sm font-semibold">Understanding the Problem</h3>
                        </div>
                        <Card className="border-none bg-primary/5 shadow-none">
                          <CardContent className="p-4 text-sm leading-relaxed text-muted-foreground">
                            <p>Read the problem statement carefully. What are the inputs and expected outputs?</p>
                            <div className="mt-3 p-2 bg-background/50 rounded border border-primary/10 text-xs italic">
                              "Can you rephrase the problem in your own words without looking at the description?"
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {currentStep.id === "design" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <Lightbulb className="w-4 h-4 text-primary" />
                          </div>
                          <h3 className="text-sm font-semibold">Designing Your Approach</h3>
                        </div>
                        <Card className="border-none bg-primary/5 shadow-none">
                          <CardContent className="p-4 text-sm leading-relaxed text-muted-foreground">
                            <p>{hints.find(h => h.stepId === "design")?.hint || "Think about the algorithm and data structures you'll need."}</p>
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-medium">Consider:</p>
                              <ul className="text-xs space-y-1 list-disc list-inside">
                                <li>What's the brute force approach?</li>
                                <li>How can you optimize it?</li>
                                <li>What edge cases should you handle?</li>
                              </ul>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {currentStep.id === "implement" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <Code2 className="w-4 h-4 text-primary" />
                          </div>
                          <h3 className="text-sm font-semibold">Implementation Tips</h3>
                        </div>
                        <Card className="border-none bg-primary/5 shadow-none">
                          <CardContent className="p-4 space-y-3">
                            <p className="text-sm text-muted-foreground">Write your code in the editor. Remember to:</p>
                            <ul className="text-xs space-y-2 list-disc list-inside text-muted-foreground">
                              <li>Start with the simplest case</li>
                              <li>Add complexity incrementally</li>
                              <li>Test frequently with the Run button</li>
                              <li>Read error messages carefully</li>
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {currentStep.id === "test" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <Play className="w-4 h-4 text-primary" />
                          </div>
                          <h3 className="text-sm font-semibold">Testing & Debugging</h3>
                        </div>
                        <Card className="border-none bg-primary/5 shadow-none">
                          <CardContent className="p-4 text-sm leading-relaxed text-muted-foreground">
                            <p>{hints.find(h => h.stepId === "test")?.hint || "Run the tests and fix any errors."}</p>
                            <div className="mt-3 p-2 bg-background/50 rounded border border-primary/10 text-xs">
                              <p className="font-medium mb-1">Debugging Strategy:</p>
                              <ol className="list-decimal list-inside space-y-1">
                                <li>Identify which test fails first</li>
                                <li>Understand why it fails</li>
                                <li>Fix the issue</li>
                                <li>Re-run all tests</li>
                              </ol>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {currentStep.id === "explain" ? (
                      // Complexity Analysis Section (for Explain step)
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                              <Code2 className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="text-sm font-semibold">Complexity Analysis</h3>
                          </div>
                          <Card className="border bg-card shadow-none">
                            <CardContent className="p-4 space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="time-complexity" className="text-xs font-medium">
                                  Time Complexity
                                </Label>
                                <Select value={timeComplexity} onValueChange={setTimeComplexity}>
                                  <SelectTrigger id="time-complexity" className="text-xs h-9">
                                    <SelectValue placeholder="Select complexity..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="O(1)">O(1) - Constant</SelectItem>
                                    <SelectItem value="O(log n)">O(log n) - Logarithmic</SelectItem>
                                    <SelectItem value="O(n)">O(n) - Linear</SelectItem>
                                    <SelectItem value="O(n log n)">O(n log n) - Linearithmic</SelectItem>
                                    <SelectItem value="O(n²)">O(n²) - Quadratic</SelectItem>
                                    <SelectItem value="O(n³)">O(n³) - Cubic</SelectItem>
                                    <SelectItem value="O(2^n)">O(2^n) - Exponential</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="complexity-why" className="text-xs font-medium">
                                  Why? (Explain your reasoning)
                                </Label>
                                <Textarea
                                  id="complexity-why"
                                  placeholder="Explain why your solution has this complexity..."
                                  className="text-xs min-h-[80px] resize-none"
                                  value={complexityJustification}
                                  onChange={(e) => setComplexityJustification(e.target.value)}
                                />
                              </div>
                              
                              {!timeComplexity || !complexityJustification.trim() ? (
                                <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                                  <p className="text-[10px] text-amber-700 leading-relaxed">
                                    Required to submit your solution
                                  </p>
                                </div>
                              ) : null}
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ) : (
                      // Regular Coach Hints (for other steps)
                      <>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                              <MessageSquare className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="text-sm font-semibold">AI Coach Hints</h3>
                          </div>
                          <Card className="border-none bg-primary/5 shadow-none">
                            <CardContent className="p-4 text-sm leading-relaxed text-muted-foreground">
                              <p>For the longest palindromic substring, consider the <strong>"Expand Around Center"</strong> approach. Each character (and the gap between characters) can be a potential center of a palindrome.</p>
                              <div className="mt-3 p-2 bg-background/50 rounded border border-primary/10 text-xs italic">
                                "Think about how many centers a string of length N has."
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-amber-500/10">
                              <HelpCircle className="w-4 h-4 text-amber-500" />
                            </div>
                            <h3 className="text-sm font-semibold">Conceptual Prompts</h3>
                          </div>
                          <div className="space-y-2">
                            {[
                              "What is the time complexity of a brute force approach?",
                              "How does the 'Expand Around Center' improve efficiency?",
                              "Can this be solved using Dynamic Programming?"
                            ].map((prompt, i) => (
                              <button 
                                key={i} 
                                className="w-full text-left text-xs p-3 rounded-xl border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 group"
                              >
                                <span className="flex items-center justify-between">
                                  {prompt}
                                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="checks" className="flex-1 m-0 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-5 space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Lab Requirements</h3>
                      <div className="space-y-2">
                        {[
                          { label: "Define function signature", done: true },
                          { label: "Implement palindrome check", done: true },
                          { label: "Handle single character strings", done: false },
                          { label: "Pass all performance tests", done: false },
                        ].map((check, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs p-2 rounded-lg hover:bg-muted/30 transition-colors">
                            {check.done ? (
                              <div className="bg-emerald-500/20 p-0.5 rounded">
                                <Check className="w-3 h-3 text-emerald-600" />
                              </div>
                            ) : (
                              <div className="border-2 border-muted-foreground/20 w-4 h-4 rounded" />
                            )}
                            <span className={cn(
                              check.done ? "text-muted-foreground line-through" : "text-foreground font-medium"
                            )}>
                              {check.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Separator className="opacity-50" />

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Test Suite</h3>
                      {output.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                            <span>Results</span>
                            <span className="text-red-500">2/4 Passed</span>
                          </div>
                          <div className="space-y-2">
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <div className="flex items-center gap-2 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="font-medium">Basic Palindrome</span>
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <div className="flex items-center gap-2 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="font-medium">Even Length Palindrome</span>
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
                              <div className="flex items-center gap-2 text-xs text-red-600">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span className="font-medium">Single Character</span>
                              </div>
                              <div className="flex items-start gap-2 pl-5">
                                <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                  This test fails for single-character strings. What's the simplest palindrome?
                                </p>
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
                              <div className="flex items-center gap-2 text-xs text-red-600">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span className="font-medium">Empty String</span>
                              </div>
                              <div className="flex items-start gap-2 pl-5">
                                <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                  Your solution revisits the same substrings multiple times.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                          <div className="p-3 rounded-full bg-muted/50">
                            <Play className="w-5 h-5 text-muted-foreground/40" />
                          </div>
                          <p className="text-xs text-muted-foreground">Run tests to see detailed results</p>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
            
            <div className="p-4 border-t bg-muted/20">
              <Button 
                className="w-full shadow-sm" 
                variant="default"
                disabled={
                  steps.some(s => s.status !== "completed") ||
                  !timeComplexity ||
                  !complexityJustification.trim()
                }
              >
                {steps.some(s => s.status !== "completed") 
                  ? "Complete all steps to submit"
                  : !timeComplexity || !complexityJustification.trim()
                    ? "Complete explanation to submit"
                    : "Submit Solution"}
              </Button>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
