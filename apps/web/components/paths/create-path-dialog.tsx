"use client";

import React from "react";
import { Sparkles, Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { usePathStore } from "@/app/(main)/paths/store";
import { EnumPathStatus } from "@/app/(main)/paths/enum";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { parseFileContent } from "@/lib/fileParser";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Shimmer } from "@/components/ui/shimmer";
import { Switch } from "@/components/ui/switch";

interface CreatePathDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editPathId?: string | null;
}

type RecommendedTopic = {
  name: string;
  category: string;
  confidence: string;
  progress?: number;
  description: string;
};

const CreatePathDialog: React.FC<CreatePathDialogProps> = ({ isOpen, onClose, editPathId }) => {
  const { addPath, updatePath, generatePathWithAI, paths, generationStatus } = usePathStore();
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<string | null>(null);
  const [contextFiles, setContextFiles] = React.useState<File[]>([]);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [useLearnByDoing, setUseLearnByDoing] = React.useState(false);
  const [includeLabs, setIncludeLabs] = React.useState(true);
  const [customizeStructure, setCustomizeStructure] = React.useState(false);
  const [moduleCount, setModuleCount] = React.useState(5);
  const [labCount, setLabCount] = React.useState(2);
  const firecrawlEnabled = process.env.NEXT_PUBLIC_USE_FIRECRAWL === "true";
  const [useWebSearch, setUseWebSearch] = React.useState(firecrawlEnabled);
  const effectiveUseWebSearch = firecrawlEnabled && useWebSearch && !useLearnByDoing;
  const [recommendedTopics, setRecommendedTopics] = React.useState<RecommendedTopic[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = React.useState(true);
  const maxLabCount = Math.max(moduleCount, 0);
  const structureOptionTitle = includeLabs
    ? "Customize Module and Lab Counts"
    : "Customize Module Count";
  const structureOptionDescription = includeLabs
    ? "Off = AI decides structure. On = you choose exact counts."
    : "Off = AI decides structure. On = you choose the number of modules.";
  const structureOptionAriaLabel = includeLabs
    ? "Customize module and lab counts"
    : "Customize module count";

  React.useEffect(() => {
    setLabCount((prev) => Math.min(prev, maxLabCount));
  }, [maxLabCount]);

  React.useEffect(() => {
    if (useLearnByDoing && useWebSearch) {
      setUseWebSearch(false);
    }
  }, [useLearnByDoing, useWebSearch]);

  // Fetch user's recommended topics from dashboard
  React.useEffect(() => {
    if (isOpen) {
      fetchRecommendations();
    }
  }, [isOpen]);

  const fetchRecommendations = async () => {
    setIsLoadingRecommendations(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setIsLoadingRecommendations(false);
        return;
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.BACKEND_URL ||
        "http://localhost:3001";

      const res = await fetch(`${baseUrl}/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      });

      if (res.ok) {
        const data = await res.json();
        const topics = data.recommended_topics || [];
        // Filter out only generic placeholder topics like "Topic 1", "Topic 2" etc.
        const realTopics = topics.filter((t: RecommendedTopic) => 
          !t.name.toLowerCase().match(/^topic \d+$/)
        );
        setRecommendedTopics(realTopics.slice(0, 3)); // Show top 3
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Convert recommended topics to path format
  const recommendedPaths = recommendedTopics.map((topic, idx) => ({
    id: `rec-${idx}`,
    title: topic.name,
    reason: topic.category,
    description: topic.description,
    difficulty: "intermediate",
    estimatedDuration: "4-6 weeks",
    moduleCount: 5
  }));

  // If editPathId is provided, load that path data
  React.useEffect(() => {
    if (editPathId) {
      const pathToEdit = paths.find((path) => path.id === editPathId);
      if (pathToEdit) {
        setTitle(pathToEdit.title);
        setDescription(pathToEdit.description || "");
      }
    } else {
      setTitle("");
      setDescription("");
    }
  }, [editPathId, paths, isOpen]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGenerating) return;
    
    try {
      setIsGenerating(true);
      
      // Process uploaded files
      const contextFilesData = await Promise.all(
        contextFiles.map(async (file) => {
          try {
            const text = await parseFileContent(file);
            return {
              name: file.name,
              content: text,
              type: file.type || 'text/plain'
            };
          } catch (error) {
            console.error(`Error parsing file ${file.name}:`, error);
            toast.error(`Failed to parse ${file.name}: ${(error as Error).message}`);
            throw error;
          }
        })
      );
      
      if (selectedRecommendation) {
        // Use recommended path data
        const rec = recommendedPaths.find(r => r.id === selectedRecommendation);
        if (rec) {
          const pathData = {
            title: rec.title,
            description: rec.description,
            status: EnumPathStatus.NotStarted,
          };
          
          if (editPathId) {
            await updatePath(editPathId, pathData);
            toast.success("Your learning path has been updated successfully.");
          } else {
            // Use AI to generate the full path with modules and content
            await generatePathWithAI({ 
              ...pathData, 
              learnByDoing: useLearnByDoing, 
              includeLabs,
              moduleCount: customizeStructure ? moduleCount : undefined,
              labCount: customizeStructure && includeLabs ? labCount : undefined,
              useAiOnly: !effectiveUseWebSearch,
              useWebSearch: effectiveUseWebSearch,
              contextFiles: contextFilesData
            });
            toast.success("Learning path created with modules and content!");
          }
        }
      } else {
        // Create custom path from form
        if (!description.trim() && contextFiles.length === 0) {
          toast.error("Please describe what you want to learn or upload a file");
          setIsGenerating(false);
          return;
        }
        
        // If files are uploaded without description, use a generic prompt
        const pathDescription = description.trim() 
          ? description 
          : "Based on the uploaded files, create a complete learning path that helps me learn the concepts and skills demonstrated in the material.";
        
        const pathData = {
          title: "", // AI will generate the title
          description: pathDescription,
          status: EnumPathStatus.NotStarted,
        };
        
        if (editPathId) {
          await updatePath(editPathId, pathData);
          toast.success("Your learning path has been updated successfully.");
        } else {
          // Use AI to generate the full path with modules and content
          await generatePathWithAI({ 
            ...pathData, 
            learnByDoing: useLearnByDoing, 
            includeLabs,
            moduleCount: customizeStructure ? moduleCount : undefined,
            labCount: customizeStructure && includeLabs ? labCount : undefined,
            useAiOnly: !effectiveUseWebSearch,
            useWebSearch: effectiveUseWebSearch,
            contextFiles: contextFilesData
          });
          toast.success("Learning path created with modules and content!");
        }
      }

      setTitle("");
      setDescription("");
      setSelectedRecommendation(null);
      setContextFiles([]);
      setUseLearnByDoing(false);
      setIncludeLabs(true);
      setCustomizeStructure(false);
      setModuleCount(5);
      setLabCount(2);
      setUseWebSearch(firecrawlEnabled);
      onClose();
    } catch (error) {
      console.error("Error saving path:", error);
      toast.error("Failed to generate learning path. Please try again.");
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
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-0 sm:max-w-3xl">
          <div className="border-b bg-muted/30 px-6 py-5">
            <DialogHeader className="text-left">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <DialogTitle>{editPathId ? "Edit Learning Path" : "Generate Learning Path"}</DialogTitle>
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
                        <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                      ) : (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </label>
                    <Textarea
                      id="description"
                      placeholder={contextFiles.length > 0 
                        ? "Add additional context or leave blank to let AI infer from your files..."
                        : "e.g. Java programming, Classical History, Italian Cooking..."
                      }
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={!!selectedRecommendation}
                      rows={5}
                      className="mt-1.5 resize-none bg-transparent"
                    />
                    <p className="text-xs text-muted-foreground">
                      {contextFiles.length > 0 
                        ? "The AI will analyze your uploaded files to create a personalized learning path. Add text for additional guidance."
                        : "Be specific about topics, skills, and your learning goals."
                      }
                    </p>
                  </div>
                </section>

                <Accordion
                  type="multiple"
                  className="rounded-lg border bg-card/40"
                >
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
                            <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
                              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Upload className="h-5 w-5" />
                                <span className="text-sm">Click to upload or drag and drop</span>
                              </div>
                              <p className="text-xs text-muted-foreground text-center mt-1">
                                PDF, TXT, MD, DOCX (max 10MB each)
                              </p>
                            </div>
                          </label>
                          <input
                            id="file-upload"
                            type="file"
                            multiple
                            accept=".pdf,.txt,.md,.docx,.doc"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>

                        {contextFiles.length > 0 && (
                          <div className="space-y-2">
                            {contextFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm truncate">{file.name}</p>
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

                  <AccordionItem value="options" className="px-4">
                    <AccordionTrigger className="py-3 text-sm">
                      <div className="space-y-1 text-left">
                        <span className="font-medium">Generation Options</span>
                        <span className="block text-xs text-muted-foreground">
                          {`${firecrawlEnabled ? (effectiveUseWebSearch ? "Web grounded" : "Fully AI") : "AI only"} • Learn-by-doing ${useLearnByDoing ? "on" : "off"} • Labs ${includeLabs ? "on" : "off"} • Structure ${customizeStructure ? `${moduleCount} modules${includeLabs ? `, ${labCount} labs` : ""}` : "auto"}`}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-1">
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/40 p-3">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">Content Source</p>
                            <p className="text-xs text-muted-foreground">
                              {firecrawlEnabled
                                ? useLearnByDoing
                                  ? "Disabled while Learn-by-Doing is enabled."
                                  : effectiveUseWebSearch
                                    ? "Search the web for sources and ground the path in them."
                                    : "Generate all content fully with AI."
                                : "Web search is disabled in this environment."}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={cn(effectiveUseWebSearch ? "text-foreground font-medium" : "text-muted-foreground")}>
                              Search Web
                            </span>
                            <Switch
                              checked={effectiveUseWebSearch}
                              onCheckedChange={setUseWebSearch}
                              aria-label="Search the web for grounded content"
                              disabled={!firecrawlEnabled || useLearnByDoing}
                            />
                            <span className={cn(!effectiveUseWebSearch ? "text-foreground font-medium" : "text-muted-foreground")}>
                              Fully AI
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/40 p-3">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">Learn-by-Doing Modules</p>
                            <p className="text-xs text-muted-foreground">
                              Interactive practice steps.
                            </p>
                          </div>
                          <Switch
                            checked={useLearnByDoing}
                            onCheckedChange={setUseLearnByDoing}
                            aria-label="Enable learn-by-doing modules"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/40 p-3">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">Include Labs</p>
                            <p className="text-xs text-muted-foreground">
                              Practice labs between modules.
                            </p>
                          </div>
                          <Switch
                            checked={includeLabs}
                            onCheckedChange={setIncludeLabs}
                            aria-label="Include labs in the path"
                          />
                        </div>

                        <div className="rounded-md border bg-muted/40 p-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{structureOptionTitle}</p>
                              <p className="text-xs text-muted-foreground">{structureOptionDescription}</p>
                            </div>
                            <Switch
                              checked={customizeStructure}
                              onCheckedChange={setCustomizeStructure}
                              aria-label={structureOptionAriaLabel}
                            />
                          </div>

                          {customizeStructure && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <label htmlFor="module-count" className="text-xs font-medium text-muted-foreground">
                                  Modules
                                </label>
                                <Input
                                  id="module-count"
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  max={12}
                                  step={1}
                                  value={moduleCount}
                                  onChange={(e) => {
                                    const parsed = Number.parseInt(e.target.value, 10);
                                    if (Number.isNaN(parsed)) return;
                                    setModuleCount(Math.max(1, Math.min(12, parsed)));
                                  }}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                  Choose between 1 and 12 modules.
                                </p>
                              </div>

                              {includeLabs && (
                                <div className="space-y-1.5">
                                  <label htmlFor="lab-count" className="text-xs font-medium text-muted-foreground">
                                    Labs
                                  </label>
                                  <Input
                                    id="lab-count"
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={maxLabCount}
                                    step={1}
                                    value={labCount}
                                    onChange={(e) => {
                                      const parsed = Number.parseInt(e.target.value, 10);
                                      if (Number.isNaN(parsed)) return;
                                      setLabCount(Math.max(0, Math.min(maxLabCount, parsed)));
                                    }}
                                  />
                                  <p className="text-[11px] text-muted-foreground">
                                    Choose between 0 and {maxLabCount} labs.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="recommendations" className="px-4">
                    <AccordionTrigger className="py-3 text-sm">
                      <div className="space-y-1 text-left">
                        <span className="font-medium">Recommended Paths</span>
                        <span className="block text-xs text-muted-foreground">
                          {isLoadingRecommendations
                            ? "Fetching personalized suggestions..."
                            : recommendedPaths.length > 0
                              ? `${recommendedPaths.length} suggestion${recommendedPaths.length > 1 ? "s" : ""} available`
                              : "No suggestions yet"}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-1">
                      <div className="space-y-2">
                        {isLoadingRecommendations ? (
                          <div className="grid gap-2">
                            {[1, 2].map((i) => (
                              <div key={i} className="rounded-lg border p-3 animate-pulse">
                                <div className="space-y-2">
                                  <div className="h-4 bg-muted rounded w-3/4"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : recommendedPaths.length > 0 ? (
                          <div className="grid gap-2">
                            {recommendedPaths.map((rec) => (
                              <button
                                key={rec.id}
                                type="button"
                                onClick={() => setSelectedRecommendation(
                                  selectedRecommendation === rec.id ? null : rec.id
                                )}
                                className={cn(
                                  "w-full text-left rounded-lg border p-3 transition-all hover:border-primary/50",
                                  selectedRecommendation === rec.id 
                                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                                    : "border-border bg-background/60"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium leading-none mb-1.5">{rec.title}</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {rec.description}
                                    </p>
                                  </div>
                                  {selectedRecommendation === rec.id && (
                                    <Sparkles className="h-3 w-3 text-primary shrink-0 animate-pulse" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                            No recommendations yet. Create a path to get tailored suggestions.
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Button 
                  className={cn(
                    "w-full overflow-hidden transition-all duration-300 relative",
                    isGenerating && "!opacity-100 !bg-primary"
                  )}
                  type="submit"
                  disabled={(!selectedRecommendation && !description.trim() && contextFiles.length === 0) || isGenerating}
                >
                  <motion.div
                    initial={false}
                    animate={{ 
                      opacity: isGenerating ? 0 : 1,
                      y: isGenerating ? -10 : 0
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className={cn(
                      "flex items-center gap-2",
                      isGenerating && "absolute pointer-events-none"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    {selectedRecommendation 
                      ? "Generate This Path" 
                      : "Generate Path"}
                  </motion.div>
                  
                  <motion.div
                    initial={false}
                    animate={{ 
                      opacity: isGenerating ? 1 : 0,
                      y: isGenerating ? 0 : 10
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className={cn(
                      "flex items-center justify-center gap-2.5 w-full min-w-0",
                      !isGenerating && "absolute pointer-events-none"
                    )}
                  >
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <Shimmer
                      as="span"
                      className="font-medium leading-none truncate max-w-[200px] sm:max-w-none"
                      duration={3.5}
                    >
                      {generationStatus || "Generating..."}
                    </Shimmer>
                  </motion.div>
                </Button>
              </form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <PathGenerationNotifier status={generationStatus} />
    </>
  );
};

export default CreatePathDialog;

function PathGenerationNotifier({ status }: { status: string | null }) {
  if (!status) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative max-w-sm overflow-hidden rounded-xl border bg-background shadow-lg ring-1 ring-border">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="relative flex items-start gap-3 p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Generating your path</p>
            <p className="text-sm text-muted-foreground">{status}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
