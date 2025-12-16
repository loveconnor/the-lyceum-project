import React from "react";
import { cn } from "@/lib/utils";
import { Clock, Eye, MoreVertical, RotateCcw, Star, Trash2 } from "lucide-react";
import { statusClasses } from "@/app/(main)/labs/enum";
import { Lab, LabStatus } from "@/app/(main)/labs/types";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LabCardProps {
  lab: Lab;
  onView?: (id: string) => void;
  onStatusChange?: (id: string, status: LabStatus) => void;
  viewMode: "list" | "grid";
  onCoreToggle?: (id: string) => void;
  onRestart?: (id: string) => void;
  onDelete?: (id: string) => void;
  isDraggingOverlay?: boolean;
}

const LabCard: React.FC<LabCardProps> = ({
  lab,
  onView,
  onStatusChange,
  viewMode,
  onCoreToggle,
  onRestart,
  onDelete,
  isDraggingOverlay = false
}) => {
  // Calculate sections/exercises completed (using subtasks as sections)
  const completedSections = lab.subTasks?.filter((st) => st.completed).length || 0;
  const totalSections = lab.subTasks?.length || 0;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lab.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? (!isDraggingOverlay ? 0.4 : 0.8) : 1,
    zIndex: isDragging ? 100 : 1
  };

  // Map status to learning-focused labels
  const statusLabel = {
    pending: "Not Started",
    "in-progress": "In Progress", 
    completed: "Mastered"
  }[lab.status] || lab.status;

  // Estimate time based on description or use a default
  // In real implementation, this would come from the data model
  const estimatedTime = "45 min"; // Placeholder - would come from data

  // Learning outcome - placeholder, would come from data
  const learningOutcome = lab.description?.split('\n')[0] || "Build practical skills through hands-on exercises";

  if (viewMode === "grid") {
    return (
      <div ref={setNodeRef} {...attributes} {...listeners} style={style}>
        <Card
          className={cn(
            "flex h-full flex-col transition-shadow hover:shadow-md"
          )}>
          <CardContent className="flex h-full flex-col justify-between gap-3 pt-6 pb-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-md flex-1 font-semibold leading-tight">
                  {lab.title}
                </h3>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0 -mt-1"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        if (onView) onView(lab.id);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Lab Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (onRestart) onRestart(lab.id);
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restart Lab
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (onCoreToggle) onCoreToggle(lab.id);
                      }}
                    >
                      <Star className={cn(
                        "mr-2 h-4 w-4",
                        lab.starred && "fill-amber-500 text-amber-500"
                      )} />
                      {lab.starred ? "Unmark as Core" : "Mark as Core"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (onDelete) onDelete(lab.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Lab
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 min-h-[2.5rem]">
                {learningOutcome}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{estimatedTime}</span>
                </div>

                {totalSections > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span>{completedSections} / {totalSections} sections</span>
                  </div>
                )}
              </div>
              
              <div>
                <Badge className={statusClasses[lab.status]}>{statusLabel}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={style}>
      <Card
        className={cn(
          "transition-shadow hover:shadow-md"
        )}>
        <CardContent className="flex items-start gap-4 py-4">
          <div className="flex grow flex-col space-y-3">
            <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:gap-4">
              <div className="flex items-start gap-2 flex-1">
                <h3 className="text-md font-semibold leading-tight">
                  {lab.title}
                </h3>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        if (onView) onView(lab.id);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Lab Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (onRestart) onRestart(lab.id);
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restart Lab
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (onCoreToggle) onCoreToggle(lab.id);
                      }}
                    >
                      <Star className={cn(
                        "mr-2 h-4 w-4",
                        lab.starred && "fill-amber-500 text-amber-500"
                      )} />
                      {lab.starred ? "Unmark as Core" : "Mark as Core"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (onDelete) onDelete(lab.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Lab
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Badge className={statusClasses[lab.status]}>
                {statusLabel}
              </Badge>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">
              {learningOutcome}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{estimatedTime}</span>
              </div>

              {totalSections > 0 && (
                <div className="flex items-center gap-1.5">
                  <span>{completedSections} / {totalSections} sections</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LabCard;
