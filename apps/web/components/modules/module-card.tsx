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
  CheckCircle2,
  Circle,
  PlayCircle
} from "lucide-react";

interface ModuleCardProps {
  module: Module;
  moduleNumber: number;
  pathId: string;
}

// Helper function to determine module status
function getModuleStatus(module: Module): "not-started" | "in-progress" | "completed" {
  if (module.completed) {
    return "completed";
  }

  // Calculate if module has been started based on content counts
  const totalContent =
    (module.labCount || 0) +
    (module.textCount || 0) +
    (module.slideCount || 0) +
    (module.audioCount || 0) +
    (module.mindmapCount || 0);

  // For this example, we'll consider it in-progress if it's marked completed: false
  // In a real implementation, you'd track individual content item completion
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

  // Status icon
  const StatusIcon = status === "completed" ? CheckCircle2 : status === "in-progress" ? PlayCircle : Circle;

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
            <StatusIcon
              className={cn(
                "h-4 w-4",
                status === "completed" && "text-green-600 dark:text-green-500",
                status === "in-progress" && "text-orange-600 dark:text-orange-500",
                status === "not-started" && "text-muted-foreground"
              )}
            />
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
              <span className="font-medium">3 of {totalContent} steps</span>
            </div>
            <Progress value={30} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
