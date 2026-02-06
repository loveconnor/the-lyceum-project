"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/duration";
import {
  Clock,
  Star,
  BookOpen,
  AlertCircle
} from "lucide-react";
import { usePathStore } from "@/app/(main)/paths/store";
import { statusClasses, pathStatusNamed } from "@/app/(main)/paths/enum";
import { fetchPathById } from "@/lib/api/paths";
import { getPathConstraint } from "@/lib/ai-constraints";
import { createClient } from "@/utils/supabase/client";
import type { Reflection } from "@/types/reflections";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReflectionCard } from "@/components/reflections/reflection-list";
import { AIConstraintNotice } from "@/components/ai/ai-constraint-notice";

interface PathDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pathId: string | null;
}

const PathDetailDialog: React.FC<PathDetailDialogProps> = ({
  isOpen,
  onClose,
  pathId
}) => {
  const {
    paths,
    setPaths
  } = usePathStore();

  const [moduleReflections, setModuleReflections] = React.useState<Reflection[]>([]);
  const [isLoadingReflections, setIsLoadingReflections] = React.useState(false);

  // Fetch fresh path data when sheet opens
  React.useEffect(() => {
    if (isOpen && pathId) {
      fetchPathById(pathId)
        .then((freshPath) => {
          // Update the path in the store with fresh data using functional update
          setPaths((currentPaths) => {
            const existingPath = currentPaths.find((p) => p.id === pathId);
            const mergedWebSources = Array.isArray((freshPath as any)?.web_sources)
              ? (freshPath as any).web_sources
              : existingPath?.web_sources;
            const mergedPath = mergedWebSources
              ? { ...freshPath, web_sources: mergedWebSources }
              : freshPath;
            return currentPaths.map((p) => (p.id === pathId ? mergedPath : p));
          });
        })
        .catch((error) => {
          console.error("Error fetching fresh path data:", error);
        })
    }
  }, [isOpen, pathId, setPaths]);

  const path = paths.find((p) => p.id === pathId);

  const getSourceHost = (url?: string) => {
    if (!url) return "";
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (error) {
      return "";
    }
  };

  const statusLabel = path
    ? pathStatusNamed[path.status as keyof typeof pathStatusNamed] || path.status
    : "";

  // Get path data - calculate duration from estimated_duration (in minutes) or fall back to estimatedDuration string
  const pathDuration = path?.estimated_duration 
    ? formatDuration(path.estimated_duration)
    : path?.estimatedDuration || "Time varies";
  const difficulty = path?.difficulty || "intermediate";
  const moduleItems = React.useMemo(
    () => (path?.learning_path_items || []).filter((item) => item.item_type === "module"),
    [path]
  );
  const totalModules = moduleItems.length > 0 ? moduleItems.length : (path?.modules?.length || 0);
  const completedModules = moduleItems.length > 0
    ? moduleItems.filter((item) => item.status === "completed").length
    : (path?.modules?.filter((m) => m.completed).length || 0);
  const parseWebSources = (value: unknown) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }
    return [];
  };
  const webSources = parseWebSources(path?.web_sources);
  const progressLabel = totalModules > 0
    ? `${completedModules} / ${totalModules} modules completed`
    : "No modules yet";
  const moduleIds = React.useMemo(() => {
    if (!path) {
      return [];
    }
    if (moduleItems.length > 0) {
      return moduleItems.map((item) => item.id);
    }
    if (path.modules && path.modules.length > 0) {
      return path.modules.map((module) => module.id);
    }
    return [];
  }, [moduleItems, path]);

  const sortedReflections = React.useMemo(() => {
    if (moduleReflections.length === 0) return [];
    const orderMap = new Map(moduleIds.map((id, index) => [id, index]));
    return [...moduleReflections].sort((a, b) => {
      const orderA = orderMap.get(a.context_id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.context_id) ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [moduleIds, moduleReflections]);

  React.useEffect(() => {
    if (!isOpen || !pathId) return;
    if (moduleIds.length === 0) {
      setModuleReflections([]);
      return;
    }

    let isActive = true;
    const supabase = createClient();
    setIsLoadingReflections(true);

    const fetchReflections = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isActive) setModuleReflections([]);
          return;
        }

        const { data, error } = await supabase
          .from("reflections")
          .select("*")
          .eq("user_id", user.id)
          .in("context_id", moduleIds)
          .in("context_type", ["module", "path_item"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (isActive) {
          setModuleReflections((data || []) as Reflection[]);
        }
      } catch (error) {
        console.error("Error fetching reflections:", error);
        if (isActive) setModuleReflections([]);
      } finally {
        if (isActive) setIsLoadingReflections(false);
      }
    };

    fetchReflections();
    return () => {
      isActive = false;
    };
  }, [isOpen, pathId, moduleIds]);

  if (!path) return null;
  const pathConstraint = getPathConstraint(path);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 sm:max-w-4xl">
        <div className="border-b bg-muted/30 px-6 py-5">
          <DialogHeader className="text-left space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <DialogTitle className="text-xl">{path.title}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusClasses[path.status as keyof typeof statusClasses]}>{statusLabel}</Badge>
                {path.starred && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    Core Path
                  </Badge>
                )}
              </div>
            </div>
            <DialogDescription>
              Review the path overview, learning journey, and reflections.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-6 px-6 py-5">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Path Overview
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {path.description || "Complete this learning path to build comprehensive skills in this domain."}
              </p>
              <AIConstraintNotice
                constraint={pathConstraint}
                className="max-w-3xl"
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Duration</span>
                  </div>
                  <p className="text-sm">{pathDuration}</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Difficulty</span>
                  </div>
                  <p className="text-sm capitalize">{difficulty}</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Progress</span>
                  </div>
                  <p className="text-sm">{progressLabel}</p>
                </div>
              </div>
            </section>

            <Accordion type="multiple" className="rounded-lg border bg-card/40">
              {webSources.length > 0 && (
                <AccordionItem value="sources" className="px-4">
                  <AccordionTrigger className="py-3 text-sm">
                    <div className="space-y-1 text-left">
                      <span className="font-medium">Sources</span>
                      <span className="block text-xs text-muted-foreground">
                        {webSources.length} source{webSources.length > 1 ? "s" : ""} grounded
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1">
                    <div className="grid gap-2">
                      {webSources.map((source, index) => {
                        const label = source.name || source.url || "Web source";
                        const hostname = getSourceHost(source.url);
                        const content = (
                          <div className="flex items-center gap-3">
                            <Avatar className="size-7 border bg-background/80">
                              <AvatarImage src={source.logo_url} alt={`${label} logo`} />
                              <AvatarFallback className="text-[10px] font-medium">
                                {label.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground truncate">{label}</p>
                              {hostname && (
                                <p className="text-[11px] text-muted-foreground truncate">{hostname}</p>
                              )}
                            </div>
                            {source.source_type && (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {source.source_type}
                              </Badge>
                            )}
                          </div>
                        );

                        return source.url ? (
                          <Link
                            key={`${source.url}-${index}`}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full rounded-md border border-transparent bg-background/60 p-2 transition hover:border-primary/30 hover:bg-background"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div
                            key={`${label}-${index}`}
                            className="w-full rounded-md border border-transparent bg-background/60 p-2"
                          >
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="journey" className="px-4">
                <AccordionTrigger className="py-3 text-sm">
                  <div className="space-y-1 text-left">
                    <span className="font-medium">Learning Journey</span>
                    <span className="block text-xs text-muted-foreground">
                      {path.learning_path_items && path.learning_path_items.length > 0
                        ? `${path.learning_path_items.filter(i => i.status === 'completed').length} / ${path.learning_path_items.length} completed`
                        : totalModules > 0
                          ? `${completedModules} / ${totalModules} modules`
                          : "No items yet"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1">
                  {path.learning_path_items && path.learning_path_items.length > 0 ? (
                    <div className="space-y-3">
                      {path.learning_path_items
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((item, index) => (
                          <div
                            key={item.id}
                            className={cn(
                              "flex flex-col gap-2 rounded-md p-3 transition-colors",
                              item.item_type === 'lab' 
                                ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800" 
                                : "bg-muted"
                            )}>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                                item.item_type === 'lab'
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                  : "bg-primary/10 text-primary"
                              )}>
                                {item.item_type === 'lab' ? '🧪' : index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "text-sm font-medium",
                                      item.status === 'completed' && "text-muted-foreground line-through"
                                    )}>
                                    {item.title}
                                  </span>
                                  {item.item_type === 'lab' && (
                                    <Badge variant="secondary" className="text-xs">Lab</Badge>
                                  )}
                                  {item.item_type === 'module' && (
                                    <Badge variant="outline" className="text-xs">Module</Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                )}
                                {item.item_type === 'lab' && item.content_data?.suggested && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">
                                    💡 Practice what you learned - create this lab to reinforce your knowledge
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : path.modules && path.modules.length > 0 ? (
                    <div className="space-y-3">
                      {path.modules.map((module, index) => (
                        <div
                          key={module.id}
                          className="bg-muted flex flex-col gap-2 rounded-md p-3 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                              {index + 1}
                            </div>
                            <span
                              className={cn(
                                "text-sm font-medium flex-1",
                                module.completed && "text-muted-foreground line-through"
                              )}>
                              {module.title}
                            </span>
                          </div>
                          {module.description && (
                            <p className="text-xs text-muted-foreground ml-9">{module.description}</p>
                          )}
                          {(module.labCount || module.textCount || module.slideCount || module.audioCount || module.mindmapCount) && (
                            <div className="flex flex-wrap gap-2 ml-9 text-xs text-muted-foreground">
                              {module.labCount && <span>🧪 {module.labCount} labs</span>}
                              {module.textCount && <span>📄 {module.textCount} text</span>}
                              {module.slideCount && <span>📊 {module.slideCount} slides</span>}
                              {module.audioCount && <span>🎧 {module.audioCount} audio</span>}
                              {module.mindmapCount && <span>🗺️ {module.mindmapCount} mindmaps</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted text-muted-foreground rounded-md p-4 text-center text-sm">
                      No learning items defined for this path yet.
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="reflection" className="px-4">
                <AccordionTrigger className="py-3 text-sm">
                  <div className="space-y-1 text-left">
                    <span className="font-medium">Reflections</span>
                    <span className="block text-xs text-muted-foreground">
                      {isLoadingReflections
                        ? "Loading reflections..."
                        : sortedReflections.length > 0
                          ? `${sortedReflections.length} reflection${sortedReflections.length > 1 ? "s" : ""}`
                          : "No reflections yet"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        Reflections appear after each module is completed.
                      </p>
                    </div>

                    {!isLoadingReflections && sortedReflections.length === 0 && (
                      <div className="bg-muted text-muted-foreground rounded-md p-4 text-center text-sm">
                        No reflections yet. Complete a module to capture a reflection.
                      </div>
                    )}

                    {sortedReflections.length > 0 && (
                      <div className="space-y-3">
                        {sortedReflections.map((reflection) => (
                          <ReflectionCard
                            key={reflection.id}
                            reflection={reflection}
                            compact
                            pathId={path.id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PathDetailDialog;
