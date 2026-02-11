"use client";

import React from "react";
import { Sparkles, Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useLabStore } from "@/app/(main)/labs/store";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Shimmer } from "@/components/ui/shimmer";
import { trackEvent } from "@/lib/analytics";
import { parseMultipleFiles } from "@/lib/fileParser";

interface CreateLabDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editTodoId?: string | null;
  pathId?: string;
}

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

const CreateLabDialog: React.FC<CreateLabDialogProps> = ({
  isOpen,
  onClose,
  editTodoId,
  pathId
}) => {
  const { labs, generateLab, loading } = useLabStore();
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<string | null>(null);
  const [contextFiles, setContextFiles] = React.useState<File[]>([]);
  const [description, setDescription] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const isSubmitting = isGenerating || loading;

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
  }, [isOpen]);

  React.useEffect(() => {
    if (editTodoId) {
      const labToEdit = labs.find((todo) => todo.id === editTodoId);
      if (labToEdit) {
        setDescription(labToEdit.description || "");
      }
      return;
    }

    setDescription("");
  }, [editTodoId, labs, isOpen]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    try {
      setIsGenerating(true);
      let learningGoal = "";
      let contextText = "";

      if (selectedRecommendation) {
        const rec = recommendedLabs.find((r) => r.id === selectedRecommendation);
        if (rec) {
          learningGoal = `${rec.title}: ${rec.description}`;
          contextText = `Difficulty: ${rec.difficulty}\nEstimated time: ${rec.estimatedTime}\nType: ${rec.type}\nReason: ${rec.reason}`;
        }
      } else {
        if (!description.trim() && contextFiles.length === 0) {
          toast.error("Please describe what you want to learn or upload a file");
          setIsGenerating(false);
          return;
        }

        if (contextFiles.length > 0) {
          try {
            contextText = await parseMultipleFiles(contextFiles);
          } catch (error) {
            toast.error(`Failed to parse files: ${(error as Error).message}`);
            setIsGenerating(false);
            return;
          }

          if (description.trim()) {
            learningGoal = description;
          } else {
            learningGoal =
              "Based on the uploaded files, create a lab that helps me learn the concepts and skills demonstrated in the material.";
          }
        } else {
          learningGoal = description;
        }
      }

      await generateLab(learningGoal, contextText || undefined, Boolean(selectedRecommendation), pathId);

      toast.success("Lab generated! Ready to start learning.");
      setDescription("");
      setSelectedRecommendation(null);
      setContextFiles([]);
      onClose();
    } catch (error) {
      toast.error(`Failed to generate lab: ${(error as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    setContextFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setContextFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 sm:max-w-3xl">
        <div className="border-b bg-muted/30 px-6 py-5">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle>{editTodoId ? "Edit Lab" : "Generate Lab"}</DialogTitle>
            </div>
            <DialogDescription>
              Describe what you want to learn, upload files and let AI figure it out, or both.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[75vh]">
          <div className="px-6 py-6">
            <form onSubmit={onSubmit} className="mx-auto flex max-w-2xl flex-col gap-5">
              <section className="space-y-2 pb-2">
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    What do you want to learn?
                    {contextFiles.length > 0 ? (
                      <span className="ml-1 font-normal text-muted-foreground">(Optional)</span>
                    ) : (
                      <span className="ml-1 text-destructive">*</span>
                    )}
                  </label>
                  <Textarea
                    id="description"
                    placeholder={
                      contextFiles.length > 0
                        ? "Add additional context or leave blank to let AI infer from your files..."
                        : "e.g. React patterns, distributed systems, SQL optimization..."
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!!selectedRecommendation}
                    rows={5}
                    className="mt-1.5 resize-none bg-transparent"
                  />
                  <p className="text-xs text-muted-foreground">
                    {contextFiles.length > 0
                      ? "The AI will analyze your uploaded files to create a personalized lab. Add text for additional guidance."
                      : "Be specific about topics, skills, and your learning goal."}
                  </p>
                </div>
              </section>

              <Accordion type="multiple" className="rounded-lg border bg-card/40">
                <AccordionItem value="uploads" className="px-4">
                  <AccordionTrigger className="py-3 text-sm">
                    <div className="space-y-1 text-left">
                      <span className="font-medium">Upload Files</span>
                      <span className="block text-xs text-muted-foreground">
                        {contextFiles.length > 0
                          ? `${contextFiles.length} file${contextFiles.length > 1 ? "s" : ""} added`
                          : "Optional context to guide the AI."}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1">
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Upload files and AI will infer what you want to learn, or add text above for context.
                      </p>
                      <div>
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <div className="rounded-lg border-2 border-dashed p-4 transition-colors hover:border-primary/50">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                              <Upload className="h-5 w-5" />
                              <span className="text-sm">Click to upload or drag and drop</span>
                            </div>
                            <p className="mt-1 text-center text-xs text-muted-foreground">
                              PDF, TXT, MD, DOCX (max 10MB each)
                            </p>
                          </div>
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.txt,.md,.js,.ts,.tsx,.jsx,.json,.yaml,.yml"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>

                      {contextFiles.length > 0 && (
                        <div className="space-y-2">
                          {contextFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-2"
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="min-w-0">
                                  <p className="truncate text-sm">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="recommendations" className="px-4">
                  <AccordionTrigger className="py-3 text-sm">
                    <div className="space-y-1 text-left">
                      <span className="font-medium">Recommended Labs</span>
                      <span className="block text-xs text-muted-foreground">
                        {`${recommendedLabs.length} suggestion${recommendedLabs.length > 1 ? "s" : ""} available`}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1">
                    <div className="grid gap-2">
                      {recommendedLabs.map((rec) => (
                        <button
                          key={rec.id}
                          type="button"
                          onClick={() =>
                            setSelectedRecommendation(
                              selectedRecommendation === rec.id ? null : rec.id
                            )
                          }
                          className={cn(
                            "w-full rounded-lg border bg-background/60 p-3 text-left transition-all hover:border-primary/50",
                            selectedRecommendation === rec.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="mb-1.5 text-sm font-medium leading-none">{rec.title}</h4>
                              <p className="line-clamp-2 text-xs text-muted-foreground">{rec.description}</p>
                            </div>
                            {selectedRecommendation === rec.id && (
                              <Sparkles className="h-3 w-3 shrink-0 animate-pulse text-primary" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Button
                className={cn(
                  "relative w-full overflow-hidden transition-all duration-300",
                  isSubmitting && "!bg-primary !opacity-100"
                )}
                type="submit"
                disabled={(!selectedRecommendation && !description.trim() && contextFiles.length === 0) || isSubmitting}
              >
                <motion.div
                  initial={false}
                  animate={{
                    opacity: isSubmitting ? 0 : 1,
                    y: isSubmitting ? -10 : 0
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className={cn("flex items-center gap-2", isSubmitting && "pointer-events-none absolute")}
                >
                  <Sparkles className="h-4 w-4" />
                  {selectedRecommendation ? "Generate This Lab" : "Generate Lab"}
                </motion.div>

                <motion.div
                  initial={false}
                  animate={{
                    opacity: isSubmitting ? 1 : 0,
                    y: isSubmitting ? 0 : 10
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className={cn(
                    "flex w-full min-w-0 items-center justify-center gap-2.5",
                    !isSubmitting && "pointer-events-none absolute"
                  )}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <Shimmer className="max-w-[200px] truncate font-medium sm:max-w-none" duration={3.5}>
                    Generating your lab...
                  </Shimmer>
                </motion.div>
              </Button>
            </form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLabDialog;
