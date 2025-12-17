import React from "react";
import { cn } from "@/lib/utils";

import { FilterTab, LearningPath, PathStatus, Difficulty } from "@/app/(main)/paths/types";

import { Button } from "@/components/ui/button";
import { Plus, X, Search, SlidersHorizontal, GridIcon, ListIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
import PathCard from "./path-card";
import { usePathStore } from "@/app/(main)/paths/store";
import StatusTabs from "./status-tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PathListProps {
  activeTab: FilterTab;
  onSelectPath: (id: string) => void;
  onAddPathClick: () => void;
}

export default function PathList({ activeTab, onSelectPath, onAddPathClick }: PathListProps) {
  const {
    paths,
    updatePath,
    deletePath,
    viewMode,
    setViewMode,
    filterDifficulty,
    setFilterDifficulty,
    filterEstimatedDuration,
    setFilterEstimatedDuration,
    searchQuery,
    setSearchQuery,
    toggleStarred,
    showCorePathsOnly,
    toggleShowCorePathsOnly,
    setActiveTab
  } = usePathStore();

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
  };

  // Apply all filters
  const filteredPaths = paths.filter((path) => {
    // Tab filter
    if (activeTab !== "all" && path.status !== activeTab) return false;

    // Difficulty filter
    if (filterDifficulty && path.difficulty !== filterDifficulty) return false;

    // Estimated duration filter
    if (filterEstimatedDuration && path.estimatedDuration !== filterEstimatedDuration) return false;

    // Core paths filter
    if (showCorePathsOnly && !path.starred) return false;

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        path.title.toLowerCase().includes(query) ||
        path.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleStatusChange = (id: string, status: PathStatus) => {
    updatePath(id, { status });
    toast.success(`Path progress updated`);
  };

  const clearFilters = () => {
    setFilterDifficulty(null);
    setFilterEstimatedDuration(null);
    setSearchQuery("");
    if (showCorePathsOnly) {
      toggleShowCorePathsOnly();
    }
  };

  const handleCoreToggle = (id: string) => {
    toggleStarred(id);
  };

  const handleRestartPath = (id: string) => {
    updatePath(id, { status: "not-started" as PathStatus });
    // Reset all modules to incomplete
    const path = paths.find(p => p.id === id);
    if (path?.modules) {
      const resetModules = path.modules.map(m => ({ ...m, completed: false }));
      updatePath(id, { modules: resetModules });
    }
    toast.success("Path has been restarted");
  };

  const handleDeletePath = (id: string) => {
    deletePath(id);
    toast.success("Path has been deleted");
  };

  const renderFilterContent = () => (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Checkbox id="core-paths" checked={showCorePathsOnly} onCheckedChange={toggleShowCorePathsOnly} />
        <Label htmlFor="core-paths">Core paths only</Label>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Difficulty</h4>
        <div className="flex gap-2 *:grow">
          {(["intro", "intermediate", "advanced"] as Difficulty[]).map((difficulty) => (
            <Toggle
              key={difficulty}
              variant="outline"
              size="sm"
              pressed={filterDifficulty === difficulty}
              onPressedChange={() => setFilterDifficulty(filterDifficulty === difficulty ? null : difficulty)}
              className="px-3 text-xs capitalize">
              {difficulty}
            </Toggle>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Duration</h4>
        <div className="flex flex-col gap-2">
          {["< 4 weeks", "4-8 weeks", "8-12 weeks", "12+ weeks"].map((duration) => (
            <Toggle
              key={duration}
              variant="outline"
              size="sm"
              pressed={filterEstimatedDuration === duration}
              onPressedChange={() => setFilterEstimatedDuration(filterEstimatedDuration === duration ? null : duration)}
              className="px-3 text-xs justify-start">
              {duration}
            </Toggle>
          ))}
        </div>
      </div>

      {(filterDifficulty || filterEstimatedDuration || showCorePathsOnly) && (
        <div className="text-end">
          <Button variant="link" size="sm" className="px-0!" onClick={clearFilters}>
            Clear Filters
            <X />
          </Button>
        </div>
      )}
    </div>
  );

  const renderPathItems = () => {
    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPaths.map((path) => (
            <PathCard
              key={path.id}
              path={path}
              onView={onSelectPath}
              onStatusChange={handleStatusChange}
              viewMode="grid"
              onCoreToggle={handleCoreToggle}
              onRestart={handleRestartPath}
              onDelete={handleDeletePath}
            />
          ))}
        </div>
      );
    }

    // List view
    return (
      <div className="grid grid-cols-1 space-y-4">
        {filteredPaths.map((path) => (
          <PathCard
            key={path.id}
            path={path}
            onView={onSelectPath}
            onStatusChange={handleStatusChange}
            viewMode="list"
            onCoreToggle={handleCoreToggle}
            onRestart={handleRestartPath}
            onDelete={handleDeletePath}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <StatusTabs activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="flex w-full items-center gap-2 lg:w-auto">
          {/* Search input */}
          <div className="relative w-auto">
            <Search className="absolute top-2.5 left-3 size-4 opacity-50" />
            <Input
              placeholder="Search learning paths..."
              className="ps-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" className="relative">
                <SlidersHorizontal />
                {(filterDifficulty || filterEstimatedDuration || showCorePathsOnly) && (
                  <Badge
                    variant="secondary"
                    className="absolute -end-1.5 -top-1.5 size-4 rounded-full p-0">
                    {(filterDifficulty ? 1 : 0) + (filterEstimatedDuration ? 1 : 0) + (showCorePathsOnly ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
              {renderFilterContent()}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View mode toggle */}
          <ToggleGroup
            type="single"
            variant="outline"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as "list" | "grid")}>
            <ToggleGroupItem value="list" aria-label="List view">
              <ListIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <GridIcon />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Add button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={onAddPathClick}
                  className="fixed end-6 bottom-6 z-10 rounded-full! md:size-14">
                  <Plus className="md:size-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Create Learning Path</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {filteredPaths.length === 0 ? (
        <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center py-12 text-center">
          <h3 className="text-xl font-medium">No learning paths found</h3>
          <p className="text-muted-foreground mt-2">Explore your first learning path to begin your curriculum</p>
        </div>
      ) : (
        renderPathItems()
      )}
    </>
  );
}