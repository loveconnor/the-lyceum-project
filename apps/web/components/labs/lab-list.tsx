/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useRouter } from "next/navigation";

import {
  FilterTab,
  Difficulty,
  LabTemplateType,
  EstimatedTimeFilter
} from "@/app/(main)/labs/types";

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
import LabCard from "./lab-card";
import { useLabStore } from "@/app/(main)/labs/store";
import StatusTabs from "@/components/widgets/status-tabs";
import { EnumLabStatus, labStatusNamed } from "@/app/(main)/labs/enum";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LabListProps {
  activeTab: FilterTab;
  onSelectTodo: (id: string) => void;
  onAddTodoClick: () => void;
}

const TEMPLATE_TYPE_FILTERS: LabTemplateType[] = [
  "build",
  "explain",
  "analyze",
  "derive",
  "explore",
  "revise"
];

const TEMPLATE_TYPE_LABELS: Record<LabTemplateType, string> = {
  build: "Build",
  explain: "Explain",
  analyze: "Analyze",
  derive: "Derive",
  explore: "Explore",
  revise: "Revise"
};

const ESTIMATED_TIME_FILTERS: EstimatedTimeFilter[] = ["< 30 min", "30-60 min", "1-2 hours", "2+ hours"];

const matchesEstimatedTime = (
  estimatedDuration: number | undefined,
  filter: EstimatedTimeFilter | null
) => {
  if (!filter) return true;
  if (typeof estimatedDuration !== "number" || !Number.isFinite(estimatedDuration)) return false;
  if (filter === "< 30 min") return estimatedDuration < 30;
  if (filter === "30-60 min") return estimatedDuration >= 30 && estimatedDuration <= 60;
  if (filter === "1-2 hours") return estimatedDuration > 60 && estimatedDuration <= 120;
  return estimatedDuration > 120;
};

