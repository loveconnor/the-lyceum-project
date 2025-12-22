import React from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

import { FilterTab, Lab, LabStatus, Difficulty, LabType } from "@/app/(main)/labs/types";

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
import StatusTabs from "./status-tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LabListProps {
  activeTab: FilterTab;
  onSelectTodo: (id: string) => void;
  onAddTodoClick: () => void;
}

export default function LabList({ activeTab, onSelectTodo, onAddTodoClick }: LabListProps) {
  const router = useRouter();
  const {
    labs,
    updateLab,
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
  const filteredTodos = labs.filter((lab) => {
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

    // Lab type filter
    if (filterLabType && lab.labType !== filterLabType) return false;

    // Estimated time filter
    if (filterEstimatedTime && lab.estimatedTime !== filterEstimatedTime) return false;

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

  const handleStatusChange = (id: string, status: TodoStatus) => {
    updateLab(id, { status });
    toast.success(`Lab progress updated`);
  };

  const clearFilters = () => {
    setFilterDifficulty(null);
    setFilterLabType(null);
    setFilterEstimatedTime(null);
    setSearchQuery("");
    if (showCoreLabsOnly) {
      toggleShowCoreLabsOnly();
    }
  };

  const handleCoreToggle = (id: string) => {
    toggleStarred(id);
  };

  const handleRestartLab = (id: string) => {
    updateLab(id, { status: "pending" as TodoStatus });
    // Reset all subtasks to incomplete
    const lab = labs.find(t => t.id === id);
    if (lab?.subTasks) {
      const resetSubTasks = lab.subTasks.map(st => ({ ...st, completed: false }));
      updateLab(id, { subTasks: resetSubTasks });
    }
    toast.success("Lab has been restarted");
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
        <Checkbox id="core-labs" checked={showCoreLabsOnly} onCheckedChange={toggleShowCoreLabsOnly} />
        <Label htmlFor="core-labs">Core labs only</Label>
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
        <h4 className="text-sm font-medium">Lab Type</h4>
        <div className="flex gap-2 *:grow">
          {(["concept", "practice", "exploration"] as LabType[]).map((type) => (
            <Toggle
              key={type}
              variant="outline"
              size="sm"
              pressed={filterLabType === type}
              onPressedChange={() => setFilterLabType(filterLabType === type ? null : type)}
              className="px-3 text-xs capitalize">
              {type}
            </Toggle>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Estimated Time</h4>
        <div className="flex flex-col gap-2">
          {["< 30 min", "30-60 min", "1-2 hours", "2+ hours"].map((time) => (
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
          {filteredTodos.map((lab) => (
            <LabCard
              key={lab.id}
              lab={lab}
              onView={onSelectTodo}
              onStatusChange={handleStatusChange}
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
        {filteredTodos.map((lab) => (
          <LabCard
            key={lab.id}
            lab={lab}
            onView={onSelectTodo}
            onStatusChange={handleStatusChange}
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
        <StatusTabs activeTab={activeTab} onTabChange={handleTabChange} />

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

      {filteredTodos.length === 0 ? (
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