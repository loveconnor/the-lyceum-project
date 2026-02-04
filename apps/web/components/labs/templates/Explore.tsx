"use client";

import React, { useState } from "react";
import { ExploreLabData } from "@/types/lab-templates";
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
import { Slider } from "@/components/ui/slider";
import { 
  Compass, 
  Sparkles, 
  Lightbulb,
  PlayCircle,
  RotateCcw,
  BookOpen,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/custom/prompt/markdown";

interface Insight {
  id: string;
  text: string;
  timestamp: Date;
}

interface ExploreTemplateProps {
  data: ExploreLabData;
  labId?: string;
  moduleContext?: {
    pathId: string;
    moduleId: string;
    onComplete?: () => void;
  };
}

export default function ExploreTemplate({ data, labId, moduleContext }: ExploreTemplateProps) {
  const { labTitle, description, parameters: paramConfig, guidingQuestions } = data;
  
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  
  // Initialize parameters state from config
  const initialParams = paramConfig.reduce((acc, param) => {
    acc[param.id] = [param.defaultValue];
    return acc;
  }, {} as Record<string, number[]>);
  
  const [parameters, setParameters] = useState(initialParams);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [currentReflection, setCurrentReflection] = useState("");
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
  
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
          const mostRecent = progress[progress.length - 1];
          
          // Restore data from most recent progress entry
          if (mostRecent?.step_data) {
            if (mostRecent.step_data.parameters) {
              setParameters(mostRecent.step_data.parameters);
            }
            if (mostRecent.step_data.insights) {
              setInsights(mostRecent.step_data.insights);
            }
            if (mostRecent.step_data.currentReflection) {
              setCurrentReflection(mostRecent.step_data.currentReflection);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [labId]);

  // Auto-save progress when state changes (debounced)
  React.useEffect(() => {
    if (!labId || isLoadingProgress) return;

    const timer = setTimeout(() => {
      saveProgress();
    }, 2000); // Auto-save after 2 seconds of no changes

    return () => clearTimeout(timer);
  }, [parameters, insights, currentReflection, labId, isLoadingProgress]);

  const saveProgress = async () => {
    if (!labId) return;
    
    try {
      const { updateLabProgress } = await import("@/lib/api/labs");
      await updateLabProgress(labId, {
        step_id: "explore", // Single step for explore labs
        step_data: {
          parameters,
          insights,
          currentReflection
        },
        completed: false
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  const markLabComplete = async () => {
    if (!labId) return;
    try {
      const { updateLab } = await import("@/lib/api/labs");
      await updateLab(labId, {
        status: "completed",
        completed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to mark lab as complete:", error);
    }
  };

  const handleComplete = async () => {
    if (hasMarkedComplete) return;
    setHasMarkedComplete(true);
    await markLabComplete();
  };
  
  const calculateTrajectory = () => {
    const g = parameters[paramConfig[0]?.id]?.[0] || 9.8;
    const v0 = parameters[paramConfig[1]?.id]?.[0] || 20;
    const theta = ((parameters[paramConfig[2]?.id]?.[0] || 45) * Math.PI) / 180;
    
    const maxHeight = (v0 * v0 * Math.sin(theta) * Math.sin(theta)) / (2 * g);
    const range = (v0 * v0 * Math.sin(2 * theta)) / g;
    const timeOfFlight = (2 * v0 * Math.sin(theta)) / g;
    
    return { maxHeight, range, timeOfFlight };
  };

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 1600);
  };

  const handleReset = () => {
    const resetParams = paramConfig.reduce((acc, param) => {
      acc[param.id] = [param.defaultValue];
      return acc;
    }, {} as Record<string, number[]>);
    setParameters(resetParams);
  };

  const addInsight = () => {
    if (!currentReflection.trim()) return;
    
    const newInsight: Insight = {
      id: Date.now().toString(),
      text: currentReflection,
      timestamp: new Date()
    };
    
    setInsights([...insights, newInsight]);
    setCurrentReflection("");
  };

  const trajectory = calculateTrajectory();

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Parameter Controls */}
        <ResizablePanel defaultSize={30} minSize={25} maxSize={40} className="border-r bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" />
                {labTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            
            <ScrollArea className="flex-1 h-0">
              <div className="p-6 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold">Parameters</h3>
                  </div>
                  
                  {paramConfig.map((param) => (
                    <div key={param.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">
                          {param.label} {param.unit && `(${param.unit})`}
                        </label>
                        <span className="text-sm font-mono font-bold text-primary">
                          {parameters[param.id]?.[0]?.toFixed(param.step >= 1 ? 0 : 1)}{param.unit === "°" ? "°" : ""}
                        </span>
                      </div>
                      <Slider 
                        value={parameters[param.id] || [param.defaultValue]}
                        onValueChange={(value) => setParameters({...parameters, [param.id]: value})}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        className="py-4"
                      />
                      {param.hint && (
                        <p className="text-[10px] text-muted-foreground italic">{param.hint}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1 gap-2"
                    onClick={handleSimulate}
                    disabled={isSimulating}
                  >
                    <PlayCircle className="w-4 h-4" />
                    Simulate
                  </Button>
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={handleReset}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center Panel: Sandbox Workspace */}
        <ResizablePanel defaultSize={45} minSize={35}>
          <div className="flex flex-col h-full bg-gradient-to-br from-background to-muted/10">
            <div className="p-6 border-b bg-background/50 backdrop-blur-sm">
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold">
                Projectile Motion Sandbox
              </Badge>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
              <div className="relative w-full max-w-2xl aspect-[16/9] border-2 border-dashed border-muted-foreground/20 rounded-2xl bg-background/50 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={cn(
                    "transition-all duration-700",
                    isSimulating && "scale-110 opacity-50"
                  )}>
                    <svg viewBox="0 0 400 200" className="w-full h-auto">
                      {/* Ground */}
                      <line x1="0" y1="180" x2="400" y2="180" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
                      
                      {/* Trajectory path */}
                      <path 
                        d={`M 20 180 Q ${20 + trajectory.range / 4} ${180 - trajectory.maxHeight * 2} ${20 + trajectory.range * 2} 180`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                        className="text-primary"
                      />
                      
                      {/* Launch point */}
                      <circle cx="20" cy="180" r="6" fill="currentColor" className="text-primary" />
                      
                      {/* Projectile (animated when simulating) */}
                      {isSimulating && (
                        <circle 
                          cx="20" 
                          cy="180" 
                          r="8" 
                          fill="currentColor" 
                          className="text-amber-500"
                        >
                          <animate attributeName="cx" from="20" to={Math.min(20 + trajectory.range * 2, 380)} dur="1.5s" repeatCount="1" fill="freeze" />
                          <animate attributeName="cy" values={`180;${Math.max(180 - trajectory.maxHeight * 2, 20)};180`} dur="1.5s" repeatCount="1" fill="freeze" />
                          <animate attributeName="r" values="8;10;8" dur="1.5s" repeatCount="1" />
                        </circle>
                      )}
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                <Card className="border-none bg-background/80 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Max Height</p>
                    <p className="text-2xl font-bold text-primary">{trajectory.maxHeight.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">meters</p>
                  </CardContent>
                </Card>
                <Card className="border-none bg-background/80 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Range</p>
                    <p className="text-2xl font-bold text-primary">{trajectory.range.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">meters</p>
                  </CardContent>
                </Card>
                <Card className="border-none bg-background/80 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</p>
                    <p className="text-2xl font-bold text-primary">{trajectory.timeOfFlight.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">seconds</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Reflection & Insights */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="border-l bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b bg-background">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Your Discoveries
              </h3>
            </div>
            
            <ScrollArea className="flex-1 h-0">
              <div className="p-5 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-semibold">Guiding Questions</h4>
                  </div>
                  <div className="space-y-2">
                    {guidingQuestions.map((question, i) => (
                      <div key={i} className="text-xs p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <Markdown className="text-muted-foreground">{question}</Markdown>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold">Record Insight</h4>
                  </div>
                  <Textarea 
                    placeholder="What did you discover? What patterns emerged?"
                    className="min-h-[100px] text-sm"
                    value={currentReflection}
                    onChange={(e) => setCurrentReflection(e.target.value)}
                  />
                  <Button 
                    onClick={addInsight}
                    className="w-full"
                    variant="secondary"
                    disabled={!currentReflection.trim()}
                  >
                    Save Insight
                  </Button>
                </div>

                {insights.length > 0 && (
                  <>
                    <Separator className="opacity-50" />
                    
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Your Insights ({insights.length})
                      </h4>
                      <div className="space-y-3">
                        {insights.map((insight) => (
                          <Card key={insight.id} className="border-none bg-primary/5 shadow-none">
                            <CardContent className="p-3 space-y-2">
                              <Markdown className="text-xs leading-relaxed">{insight.text}</Markdown>
                              <p className="text-[9px] text-muted-foreground">
                                {insight.timestamp.toLocaleTimeString()}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-background">
              <Button
                className="w-full shadow-sm"
                variant="default"
                onClick={handleComplete}
                disabled={hasMarkedComplete}
              >
                Complete Exploration
              </Button>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
