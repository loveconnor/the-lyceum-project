"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LearningPath } from "@/app/(main)/paths/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import ModuleCard from "./module-card";
import { cn } from "@/lib/utils";

interface ModulesViewProps {
  path: LearningPath;
}

export default function ModulesView({ path }: ModulesViewProps) {
  const router = useRouter();

  // Calculate overall path progress
  const completedModules = path.modules?.filter((m) => m.completed).length || 0;
  const totalModules = path.modules?.length || 0;
  const progressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  // Get difficulty label
  const difficultyLabels: Record<string, string> = {
    intro: "Introductory",
    intermediate: "Intermediate",
    advanced: "Advanced"
  };
  const difficultyLabel = path.difficulty ? difficultyLabels[path.difficulty] : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/paths")}
        className="mb-2 -ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Learning Paths
      </Button>

      {/* Path Header */}
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{path.title}</h1>
            {path.description && (
              <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
                {path.description}
              </p>
            )}
          </div>
        </div>

        {/* Path metadata */}
        <div className="flex flex-wrap items-center gap-4">
          {difficultyLabel && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Level:</span>
              <Badge variant="outline">{difficultyLabel}</Badge>
            </div>
          )}

          {path.estimatedDuration && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              <span>{path.estimatedDuration}</span>
            </div>
          )}
        </div>

        {/* Overall progress indicator */}
        {totalModules > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {completedModules} of {totalModules} modules completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
      </header>

      {/* Modules list */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Curriculum Modules</h2>
        
        {path.modules && path.modules.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {path.modules.map((module, index) => (
              <ModuleCard
                key={module.id}
                module={module}
                moduleNumber={index + 1}
                pathId={path.id}
              />
            ))}
          </div>
        ) : (
          <div className="bg-muted/50 flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-center">
              No modules available for this learning path yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
