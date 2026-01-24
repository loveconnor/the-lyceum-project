"use client";

import React from "react";
import { Sparkles, TrendingUp, Target, ChevronRight, Paperclip, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLabStore } from "@/app/(main)/labs/store";
import { labFormSchema, LabFormValues } from "@/app/(main)/labs/schemas";
import { EnumLabStatus } from "@/app/(main)/labs/enum";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { trackEvent } from "@/lib/analytics";
import { parseMultipleFiles } from "@/lib/fileParser";

interface CreateLabSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editTodoId?: string | null;
  pathId?: string;
}

const CreateLabSheet: React.FC<CreateLabSheetProps> = ({ isOpen, onClose, editTodoId, pathId }) => {
  console.log("🔵 [CREATE LAB SHEET] Component rendered, isOpen:", isOpen);
  const { addLab, updateLab, labs, generateLab, loading } = useLabStore();
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<string | null>(null);
  const [contextFiles, setContextFiles] = React.useState<File[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  
  console.log("🔵 [CREATE LAB SHEET] State - isGenerating:", isGenerating, "loading:", loading);

  // AI-generated recommendations based on user's learning context
  const recommendedLabs = [
    {
      id: "rec-1",
      title: "Build a Custom React Hook Library",
      reason: "Builds on React Fundamentals",
      description: "Create reusable hooks for common patterns like data fetching, form handling, and state management.",
      difficulty: "intermediate",
      estimatedTime: "60 min",
      type: "practice"
    },
    {
      id: "rec-2",
      title: "Implement Authentication Flow",
      reason: "Fills a gap in full-stack development",
      description: "Build a complete authentication system with JWT tokens, protected routes, and user sessions.",
      difficulty: "advanced",
      estimatedTime: "90 min",
      type: "concept"
    },
    {
      id: "rec-3",
      title: "Create a Data Visualization Dashboard",
      reason: "Expands on charting concepts from previous labs",
      description: "Build interactive charts and graphs using real-time data with filtering and export capabilities.",
      difficulty: "intermediate",
      estimatedTime: "75 min",
      type: "exploration"
    }
  ];

  const hasTrackedRecommendations = React.useRef(false);

  React.useEffect(() => {
    if (isOpen && !hasTrackedRecommendations.current && recommendedLabs.length > 0) {
      hasTrackedRecommendations.current = true;
      const estimated = parseInt(recommendedLabs[0]?.estimatedTime || "0", 10);
      trackEvent("lab_recommended_shown", {
        lab_type: "recommended",
        estimated_duration: Number.isNaN(estimated) ? null : estimated
      });
    }

    if (!isOpen) {
      hasTrackedRecommendations.current = false;
    }
  }, [isOpen, recommendedLabs.length]);

  const defaultValues: LabFormValues = {
    title: "",
    description: "",
    estimatedTime: "",
    difficulty: "intermediate",
    labType: undefined,
    status: EnumLabStatus.Pending
  };

  const form = useForm<LabFormValues>({
    resolver: zodResolver(labFormSchema),
    defaultValues
  });

  // If editTodoId is provided, load that lab data
  React.useEffect(() => {
    if (editTodoId) {
      const labToEdit = labs.find((todo) => todo.id === editTodoId);
      if (labToEdit) {
        form.reset({
          title: labToEdit.title,
          description: labToEdit.description,
          estimatedTime: "45 min", // Placeholder - would come from data
          difficulty: "intermediate",
          labType: undefined,
          status: labToEdit.status as LabFormValues["status"]
        });
      }
    } else {
      form.reset(defaultValues);
    }
  }, [editTodoId, labs, isOpen, form]);

  const onSubmit = async (data: LabFormValues) => {
    console.log("🚀 [CREATE LAB] onSubmit called with data:", data);
    try {
      console.log("🚀 [CREATE LAB] Starting lab generation");
      setIsGenerating(true);
      console.log("🚀 [CREATE LAB] isGenerating set to true");
      let learningGoal = "";
      let contextText = "";

      // If a recommendation is selected, use its data
      if (selectedRecommendation) {
        const rec = recommendedLabs.find(r => r.id === selectedRecommendation);
        if (rec) {
          learningGoal = `${rec.title}: ${rec.description}`;
          contextText = `Difficulty: ${rec.difficulty}\nEstimated time: ${rec.estimatedTime}\nType: ${rec.type}\nReason: ${rec.reason}`;
          console.log("📋 [CREATE LAB] Using recommended lab:", rec.title);
        }
      } else {
        // Use custom description or files
        if (!data.description && contextFiles.length === 0) {
          console.warn("⚠️ [CREATE LAB] No description or files provided");
          toast.error("Please describe what you want to learn or upload a file");
          setIsGenerating(false);
          return;
        }

        // Read context files if any
        if (contextFiles.length > 0) {
          console.log(`📎 [CREATE LAB] Parsing ${contextFiles.length} file(s)`);
          try {
            contextText = await parseMultipleFiles(contextFiles);
            console.log(`✅ [CREATE LAB] Files parsed successfully - ${contextText.length} characters`);
          } catch (error) {
            console.error(`❌ [CREATE LAB] Error parsing files:`, error);
            toast.error(`Failed to parse files: ${(error as Error).message}`);
            setIsGenerating(false);
            return;
          }
          
          // If description provided, use it; otherwise let AI infer from files
          if (data.description) {
            learningGoal = data.description;
            console.log("✏️ [CREATE LAB] Using custom description with file context");
          } else {
            learningGoal = "Based on the uploaded files, create a lab that helps me learn the concepts and skills demonstrated in the material.";
            console.log("🤖 [CREATE LAB] Using AI inference from files");
          }
        } else {
          learningGoal = data.description;
          console.log("✏️ [CREATE LAB] Using custom description only");
        }
      }

      console.log("🎯 [CREATE LAB] Learning goal:", learningGoal);
      console.log("📝 [CREATE LAB] Context length:", contextText.length, "characters");
      console.log("⏳ [CREATE LAB] Calling generateLab API...");

      // Generate lab using AI
      const newLab = await generateLab(learningGoal, contextText || undefined, Boolean(selectedRecommendation), pathId);
      
      console.log("✨ [CREATE LAB] Lab generated successfully:", newLab);
      
      toast.success("Lab generated! Ready to start learning.");
      console.log("🎉 [CREATE LAB] Lab creation complete - closing dialog");
      
      form.reset();
      setSelectedRecommendation(null);
      setContextFiles([]);
      onClose();
    } catch (error) {
      console.error("❌ [CREATE LAB] Error generating lab:", error);
      console.error("❌ [CREATE LAB] Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      toast.error(`Failed to generate lab: ${(error as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    setContextFiles(prev => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setContextFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <SheetTitle>{editTodoId ? "Edit Lab" : "Create Lab"}</SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Select a recommended lab, describe what you want to learn, or upload files and let AI figure it out.
          </p>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.log("❌ [FORM] Validation errors:", errors);
          })} className="space-y-6 p-4 pt-0">
            {/* Recommended Labs Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Recommended for You</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Based on your learning path and completed labs
              </p>
              
              <div className="space-y-2">
                {recommendedLabs.map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setSelectedRecommendation(
                      selectedRecommendation === rec.id ? null : rec.id
                    )}
                    className={cn(
                      "w-full text-left rounded-lg border p-3 transition-all hover:border-primary/50",
                      selectedRecommendation === rec.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <h4 className="text-sm font-medium leading-tight">{rec.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Target className="h-3 w-3" />
                            <span>{rec.reason}</span>
                          </div>
                        </div>
                        <ChevronRight className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          selectedRecommendation === rec.id && "rotate-90"
                        )} />
                      </div>
                      
                      {selectedRecommendation === rec.id && (
                        <div className="space-y-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {rec.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground">~{rec.estimatedTime}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="capitalize text-muted-foreground">{rec.difficulty}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or create custom
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    What do you want to learn? 
                    {!selectedRecommendation && contextFiles.length > 0 && (
                      <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={contextFiles.length > 0 
                        ? "Add additional context or leave blank to let AI infer from your files..."
                        : "Describe what you want to build or learn. The AI will generate an appropriate lab structure and title for you."
                      }
                      rows={4}
                      {...field}
                      value={field.value || ""}
                      disabled={!!selectedRecommendation}
                    />
                  </FormControl>
                  <FormMessage />
                  {!selectedRecommendation && (
                    <p className="text-xs text-muted-foreground">
                      {contextFiles.length > 0 
                        ? "The AI will analyze your uploaded files to understand what you want to learn. Add text for additional guidance."
                        : "The lab title, difficulty, template type, and structure will be automatically generated by AI based on your input."
                      }
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Add Context Files */}
            {!selectedRecommendation && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>Upload Files <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Upload files and AI will infer what you want to learn, or add text above for context
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="context-upload"
                      multiple
                      className="sr-only"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.txt,.md,.js,.ts,.tsx,.jsx,.json,.yaml,.yml"
                    />
                    <label htmlFor="context-upload">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>
                          <Paperclip className="h-4 w-4" />
                          Attach Files
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                {contextFiles.length > 0 && (
                  <div className="space-y-2">
                    {contextFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md border bg-muted/50 p-2.5"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                          <div className="overflow-hidden">
                            <p className="truncate text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={() => {
                console.log("🔴 [BUTTON] Clicked! selectedRec:", selectedRecommendation, "description:", form.watch("description"), "files:", contextFiles.length);
                console.log("🔴 [BUTTON] Disabled?", (!selectedRecommendation && !form.watch("description") && contextFiles.length === 0) || isGenerating || loading);
              }}
              type="submit"
              disabled={(!selectedRecommendation && !form.watch("description") && contextFiles.length === 0) || isGenerating || loading}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Lab...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {selectedRecommendation ? "Generate This Lab" : "Generate Lab"}
                </>
              )}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};

export default CreateLabSheet;
