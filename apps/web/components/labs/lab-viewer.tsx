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

interface LabViewerProps {
  lab: Lab;
  moduleContext?: {
    pathId: string;
    moduleId: string;
    onComplete?: () => void;
  };
}

export default function LabViewer({ lab, moduleContext }: LabViewerProps) {
  const { template_type, template_data } = lab;

  // Render the appropriate template based on type
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
}
