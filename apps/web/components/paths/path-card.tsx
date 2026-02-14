"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/duration";
import { Clock, Eye, MoreVertical, RotateCcw, Star, Trash2, BookOpen, FlaskConical } from "lucide-react";
import { statusClasses, pathStatusNamed } from "@/app/(main)/paths/enum";
import { LearningPath, PathStatus } from "@/app/(main)/paths/types";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PathCardProps {
  path: LearningPath;
  onView?: (id: string) => void;
  onStatusChange?: (id: string, status: PathStatus) => void;
  viewMode: "list" | "grid";
  onCoreToggle?: (id: string) => void;
  onRestart?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const PathCard: React.FC<PathCardProps> = ({
  path,
  onView,
  onStatusChange,
  viewMode,
  onCoreToggle,
  onRestart,
  onDelete
}) => {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Calculate items completed (modules + labs)
  const completedItems = path.learning_path_items?.filter((i) => i.status === 'completed').length || 0;
  const totalItems = path.learning_path_items?.length || 0;
  
  // Count labs and modules separately
  const totalLabs = path.learning_path_items?.filter(i => i.item_type === 'lab').length || 0;
  const totalModules = path.learning_path_items?.filter(i => i.item_type === 'module').length || 0;

  // Fallback to old modules field if learning_path_items not available
  const legacyCompletedModules = path.modules?.filter((m) => m.completed).length || 0;
  const legacyTotalModules = path.modules?.length || 0;

  // Get status label from enum
  const statusLabel = pathStatusNamed[path.status as keyof typeof pathStatusNamed] || path.status;

  // Path duration - calculate from estimated_duration (in minutes) or fall back to estimatedDuration string
  const pathDuration = path.estimated_duration 
    ? formatDuration(path.estimated_duration)
    : path.estimatedDuration || "Time varies";

  // Path description for overall goal
  const pathGoal = path.description || "Comprehensive curriculum to build expertise in this domain";

  // Navigate to modules page
  const handleNavigateToModules = () => {
    router.push(`/paths/${path.id}`);
  };

  if (viewMode === "grid") {
    return (
      <>
      <Card
        className={cn(
          "flex h-full flex-col transition-shadow hover:shadow-md cursor-pointer"
        )}
        onClick={handleNavigateToModules}
      >
          <CardContent className="flex h-full flex-col justify-between gap-3 pt-6 pb-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-md flex-1 font-semibold leading-tight">
                  {path.title}
                </h3>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onView) onView(path.id);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Path Overview
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRestart) onRestart(path.id);
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restart Path
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCoreToggle) onCoreToggle(path.id);
                      }}
                    >
                      <Star className={cn(
                        "mr-2 h-4 w-4",
                        path.starred && "fill-amber-500 text-amber-500"
                      )} />
                      {path.starred ? "Unmark as Core" : "Mark as Core"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Path
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 min-h-[2.5rem]">
                {pathGoal}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{pathDuration}</span>
                </div>

                {totalItems > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{completedItems} / {totalItems} items</span>
                  </div>
                ) : legacyTotalModules > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{legacyCompletedModules} / {legacyTotalModules} modules</span>
                  </div>
                ) : null}
              </div>
              
              {(totalModules > 0 || totalLabs > 0) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {totalModules > 0 && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {totalModules} modules
                    </span>
                  )}
                  {totalLabs > 0 && (
                    <span className="flex items-center gap-1">
                      <FlaskConical className="h-3 w-3" />
                      {totalLabs} labs
                    </span>
                  )}
                </div>
              )}
            </div>
              
            <div>
              <Badge className={statusClasses[path.status as keyof typeof statusClasses]}>{statusLabel}</Badge>
            </div>
          </CardContent>
        </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Learning Path</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{path.title}&quot;? This action cannot be undone and will remove all modules and progress associated with this path.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete(path.id);
                setIsDeleteDialogOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
  }

  return (
    <>
    <Card
      className={cn(
        "transition-shadow hover:shadow-md cursor-pointer"
      )}
      onClick={handleNavigateToModules}
    >
        <CardContent className="flex items-start gap-4 py-4">
          <div className="flex grow flex-col space-y-3">
            <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:gap-4">
              <div className="flex items-start gap-2 flex-1">
                <h3 className="text-md font-semibold leading-tight">
                  {path.title}
                </h3>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onView) onView(path.id);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Path Overview
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRestart) onRestart(path.id);
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restart Path
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCoreToggle) onCoreToggle(path.id);
                      }}
                    >
                      <Star className={cn(
                        "mr-2 h-4 w-4",
                        path.starred && "fill-amber-500 text-amber-500"
                      )} />
                      {path.starred ? "Unmark as Core" : "Mark as Core"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Path
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Badge className={statusClasses[path.status as keyof typeof statusClasses]}>
                {statusLabel}
              </Badge>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">
              {pathGoal}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{pathDuration}</span>
              </div>

              {totalItems > 0 ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{completedItems} / {totalItems} items</span>
                  </div>
                  {(totalModules > 0 || totalLabs > 0) && (
                    <div className="flex items-center gap-2 text-xs">
                      {totalModules > 0 && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {totalModules} modules
                        </span>
                      )}
                      {totalLabs > 0 && (
                        <span className="flex items-center gap-1">
                          <FlaskConical className="h-3 w-3" />
                          {totalLabs} labs
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : legacyTotalModules > 0 ? (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{legacyCompletedModules} / {legacyTotalModules} modules</span>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Learning Path</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{path.title}&quot;? This action cannot be undone and will remove all modules and progress associated with this path.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete(path.id);
                setIsDeleteDialogOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PathCard;
