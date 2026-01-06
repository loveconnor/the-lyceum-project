"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Clock, Eye, MoreVertical, RotateCcw, Star, Trash2, Info } from "lucide-react";
import { statusClasses } from "@/app/(main)/labs/enum";
import { Lab, LabStatus } from "@/app/(main)/labs/types";
import { Markdown } from "@/components/ui/custom/prompt/markdown";

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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LabCardProps {
  lab: Lab;
  onView?: (id: string) => void;
  onStatusChange?: (id: string, status: LabStatus) => void;
  viewMode: "list" | "grid";
  onCoreToggle?: (id: string) => void;
  onRestart?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const LabCard: React.FC<LabCardProps> = ({
  lab,
  onView,
  onStatusChange,
  viewMode,
  onCoreToggle,
  onRestart,
  onDelete
}) => {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper function to auto-wrap LaTeX patterns
  const wrapMath = (text: string): string => {
    if (!text) return text;
    
    // If already has $ signs, return as is
    if (text.includes('$')) return text;
    
    // Wrap expressions in parentheses that contain LaTeX (backslash commands or special chars)
    let result = text.replace(/\(([^)]*(?:\\[a-z]+|[\^_{}])[^)]*)\)/g, (match, inner) => {
      // Only wrap if it contains LaTeX syntax
      if (/\\[a-z]+|[\^_{}]/.test(inner)) {
        return `$${match}$`;
      }
      return match;
    });
    
    return result;
  };

  // Calculate step progress from lab_progress
  const completedSteps = lab.lab_progress?.filter((p: any) => p.completed).length || 0;
  // Get total steps dynamically from template_data
  const aiSteps = lab.template_data?.steps || [];
  const totalSteps = aiSteps.length > 0 ? aiSteps.length : 4; // Default to 4 if no steps provided
  
  // Calculate actual status based on completed steps (override DB status if incorrect)
  let actualStatus = lab.status;
  if (completedSteps === 0) {
    actualStatus = "not-started";
  } else if (completedSteps > 0 && completedSteps < totalSteps) {
    actualStatus = "in-progress";
  } else if (completedSteps === totalSteps) {
    actualStatus = "completed";
  }
  
  const hasStarted = actualStatus === "in-progress" || actualStatus === "completed";

  // Map status to learning-focused labels
  const statusLabel = {
    "not-started": "Not Started",
    "in-progress": "In Progress", 
    "completed": "Mastered"
  }[actualStatus] || actualStatus;

  // Estimate time based on description or use a default
  // In real implementation, this would come from the data model
  const estimatedTime = "45 min"; // Placeholder - would come from data

  // Learning outcome - placeholder, would come from data
  const learningOutcome = lab.description?.split('\n')[0] || "Build practical skills through hands-on exercises";

  const handleNavigateToLab = () => {
    router.push(`/labs/${lab.id}`);
  };

  if (viewMode === "grid") {
    return (
      <Card
        className={cn(
          "flex h-full flex-col transition-shadow hover:shadow-md cursor-pointer"
        )}
        onClick={handleNavigateToLab}
      >
          <CardContent className="flex h-full flex-col justify-between gap-3 pt-6 pb-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-md font-semibold leading-tight">
                      <Markdown>{wrapMath(lab.title)}</Markdown>
                    </h3>
                    {lab.path_id && isMounted && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-auto w-auto p-0 hover:bg-transparent"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/paths/${lab.path_id}`);
                              }}
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Part of: {lab.path_title}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>

                {isMounted && (
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
                        if (onView) onView(lab.id);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Lab Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRestart) onRestart(lab.id);
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restart Lab
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDelete && !lab.path_id) onDelete(lab.id);
                      }}
                      disabled={!!lab.path_id}
                      className="text-destructive focus:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {lab.path_id ? "Cannot Delete Path Lab" : "Delete Lab"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
              </div>

              <div className="text-muted-foreground text-sm leading-relaxed line-clamp-2 min-h-[2.5rem]">
                <Markdown>{wrapMath(learningOutcome)}</Markdown>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{estimatedTime}</span>
                </div>

                {hasStarted && (
                  <div className="flex items-center gap-1.5">
                    <span>{completedSteps} / {totalSteps} steps</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={statusClasses[actualStatus]}>{statusLabel}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
    );
  }

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md cursor-pointer"
      )}
      onClick={handleNavigateToLab}
    >
        <CardContent className="flex items-start gap-4 py-4">
          <div className="flex grow flex-col space-y-3">
            <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:gap-4">
              <div className="flex items-start gap-2 flex-1">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-md font-semibold leading-tight">
                      <Markdown>{wrapMath(lab.title)}</Markdown>
                    </h3>
                    {lab.path_id && isMounted && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-auto w-auto p-0 hover:bg-transparent"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/paths/${lab.path_id}`);
                              }}
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Part of: {lab.path_title}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>

                {isMounted && (
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
                        if (onView) onView(lab.id);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Lab Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRestart) onRestart(lab.id);
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restart Lab
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDelete && !lab.path_id) onDelete(lab.id);
                      }}
                      disabled={!!lab.path_id}
                      className="text-destructive focus:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {lab.path_id ? "Cannot Delete Path Lab" : "Delete Lab"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge className={statusClasses[actualStatus]}>
                  {statusLabel}
                </Badge>
              </div>
            </div>

            <div className="text-muted-foreground text-sm leading-relaxed">
              <Markdown>{wrapMath(learningOutcome)}</Markdown>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{estimatedTime}</span>
              </div>

              {hasStarted && (
                <div className="flex items-center gap-1.5">
                  <span>{completedSteps} / {totalSteps} steps</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
  );
};

export default LabCard;
