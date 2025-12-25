"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Module } from "@/app/(main)/paths/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  BookText,
  FlaskConical,
  Presentation,
  Headphones,
  Network,
  PlayCircle
} from "lucide-react";

interface ModuleCardProps {
  module: Module;
  moduleNumber: number;
  pathId: string;
}

// Helper function to determine module status
function getModuleStatus(module: Module): "not-started" | "in-progress" | "completed" {
  // Check if module is completed
  if (module.completed || module.status === 'completed') {
    return "completed";
  }

  // Check progress_data if available
  if (module.progress_data) {
    const { reading_completed, examples_completed, visuals_completed } = module.progress_data;
    
    // If reading is complete and at least one other section, mark as completed
    if (reading_completed && (examples_completed || visuals_completed)) {
      return "completed";
    }
    
    // If any section has progress, mark as in-progress
    if (reading_completed || examples_completed || visuals_completed) {
      return "in-progress";
    }
  }

  // Check status field as fallback
  if (module.status === 'in-progress') {
    return "in-progress";
  }

  return "not-started";
}

// Status badge styling and labels
const statusConfig = {
  "not-started": {
    label: "Not Started",
    variant: "outline" as const,
    className: "border-muted-foreground/30 text-muted-foreground"
  },
  "in-progress": {
    label: "In Progress",
    variant: "warning" as const,
    className: ""
  },
  completed: {
    label: "Completed",
    variant: "success" as const,
    className: ""
  }
};

export default function ModuleCard({ module, moduleNumber, pathId }: ModuleCardProps) {
  const router = useRouter();
  const status = getModuleStatus(module);
  const config = statusConfig[status];

  // Calculate progress from progress_data
  const progressData = module.progress_data || {};
  const completedSections = [
    progressData.reading_completed,
    progressData.examples_completed,
    progressData.visuals_completed,
  ].filter(Boolean).length;
  const totalSections = 3; // Reading, Examples, Visuals
  const progressPercentage = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

  // Calculate total content items
  const totalContent =
    (module.labCount || 0) +
    (module.textCount || 0) +
    (module.slideCount || 0) +
    (module.audioCount || 0) +
    (module.mindmapCount || 0);

  // For demo purposes, showing content breakdown
  const contentItems = [
    { icon: FlaskConical, count: module.labCount, label: "lab" },
    { icon: BookText, count: module.textCount, label: "reading" },
    { icon: Presentation, count: module.slideCount, label: "slide" },
    { icon: Headphones, count: module.audioCount, label: "audio" },
    { icon: Network, count: module.mindmapCount, label: "mindmap" }
  ].filter((item) => item.count && item.count > 0);

  // Handle navigation to module view
  const handleClick = () => {
    router.push(`/paths/${pathId}/modules/${module.id}`);
  };

  return (
    <Card
      className={cn(
        "group relative cursor-pointer transition-all hover:shadow-md",
        status === "completed" && "bg-muted/30"
      )}
      onClick={handleClick}
    >
      <CardContent className="flex flex-col gap-4 pt-6 pb-4">
        {/* Module number and status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                status === "completed"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-primary/10 text-primary"
              )}
            >
              {moduleNumber}
            </div>
          </div>
          <Badge variant={config.variant} className={cn("text-xs", config.className)}>
            {config.label}
          </Badge>
        </div>

        {/* Module title and description */}
        <div className="space-y-2">
          <h3 className="font-semibold leading-tight">{module.title}</h3>
          {module.description && (
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
              {module.description}
            </p>
          )}
        </div>

        {/* Content breakdown */}
        {contentItems.length > 0 && (
          <div className="flex flex-wrap gap-3 text-muted-foreground text-xs">
            {contentItems.map(({ icon: Icon, count, label }, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                <span>
                  {count} {label}
                  {count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Progress indicator for in-progress modules */}
        {status === "in-progress" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completedSections} of {totalSections} sections</span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
