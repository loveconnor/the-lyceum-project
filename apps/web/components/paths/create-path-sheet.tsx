import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { usePathStore } from "@/app/(main)/paths/store";
import { EnumPathStatus } from "@/app/(main)/paths/enum";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shimmer } from "@/components/ui/shimmer";
import { Switch } from "@/components/ui/switch";

interface CreatePathSheetProps {
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

const CreatePathSheet: React.FC<CreatePathSheetProps> = ({ isOpen, onClose, editPathId }) => {
  const { addPath, updatePath, generatePathWithAI, paths, generationStatus } = usePathStore();
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<string | null>(null);
  const [contextFiles, setContextFiles] = React.useState<File[]>([]);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [useLearnByDoing, setUseLearnByDoing] = React.useState(false);
  const [includeLabs, setIncludeLabs] = React.useState(true);
  const [recommendedTopics, setRecommendedTopics] = React.useState<RecommendedTopic[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = React.useState(true);

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
            await generatePathWithAI({ ...pathData, learnByDoing: useLearnByDoing, includeLabs });
            toast.success("Learning path created with modules and content!");
          }
        }
      } else {
        // Create custom path from form
        if (!description.trim()) {
          toast.error("Please describe what you want to learn");
          setIsGenerating(false);
          return;
        }
        
        const pathData = {
          title: "", // AI will generate the title
          description,
          status: EnumPathStatus.NotStarted,
        };
        
        if (editPathId) {
          await updatePath(editPathId, pathData);
          toast.success("Your learning path has been updated successfully.");
        } else {
          // Use AI to generate the full path with modules and content
          await generatePathWithAI({ ...pathData, learnByDoing: useLearnByDoing, includeLabs });
          toast.success("Learning path created with modules and content!");
        }
      }

      setTitle("");
      setDescription("");
      setSelectedRecommendation(null);
      setContextFiles([]);
      setUseLearnByDoing(false);
      setIncludeLabs(true);
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
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <SheetTitle>{editPathId ? "Edit Learning Path" : "Generate Learning Path"}</SheetTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Describe what you want to learn and AI will create a complete learning path with modules.
            </p>
          </SheetHeader>

          <form onSubmit={onSubmit} className="space-y-6 p-4 pt-0">
            {/* Custom Path Creation */}
            <div className="space-y-4">
              <div>
                <label htmlFor="description" className="text-sm font-medium">
                  What do you want to learn? <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="description"
                  placeholder="e.g. Java programming, Classical History, Italian Cooking..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!!selectedRecommendation}
                  rows={4}
                  className="mt-1.5 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Be specific about topics, skills, and your learning goals.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-4">
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

                <div className="flex items-center justify-between gap-4">
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
              </div>
            </div>

            <Button 
                className={cn(
                  "w-full overflow-hidden transition-all duration-300 relative",
                  isGenerating && "!opacity-100 !bg-primary"
                )}
                type="submit"
                disabled={(!selectedRecommendation && !description.trim()) || isGenerating}
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
                  <Shimmer className="font-medium truncate max-w-[200px] sm:max-w-none" duration={3.5}>
                    {generationStatus || "Generating..."}
                  </Shimmer>
                </motion.div>
              </Button>

            {/* Recommended Paths Section */}
            {(isLoadingRecommendations || recommendedPaths.length > 0) && (
              <div className="space-y-4 pt-2">
                 <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or try a recommended path
                    </span>
                  </div>
                </div>
                
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
                ) : (
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
                          : "border-border bg-card/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium leading-none mb-1.5">{rec.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">
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
              )}
            </div>
          )}
          </form>
        </SheetContent>
      </Sheet>

      <PathGenerationNotifier status={generationStatus} />
    </>
  );
};

export default CreatePathSheet;

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
