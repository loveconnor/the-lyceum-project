"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { Lab } from "@/app/(main)/labs/types";
import AnalyzeTemplate from "@/components/labs/templates/Analyze";
import BuildTemplate from "@/components/labs/templates/Build";
import DeriveTemplate from "@/components/labs/templates/Derive";
import ExplainTemplate from "@/components/labs/templates/Explain";
import ExploreTemplate from "@/components/labs/templates/Explore";
import ReviseTemplate from "@/components/labs/templates/Revise";
import { Badge } from "@/components/ui/badge";

interface LabViewerProps {
  lab: Lab;
  moduleContext?: {
    pathId: string;
    moduleId: string;
    onComplete?: () => void;
    skillTargets?: string[];
  };
}

export default function LabViewer({ lab, moduleContext }: LabViewerProps) {
  const { template_type, template_data } = lab;
  const visibleSkillTargets = moduleContext?.skillTargets?.slice(0, 8) || [];

  // Render the appropriate template based on type
  const labTemplate = (() => {
    switch (template_type) {
      case "analyze":
        return <AnalyzeTemplate data={template_data as any} labId={lab.id} moduleContext={moduleContext} />;
      case "build":
        return <BuildTemplate data={template_data as any} labId={lab.id} moduleContext={moduleContext} />;
      case "derive":
        return <DeriveTemplate data={template_data as any} labId={lab.id} moduleContext={moduleContext} />;
      case "explain":
        return <ExplainTemplate data={template_data as any} labId={lab.id} moduleContext={moduleContext} />;
      case "explore":
        return <ExploreTemplate data={template_data as any} labId={lab.id} moduleContext={moduleContext} />;
      case "revise":
        return <ReviseTemplate data={template_data as any} labId={lab.id} moduleContext={moduleContext} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Unknown lab type: {template_type}</p>
          </div>
        );
    }
  })();

  if (visibleSkillTargets.length === 0) {
    return labTemplate;
  }

  return (
    <div className="h-full flex flex-col">
      <section className="border-b bg-muted/30 px-4 py-3">
        <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          Skill Transfer Focus
        </h2>
        <p className="mt-1 text-sm text-foreground">
          Apply these module skills while completing this lab:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {visibleSkillTargets.map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="font-normal max-w-full whitespace-normal break-words"
            >
              {skill}
            </Badge>
          ))}
        </div>
      </section>
      <div className="flex-1 min-h-0">{labTemplate}</div>
    </div>
  );
}
