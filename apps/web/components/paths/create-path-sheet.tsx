import React from "react";
import { Sparkles, TrendingUp, Target, ChevronRight} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { usePathStore } from "@/app/(main)/paths/store";
import { EnumPathStatus } from "@/app/(main)/paths/enum";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shimmer } from "@/components/ui/shimmer";

interface CreatePathSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editPathId?: string | null;
}

const CreatePathSheet: React.FC<CreatePathSheetProps> = ({ isOpen, onClose, editPathId }) => {
  const { addPath, updatePath, generatePathWithAI, paths, generationStatus } = usePathStore();
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<string | null>(null);
  const [contextFiles, setContextFiles] = React.useState<File[]>([]);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Placeholder for AI-generated recommendations based on user's learning context
  const recommendedPaths = [
    {
      id: "rec-1",
      title: "Advanced React Patterns",
      reason: "Builds on React Fundamentals",
      description: "Master advanced React patterns including compound components, render props, HOCs, and custom hooks for building scalable applications.",
      difficulty: "advanced",
      estimatedDuration: "6-8 weeks",
      moduleCount: 7
    },
    {
      id: "rec-2",
      title: "System Design Fundamentals",
      reason: "Essential for backend development",
      description: "Learn to design scalable systems including microservices, caching strategies, load balancing, and distributed systems.",
      difficulty: "advanced",
      estimatedDuration: "10-12 weeks",
      moduleCount: 9
    },
    {
      id: "rec-3",
      title: "GraphQL API Development",
      reason: "Modern alternative to REST",
      description: "Build type-safe APIs with GraphQL, including schema design, resolvers, subscriptions, and Apollo integration.",
      difficulty: "intermediate",
      estimatedDuration: "4-6 weeks",
      moduleCount: 5
    }
  ];

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
            await generatePathWithAI(pathData);
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
          await generatePathWithAI(pathData);
          toast.success("Learning path created with modules and content!");
        }
      }

      setTitle("");
      setDescription("");
      setSelectedRecommendation(null);
      setContextFiles([]);
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
            {/* Recommended Paths Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Recommended for You</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Based on your current progress and learning goals
              </p>
              
              <div className="space-y-2">
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
                              <span className="text-muted-foreground">{rec.estimatedDuration}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="capitalize text-muted-foreground">{rec.difficulty}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">{rec.moduleCount} modules</span>
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

              {/* Custom Path Creation */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="description" className="text-sm font-medium">
                    What do you want to learn? <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you want to learn"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!!selectedRecommendation}
                    rows={6}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Be specific about topics, skills, and your learning goals. The AI will generate a title, modules, and complete content.
                  </p>
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
                    ? "Generate This Path with AI" 
                    : "Generate Learning Path with AI"}
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
                    {generationStatus || "Generating with AI..."}
                  </Shimmer>
                </motion.div>
              </Button>
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
