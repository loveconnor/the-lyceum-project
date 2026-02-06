/* eslint-disable @typescript-eslint/no-explicit-any */
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
  GraduationCap,
  AlertCircle
} from "lucide-react";
import { useLabStore } from "@/app/(main)/labs/store";
import { statusClasses } from "@/app/(main)/labs/enum";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface LabDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  labId: string | null;
}

const LabDetailSheet: React.FC<LabDetailSheetProps> = ({
  isOpen,
  onClose,
  labId
}) => {
  const {
    labs,
    addComment,
    deleteComment
  } = useLabStore();

  const [newReflection, setNewReflection] = React.useState("");

  const lab = labs.find((t) => t.id === labId);

  if (!lab) return null;

  const handleAddReflection = () => {
    if (!newReflection.trim()) {
      toast.error("Please write your reflection before submitting");
      return;
    }

    addComment(lab.id, newReflection);
    setNewReflection("");
    toast.success("Your reflection has been saved.");
  };



  const statusLabel = {
    "not-started": "Not Started",
    "in-progress": "In Progress",
    completed: "Mastered"
  }[lab.status] || lab.status;

  // Placeholder data - in real implementation, these would come from the lab/lab model
  const estimatedTime = "45 min";
  const difficulty = "Intermediate";
  const prerequisites = ["Basic JavaScript", "React fundamentals"];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3 pe-6">
            <SheetTitle className="text-xl">{lab.title}</SheetTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusClasses[lab.status]}>{statusLabel}</Badge>
            {lab.starred && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                Core Lab
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <h4 className="text-sm font-medium">Learning Goal</h4>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {lab.description || "Complete this hands-on lab to build practical skills and reinforce key concepts."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Estimated Time</span>
              </div>
              <p className="text-sm">{estimatedTime}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Difficulty</span>
              </div>
              <p className="text-sm">{difficulty}</p>
            </div>
          </div>

          {prerequisites.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Prerequisites</h4>
              <div className="flex flex-wrap gap-2">
                {prerequisites.map((prereq, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {prereq}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Lab Progress</h4>
            {lab.lab_progress && lab.lab_progress.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {lab.lab_progress.filter((p: any) => p.completed).length} / {lab.lab_progress.length} completed
              </span>
            )}
          </div>
          {lab.lab_progress && lab.lab_progress.length > 0 ? (
            <div className="space-y-2">
              {lab.lab_progress.map((progress: any, index: number) => (
                <div
                  key={progress.id}
                  className="bg-muted flex items-center gap-3 rounded-md p-3 transition-colors">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <span
                    className={cn(
                      "text-sm flex-1",
                      progress.completed && "text-muted-foreground line-through"
                    )}>
                    Step {progress.step_id}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground rounded-md p-4 text-center text-sm">
              No progress tracked yet.
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

          {(!lab.lab_comments || lab.lab_comments.length === 0) && (
            <div className="bg-muted text-muted-foreground rounded-md p-4 text-center text-sm">
              No reflections yet. Start documenting your learning journey.
            </div>
          )}

          <div className="space-y-3">
            {lab.lab_comments && lab.lab_comments.map((reflection: any) => (
              <div key={reflection.id} className="bg-muted group relative space-y-2 rounded-md p-3">
                <p className="text-sm leading-relaxed">{reflection.text}</p>
                <div className="text-muted-foreground flex justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {format(new Date(reflection.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => deleteComment(lab.id, reflection.id)}
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

export default LabDetailSheet;
