"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, Image, ChevronLeft, ChevronRight, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Illustrative visual from the Visual Enrichment Layer.
 * CRITICAL: These are NON-AUTHORITATIVE aids only.
 */
export interface IllustrativeVisualData {
  type: 'illustrative_image';
  src: string;
  alt: string;
  caption: string;
  usage_label: 'illustrative';
  attribution?: string;
  thumbnail_src?: string;
}

interface IllustrativeVisualsProps {
  visuals: IllustrativeVisualData[];
  className?: string;
}

/**
 * Component to display illustrative visual aids in modules.
 * 
 * CRITICAL DESIGN PRINCIPLES:
 * - Visuals are clearly labeled as "Illustrative"
 * - Disclaimer is always visible
 * - Visuals do NOT replace source text
 * - Attribution is shown when available
 */
export function IllustrativeVisuals({ visuals, className }: IllustrativeVisualsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadErrors, setLoadErrors] = useState<Set<number>>(new Set());

  if (!visuals || visuals.length === 0) {
    return null;
  }

  const validVisuals = visuals.filter((_, idx) => !loadErrors.has(idx));
  
  if (validVisuals.length === 0) {
    return null;
  }

  const currentVisual = visuals[currentIndex];
  
  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : visuals.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < visuals.length - 1 ? prev + 1 : 0));
  };

  const handleImageError = (index: number) => {
    setLoadErrors((prev) => new Set(prev).add(index));
  };

  // Skip if current visual failed to load
  if (loadErrors.has(currentIndex) && validVisuals.length > 0) {
    const nextValidIndex = visuals.findIndex((_, idx) => !loadErrors.has(idx));
    if (nextValidIndex !== -1 && nextValidIndex !== currentIndex) {
      setCurrentIndex(nextValidIndex);
    }
  }

  return (
    <Card className={`border-dashed border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Illustrative Diagram
            </CardTitle>
            <Badge 
              variant="outline" 
              className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400"
            >
              Not from source text
            </Badge>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">
                  This is an <strong>illustrative visual aid</strong> to help understanding. 
                  It is NOT from the source material and should not be treated as authoritative. 
                  Always refer to the source text for accurate information.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Disclaimer Banner */}
        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/20 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            This diagram is for illustration only. The source text is the authoritative reference.
          </span>
        </div>

        {/* Image Display */}
        <div 
          className="relative cursor-pointer group"
          onClick={() => setIsModalOpen(true)}
        >
          <img
            src={currentVisual.thumbnail_src || currentVisual.src}
            alt={currentVisual.alt}
            className="w-full h-auto max-h-64 object-contain rounded-md bg-white dark:bg-gray-900"
            onError={() => handleImageError(currentIndex)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-md flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-xs bg-black/50 text-white px-2 py-1 rounded">
              Click to enlarge
            </span>
          </div>
        </div>

        {/* Caption */}
        <p className="text-xs text-muted-foreground italic text-center">
          {currentVisual.caption}
        </p>

        {/* Navigation (if multiple visuals) */}
        {validVisuals.length > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} of {validVisuals.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Attribution */}
        {currentVisual.attribution && (
          <p className="text-[10px] text-muted-foreground text-center">
            {currentVisual.attribution}
          </p>
        )}
      </CardContent>

      {/* Full-size Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400"
              >
                Illustrative Only
              </Badge>
              {currentVisual.alt}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Not from source text — for illustration purposes only
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative">
            <img
              src={currentVisual.src}
              alt={currentVisual.alt}
              className="w-full h-auto max-h-[70vh] object-contain rounded-md"
            />
          </div>
          
          <p className="text-sm text-muted-foreground italic text-center">
            {currentVisual.caption}
          </p>
          
          {currentVisual.attribution && (
            <p className="text-xs text-muted-foreground text-center">
              {currentVisual.attribution}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/**
 * Inline version of illustrative visual for embedding in content.
 */
export function IllustrativeVisualInline({ visual }: { visual: IllustrativeVisualData }) {
  const [imageError, setImageError] = useState(false);
  
  if (imageError) {
    return null;
  }

  return (
    <figure className="my-4 border border-dashed border-amber-500/50 rounded-lg p-3 bg-amber-50/30 dark:bg-amber-950/10">
      <div className="flex items-center gap-1 mb-2">
        <Badge 
          variant="outline" 
          className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400"
        >
          Illustrative diagram
        </Badge>
      </div>
      <img
        src={visual.thumbnail_src || visual.src}
        alt={visual.alt}
        className="w-full max-w-md mx-auto h-auto rounded-md"
        onError={() => setImageError(true)}
      />
      <figcaption className="text-xs text-muted-foreground italic text-center mt-2">
        {visual.caption}
      </figcaption>
    </figure>
  );
}

export default IllustrativeVisuals;
