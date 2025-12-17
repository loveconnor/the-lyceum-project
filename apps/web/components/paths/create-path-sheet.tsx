import React from "react";
import { Sparkles, TrendingUp, Target, ChevronRight, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathStore } from "@/app/(main)/paths/store";
import { LearningPath } from "@/app/(main)/paths/types";
import { EnumPathStatus } from "@/app/(main)/paths/enum";
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

interface CreatePathSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editPathId?: string | null;
}

const CreatePathSheet: React.FC<CreatePathSheetProps> = ({ isOpen, onClose, editPathId }) => {
  const { addPath, updatePath, paths } = usePathStore();
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<string | null>(null);
  const [contextFiles, setContextFiles] = React.useState<File[]>([]);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<"intro" | "intermediate" | "advanced">("intermediate");
  const [estimatedDuration, setEstimatedDuration] = React.useState("8-12 weeks");

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
        setDifficulty(pathToEdit.difficulty || "intermediate");
        setEstimatedDuration(pathToEdit.estimatedDuration || "8-12 weeks");
      }
    } else {
      setTitle("");
      setDescription("");
      setDifficulty("intermediate");
      setEstimatedDuration("8-12 weeks");
    }
  }, [editPathId, paths, isOpen]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedRecommendation) {
      // Use recommended path data
      const rec = recommendedPaths.find(r => r.id === selectedRecommendation);
      if (rec) {
        const newPath = {
          id: `path-${Date.now()}`,
          title: rec.title,
          description: rec.description,
          difficulty: rec.difficulty as "intro" | "intermediate" | "advanced",
          estimatedDuration: rec.estimatedDuration,
          status: EnumPathStatus.NotStarted,
          starred: false,
          modules: [],
          completedModules: 0,
          totalModules: rec.moduleCount
        };
        
        if (editPathId) {
          updatePath(editPathId, newPath);
          toast.success("Your learning path has been updated successfully.");
        } else {
          addPath(newPath);
          toast.success("Learning path created! You can now add modules.");
        }
      }
    } else {
      // Create custom path from form
      if (!title.trim()) {
        toast.error("Please enter a title");
        return;
      }
      
      const pathData = {
        id: `path-${Date.now()}`,
        title,
        description,
        difficulty,
        estimatedDuration,
        status: EnumPathStatus.NotStarted,
        starred: false,
        modules: [],
        completedModules: 0,
        totalModules: 0
      };
      
      if (editPathId) {
        updatePath(editPathId, pathData);
        toast.success("Your learning path has been updated successfully.");
      } else {
        addPath(pathData);
        toast.success("Learning path created! You can now add modules.");
      }
    }

    setTitle("");
    setDescription("");
    setDifficulty("intermediate");
    setEstimatedDuration("8-12 weeks");
    setSelectedRecommendation(null);
    setContextFiles([]);
    onClose();
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
            <SheetTitle>{editPathId ? "Edit Learning Path" : "Create Learning Path"}</SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Select a recommended path or create your own custom learning journey.
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
                <label htmlFor="title" className="text-sm font-medium">Path Title</label>
                <Input
                  id="title"
                  placeholder="Full-Stack Web Development"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!!selectedRecommendation}
                  className="mt-1.5"
                />
              </div>

              <div>
                <label htmlFor="description" className="text-sm font-medium">Description</label>
                <Textarea
                  id="description"
                  placeholder="A comprehensive learning path covering frontend and backend development, databases, APIs, and deployment."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!!selectedRecommendation}
                  rows={4}
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="difficulty" className="text-sm font-medium">Difficulty</label>
                  <Select
                    value={difficulty}
                    onValueChange={(value: any) => setDifficulty(value)}
                    disabled={!!selectedRecommendation}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intro">Introductory</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="duration" className="text-sm font-medium">Estimated Duration</label>
                  <Input
                    id="duration"
                    placeholder="8-12 weeks"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    disabled={!!selectedRecommendation}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            <Button 
              className="w-full" 
              type="submit"
              disabled={!selectedRecommendation && !title.trim()}
            >
              <Sparkles className="h-4 w-4" />
              {selectedRecommendation ? "Add This Path" : "Create Learning Path"}
            </Button>
          </form>
      </SheetContent>
    </Sheet>
  );
};

export default CreatePathSheet;
