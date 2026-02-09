"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchLabById } from "@/lib/api/labs";
import { Lab } from "@/app/(main)/labs/types";
import LabViewer from "@/components/labs/lab-viewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { markLabTouched, markPrimaryFeature, trackEvent } from "@/lib/analytics";
import { Markdown } from "@/components/ui/custom/prompt/markdown";

// Helper function to properly format mathematical expressions for KaTeX rendering
const formatMathExpression = (text: string): string => {
  if (!text) return text;
  
  // Don't process if already contains $ signs
  if (text.includes('$')) return text;
  
  // Only wrap very specific patterns that are clearly mathematical
  return text.replace(/\b([a-zA-Z])\^(\d+)\b/g, '$$$1^{$2}$$')  // x^2 -> $x^{2}$
            .replace(/\b(\d+)([a-zA-Z])\^(\d+)\b/g, '$$1$2^{$3}$$')  // 3x^2 -> $3x^{2}$
            .replace(/\b(\d+)([a-zA-Z])\b/g, '$$1$2$$')  // 3x -> $3x$
            .replace(/\b([a-zA-Z])\s*([+\-])\s*(\d+)\b/g, '$$1 $2 $3$$');  // x + 2 -> $x + 2$
};

export default function LabPage() {
  const params = useParams();
  const router = useRouter();
  const labId = params.id as string;
  
  const [lab, setLab] = useState<Lab | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasTracked = useRef(false);
  const hasTrackedCompletion = useRef(false);

  useEffect(() => {
    if (!labId) return;
    
    const loadLab = async () => {
      try {
        setLoading(true);
        const data = await fetchLabById(labId);
        setLab(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadLab();
  }, [labId]);

  useEffect(() => {
    if (!lab || hasTracked.current) return;

    const labType = lab.starred ? "core" : "optional";
    markLabTouched(lab.id);
    markPrimaryFeature("lab");
    trackEvent("lab_viewed", {
      lab_id: lab.id,
      lab_type: labType,
      generated_by_ai: true,
      estimated_duration: lab.estimated_duration ?? null
    });

    if (lab.status === "not-started") {
      trackEvent("lab_started", {
        lab_id: lab.id,
        lab_type: labType,
        generated_by_ai: true,
        estimated_duration: lab.estimated_duration ?? null
      });
    }

    hasTracked.current = true;
  }, [lab]);

  useEffect(() => {
    if (!lab || hasTrackedCompletion.current) return;
    if (lab.status !== "completed") return;

    const labType = lab.starred ? "core" : "optional";
    const completionTime = lab.completed_at
      ? Math.max(
          0,
          Math.round(
            (new Date(lab.completed_at).getTime() - new Date(lab.created_at).getTime()) / 1000
          )
        )
      : null;

    trackEvent("lab_completed", {
      lab_id: lab.id,
      lab_type: labType,
      generated_by_ai: true,
      estimated_duration: lab.estimated_duration ?? null,
      completion_time_seconds: completionTime,
      retries_count: lab.lab_progress?.filter((p) => !p.completed).length ?? null
    });
    hasTrackedCompletion.current = true;
  }, [lab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[var(--content-full-height)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !lab) {
    return (
      <div className="flex flex-col items-center justify-center h-[var(--content-full-height)] gap-4">
        <p className="text-muted-foreground">
          {error || "Lab not found"}
        </p>
        <Button onClick={() => router.push("/labs")} variant="outline">
          <ArrowLeft className="h-4 w-4" />
          Back to Labs
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[var(--content-full-height)] flex flex-col">
      <div className="p-4 border-b flex items-center gap-4">
        <Button 
          onClick={() => router.push("/labs")} 
          variant="ghost" 
          size="sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">
            <Markdown className="inline-block">{lab.title}</Markdown>
          </h1>
          {lab.description && (
            <div className="text-sm text-muted-foreground">
              <Markdown>{lab.description}</Markdown>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <LabViewer lab={lab} />
      </div>
    </div>
  );
}