export default function LabList({ activeTab, onSelectTodo, onAddTodoClick }: LabListProps) {
  const router = useRouter();
  const {
    labs,
    resetLab,
    deleteLab,
    viewMode,
    setViewMode,
    filterDifficulty,
    setFilterDifficulty,
    filterLabType,
    setFilterLabType,
    filterEstimatedTime,
    setFilterEstimatedTime,
    searchQuery,
    setSearchQuery,
    toggleStarred,
    showCoreLabsOnly,
    toggleShowCoreLabsOnly,
    setActiveTab
  } = useLabStore();

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
  };

  // Apply all filters
  const filteredLabs = labs.filter((lab) => {
    // Calculate actual status based on completed steps
    const completedSteps = lab.lab_progress?.filter((p: any) => p.completed).length || 0;
    // Get total steps dynamically from template_data
    const aiSteps = lab.template_data?.steps || [];
    const totalSteps = aiSteps.length > 0 ? aiSteps.length : 4;
    let actualStatus = lab.status;
    if (completedSteps === 0) {
      actualStatus = "not-started";
    } else if (completedSteps > 0 && completedSteps < totalSteps) {
      actualStatus = "in-progress";
    } else if (completedSteps === totalSteps) {
      actualStatus = "completed";
    }

    // Tab filter using calculated status
    if (activeTab !== "all" && actualStatus !== activeTab) return false;

    // Difficulty filter
    if (filterDifficulty && lab.difficulty !== filterDifficulty) return false;

    // Template type filter
    if (filterLabType && lab.template_type !== filterLabType) return false;

    // Estimated duration filter
    if (!matchesEstimatedTime(lab.estimated_duration, filterEstimatedTime)) return false;

    // Core labs filter
    if (showCoreLabsOnly && !lab.starred) return false;

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        lab.title.toLowerCase().includes(query) ||
        lab.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const clearFilters = () => {
    setFilterDifficulty(null);
    setFilterLabType(null);
    setFilterEstimatedTime(null);
    setSearchQuery("");
    if (showCoreLabsOnly) {
      toggleShowCoreLabsOnly(false);
    }
  };

  const handleCoreToggle = (id: string) => {
    toggleStarred(id);
  };

  const handleRestartLab = async (id: string) => {
    try {
      await resetLab(id);
      toast.success("Lab has been restarted");
    } catch (error) {
      toast.error("Failed to restart lab");
    }
  };

  const handleDeleteLab = (id: string) => {
    deleteLab(id, () => {
      // Refresh the dashboard page to update statistics
      router.refresh();
    });
    toast.success("Lab has been deleted");
  };

  const renderFilterContent = () => (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="core-labs"
          checked={showCoreLabsOnly}
          onCheckedChange={(checked) => toggleShowCoreLabsOnly(checked === true)}
        />
        <Label htmlFor="core-labs">Core labs only</Label>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Difficulty</h4>
        <div className="flex gap-2 *:grow">
          {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((difficulty) => (
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
        <h4 className="text-sm font-medium">Template Type</h4>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATE_TYPE_FILTERS.map((type) => (
            <Toggle
              key={type}
              variant="outline"
              size="sm"
              pressed={filterLabType === type}
              onPressedChange={() => setFilterLabType(filterLabType === type ? null : type)}
              className="px-3 text-xs capitalize">
              {TEMPLATE_TYPE_LABELS[type]}
            </Toggle>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Estimated Time</h4>
        <div className="flex flex-col gap-2">
          {ESTIMATED_TIME_FILTERS.map((time) => (
            <Toggle
              key={time}
              variant="outline"
              size="sm"
              pressed={filterEstimatedTime === time}
              onPressedChange={() => setFilterEstimatedTime(filterEstimatedTime === time ? null : time)}
              className="px-3 text-xs justify-start">
              {time}
            </Toggle>
          ))}
        </div>
      </div>

      {(filterDifficulty || filterLabType || filterEstimatedTime || showCoreLabsOnly) && (
        <div className="text-end">
          <Button variant="link" size="sm" className="px-0!" onClick={clearFilters}>
            Clear Filters
            <X />
          </Button>
        </div>
      )}
    </div>
  );

  const renderTodoItems = () => {
    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLabs.map((lab) => (
            <LabCard
              key={lab.id}
              lab={lab}
              onView={onSelectTodo}
              viewMode="grid"
              onCoreToggle={handleCoreToggle}
              onRestart={handleRestartLab}
              onDelete={handleDeleteLab}
            />
          ))}
        </div>
      );
    }

    // List view
    return (
      <div className="grid grid-cols-1 space-y-4">
        {filteredLabs.map((lab) => (
          <LabCard
            key={lab.id}
            lab={lab}
            onView={onSelectTodo}
            viewMode="list"
            onCoreToggle={handleCoreToggle}
            onRestart={handleRestartLab}
            onDelete={handleDeleteLab}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <StatusTabs 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          statusEnum={EnumLabStatus}
          statusNamed={labStatusNamed}
          allLabel="All Labs"
        />

        <div className="flex w-full items-center gap-2 lg:w-auto">
          {/* Search input */}
          <div className="relative w-auto">
            <Search className="absolute top-2.5 left-3 size-4 opacity-50" />
            <Input
              placeholder="Search labs..."
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
                {(filterDifficulty || filterLabType || filterEstimatedTime || showCoreLabsOnly) && (
                  <Badge
                    variant="secondary"
                    className="absolute -end-1.5 -top-1.5 size-4 rounded-full p-0">
                    {(filterDifficulty ? 1 : 0) + (filterLabType ? 1 : 0) + (filterEstimatedTime ? 1 : 0) + (showCoreLabsOnly ? 1 : 0)}
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
                  onClick={onAddTodoClick}
                  className="fixed end-6 bottom-6 z-10 rounded-full! md:size-14">
                  <Plus className="md:size-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Create Lab</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {filteredLabs.length === 0 ? (
        <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center py-12 text-center">
          <h3 className="text-xl font-medium">No labs found</h3>
          <p className="text-muted-foreground mt-2">Create your first hands-on lab to start learning</p>
        </div>
      ) : (
        renderTodoItems()
      )}
    </>
  );
}
