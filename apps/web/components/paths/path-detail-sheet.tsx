import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  FileIcon,
  FilePlus,
  Trash2,
  Clock,
  Star,
  BookOpen,
  AlertCircle
} from "lucide-react";
import { usePathStore } from "@/app/(main)/paths/store";
import { statusClasses, pathStatusNamed } from "@/app/(main)/paths/enum";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface PathDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pathId: string | null;
}

const PathDetailSheet: React.FC<PathDetailSheetProps> = ({
  isOpen,
  onClose,
  pathId
}) => {
  const {
    paths,
    addComment,
    deleteComment,
    addFile,
    removeFile
  } = usePathStore();

  const [newReflection, setNewReflection] = React.useState("");

  const path = paths.find((p) => p.id === pathId);

  if (!path) return null;

  const handleAddReflection = () => {
    if (!newReflection.trim()) {
      toast.error("Please write your reflection before submitting");
      return;
    }

    addComment(path.id, newReflection);
    setNewReflection("");
    toast.success("Your reflection has been saved.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        addFile(path.id, {
          name: file.name,
          url: reader.result as string,
          type: file.type,
          size: file.size,
          uploadedAt: new Date()
        });

        toast.success(`${file.name} has been added to your path resources`);
      };
    });

    e.target.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const statusLabel = pathStatusNamed[path.status as keyof typeof pathStatusNamed] || path.status;

  // Get path data
  const pathDuration = path.estimatedDuration || "8-12 weeks";
  const difficulty = path.difficulty || "intermediate";
  const totalModules = path.modules?.length || 0;
  const completedModules = path.modules?.filter(m => m.completed).length || 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3 pe-6">
            <SheetTitle className="text-xl">{path.title}</SheetTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusClasses[path.status as keyof typeof statusClasses]}>{statusLabel}</Badge>
            {path.starred && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                Core Path
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <h4 className="text-sm font-medium">Path Overview</h4>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {path.description || "Complete this learning path to build comprehensive skills in this domain."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Duration</span>
              </div>
              <p className="text-sm">{pathDuration}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Difficulty</span>
              </div>
              <p className="text-sm capitalize">{difficulty}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Progress</span>
            </div>
            <p className="text-sm">{completedModules} / {totalModules} modules completed</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Learning Modules</h4>
            {path.modules && path.modules.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {path.modules.filter(m => m.completed).length} / {path.modules.length} completed
              </span>
            )}
          </div>
          {path.modules && path.modules.length > 0 ? (
            <div className="space-y-3">
              {path.modules.map((module, index) => (
                <div
                  key={module.id}
                  className="bg-muted flex flex-col gap-2 rounded-md p-3 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {index + 1}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium flex-1",
                        module.completed && "text-muted-foreground line-through"
                      )}>
                      {module.title}
                    </span>
                  </div>
                  {module.description && (
                    <p className="text-xs text-muted-foreground ml-9">{module.description}</p>
                  )}
                  {(module.labCount || module.textCount || module.slideCount || module.audioCount || module.mindmapCount) && (
                    <div className="flex flex-wrap gap-2 ml-9 text-xs text-muted-foreground">
                      {module.labCount && <span>🧪 {module.labCount} labs</span>}
                      {module.textCount && <span>📄 {module.textCount} text</span>}
                      {module.slideCount && <span>📊 {module.slideCount} slides</span>}
                      {module.audioCount && <span>🎧 {module.audioCount} audio</span>}
                      {module.mindmapCount && <span>🗺️ {module.mindmapCount} mindmaps</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground rounded-md p-4 text-center text-sm">
              No modules defined for this path yet.
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Resources</h4>
            <div>
              <input
                type="file"
                id="file-upload"
                multiple
                className="sr-only"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <FilePlus className="h-4 w-4" />
                    Add Resource
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {path.files && path.files.length > 0 ? (
            <div className="space-y-2">
              {path.files.map((file) => (
                <div
                  key={file.id}
                  className="bg-muted flex items-center justify-between rounded-md p-3 transition-colors hover:bg-muted/80">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="overflow-hidden">
                      <Link
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm font-medium hover:underline">
                        {file.name}
                      </Link>
                      <span className="text-muted-foreground text-xs">
                        {formatFileSize(file.size)} •{" "}
                        {format(new Date(file.uploadedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(path.id, file.id)}
                    className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground rounded-md p-4 text-center text-sm">
              No resources added yet. Add helpful materials to support your learning.
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium">Reflection</h4>
            <p className="text-xs text-muted-foreground">
              Document what you learned, challenges you faced, or concepts that are still unclear.
            </p>
          </div>

          {path.comments.length === 0 && (
            <div className="bg-muted text-muted-foreground rounded-md p-4 text-center text-sm">
              No reflections yet. Start documenting your learning journey.
            </div>
          )}

          <div className="space-y-3">
            {path.comments.map((reflection) => (
              <div key={reflection.id} className="bg-muted group relative space-y-2 rounded-md p-3">
                <p className="text-sm leading-relaxed">{reflection.text}</p>
                <div className="text-muted-foreground flex justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {format(new Date(reflection.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => deleteComment(path.id, reflection.id)}
                    className="h-auto p-1 text-destructive opacity-0 hover:text-destructive group-hover:opacity-100"
                    size="sm">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Textarea
              placeholder="What did you learn? What challenges did you face? What's still unclear?"
              value={newReflection}
              onChange={(e) => setNewReflection(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <Button onClick={handleAddReflection} className="w-full">
              Save Reflection
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PathDetailSheet;
