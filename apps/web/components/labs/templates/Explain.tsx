"use client";

import React, { useState } from "react";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Editor from "@monaco-editor/react";
import { 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  MessageSquare, 
  History,
  HelpCircle,
  ChevronRight,
  Check,
  Eye,
  Brain,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
}

const INITIAL_STEPS: Step[] = [
  { id: "read", title: "Read / inspect", status: "current" },
  { id: "predict", title: "Predict behavior", status: "pending" },
  { id: "explain", title: "Explain reasoning", status: "pending" },
  { id: "edge-cases", title: "Address edge cases", status: "pending" },
];

interface ExplainTemplateProps {
  labTitle?: string;
}

export default function ExplainTemplate({ labTitle = "Two Sum" }: ExplainTemplateProps) {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [artifactCode] = useState(`/**
 * Analyze this function and explain its behavior.
 * 
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  const map = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    
    map.set(nums[i], i);
  }
  
  return [];
}

// Consider: What happens if there are multiple solutions?
// Consider: What is the time and space complexity?
`);

  const [explanations, setExplanations] = useState({
    prediction: "",
    reasoning: "",
    edgeCases: "",
    spaceComplexity: ""
  });
  
  const currentStepIndex = steps.findIndex(s => s.status === "current");
  const isPredictionComplete = explanations.prediction.trim().length > 0;

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

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Step List */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={25} className="border-r bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {labTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Reason about the artifact to complete the lab.</p>
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="p-4 space-y-2">
                {steps.map((step) => (
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
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium leading-none",
                        step.status === "pending" && "text-muted-foreground/60",
                        step.status === "current" && "text-primary"
                      )}>
                        {step.title}
                      </p>
                      {step.status === "current" && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-auto p-0 text-xs mt-2 text-primary/80 hover:text-primary"
                          onClick={() => completeStep(step.id)}
                          disabled={step.id === "predict" && !isPredictionComplete}
                        >
                          {step.id === "predict" && !isPredictionComplete 
                            ? "Submit prediction to continue" 
                            : "Mark as complete"} <ChevronRight className="w-3 h-3 ml-1" />
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

        {/* Center Panel: Artifact (Read-only) */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-background rounded border text-xs font-medium">
                  <Eye className="w-3.5 h-3.5 text-blue-500" />
                  artifact.js
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold py-0 h-5">
                  Read Only
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Report Issue
                </Button>
              </div>
            </div>
            <div className="flex-1 relative bg-[#1e1e1e]">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={artifactCode}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: true,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                  domReadOnly: true,
                }}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Explanation Prompts */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="border-l bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b bg-background">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Explanation Workspace
              </h3>
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="p-5 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      1. Predict Behavior
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Given `nums = [2, 7, 11, 15]` and `target = 9`, what will this function return?
                    </p>
                    <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                        Do not run the code. Reason it out mentally.
                      </p>
                    </div>
                    <Textarea 
                      placeholder="Type your prediction here..."
                      className="min-h-[80px] text-sm"
                      value={explanations.prediction}
                      onChange={(e) => setExplanations({...explanations, prediction: e.target.value})}
                      disabled={currentStepIndex > 1}
                    />
                    {!isPredictionComplete && currentStepIndex === 1 && (
                      <p className="text-[10px] text-muted-foreground italic">
                        Required to proceed to next step
                      </p>
                    )}
                  </div>

                  <Separator className="opacity-50" />

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      2. Explain Reasoning
                    </label>
                    <p className="text-sm text-muted-foreground">
                      How does the `Map` help optimize the search for the complement?
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Reference specific lines in the code in your explanation (e.g., "Line 10 checks...")
                    </p>
                    <Textarea 
                      placeholder="Explain the logic..."
                      className="min-h-[120px] text-sm"
                      value={explanations.reasoning}
                      onChange={(e) => setExplanations({...explanations, reasoning: e.target.value})}
                    />
                  </div>

                  <Separator className="opacity-50" />

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      3. Edge Cases
                    </label>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        • Does this implementation handle duplicate values correctly?
                      </p>
                      <p className="text-sm text-muted-foreground">
                        • What assumption does this solution make about solutions existing?
                      </p>
                      <p className="text-sm text-muted-foreground">
                        • What happens if the array has only one element?
                      </p>
                    </div>
                    <Textarea 
                      placeholder="Address each edge case..."
                      className="min-h-[100px] text-sm"
                      value={explanations.edgeCases}
                      onChange={(e) => setExplanations({...explanations, edgeCases: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-semibold">Concept Check</h4>
                  </div>
                  
                  <Card className="border-none bg-primary/5 shadow-none">
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-2">
                        <p className="text-xs font-medium">What additional memory does this algorithm use, and why?</p>
                        <Textarea 
                          placeholder="Explain space complexity..."
                          className="min-h-[60px] text-xs"
                          value={explanations.spaceComplexity}
                          onChange={(e) => setExplanations({...explanations, spaceComplexity: e.target.value})}
                        />
                      </div>
                      
                      <Separator className="opacity-50" />
                      
                      <p className="text-xs font-medium">What is the time complexity of this implementation?</p>
                      <div className="grid grid-cols-1 gap-2">
                        {["O(n²)", "O(n log n)", "O(n)", "O(1)"].map((opt) => (
                          <Button key={opt} variant="outline" size="sm" className="justify-start text-xs h-8 bg-background">
                            {opt}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-background">
              <Button className="w-full shadow-sm" variant="default">
                Submit Explanation
              </Button>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
