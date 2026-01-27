'use client';

import React, { useState, useMemo } from 'react';
import { 
  GridIcon, 
  ListIcon, 
  Search, 
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Toggle } from "@/components/ui/toggle";
import { Badge } from '@/components/ui/badge';
import { ReflectionCard } from '@/components/reflections/reflection-list';
import type { Reflection } from '@/types/reflections';
import { cn } from '@/lib/utils';

interface ExtendedReflection extends Reflection {
  pathTitle?: string;
  pathId?: string;
}

interface ReflectionsDashboardProps {
  reflections: ExtendedReflection[];
}

type ViewMode = 'grid' | 'list';

export function ReflectionsDashboard({ reflections }: ReflectionsDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  // Filter Logic
  const filteredReflections = useMemo(() => {
    return reflections
      .filter((reflection) => {
        // Search Filter
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          reflection.context_title.toLowerCase().includes(query) ||
          reflection.pathTitle?.toLowerCase().includes(query);

        // Type Filter
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(reflection.context_type);

        return matchesSearch && matchesType;
      });
      // .sort is already done in page.tsx (by created_at desc)
  }, [reflections, searchQuery, selectedTypes]);

  const uniqueTypes = Array.from(new Set(reflections.map(r => r.context_type)));

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTypes([]);
  };

  const renderFilterContent = () => (
    <div className="space-y-6 p-4">
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Context Type</h4>
        <div className="flex flex-wrap gap-2">
          {uniqueTypes.map((type) => (
            <Toggle
              key={type}
              variant="outline"
              size="sm"
              pressed={selectedTypes.includes(type)}
              onPressedChange={() => {
                setSelectedTypes(prev => 
                  prev.includes(type)
                    ? prev.filter(t => t !== type)
                    : [...prev, type]
                );
              }}
              className="px-3 text-xs capitalize">
              {type.replace('_', ' ')}
            </Toggle>
          ))}
        </div>
      </div>

      {(selectedTypes.length > 0) && (
        <div className="text-end">
          <Button variant="link" size="sm" className="px-0!" onClick={() => setSelectedTypes([])}>
            Clear Filters
            <X className="ml-1 h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        {/* Title Area (replacing Tabs for now as we don't have status tabs) */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Reflections</h2>
          <p className="text-muted-foreground">
             Review your structured thoughts and insights from your learning journey.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 lg:w-auto">
          {/* Search input */}
          <div className="relative w-auto grow lg:grow-0">
            <Search className="absolute top-2.5 left-3 size-4 opacity-50" />
            <Input
              placeholder="Search reflections..."
              className="ps-10 w-full lg:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" className="relative shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
                {selectedTypes.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -end-1.5 -top-1.5 size-4 rounded-full p-0 flex items-center justify-center">
                    {selectedTypes.length}
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
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="shrink-0"
          >
            <ToggleGroupItem value="list" aria-label="List view">
              <ListIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <GridIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Results Area */}
      {filteredReflections.length === 0 ? (
        <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center py-12 text-center">
          <h3 className="text-xl font-medium">No reflections found</h3>
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' 
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
            : "grid-cols-1"
        )}>
          {filteredReflections.map((reflection) => (
            <ReflectionCard 
              key={reflection.id} 
              reflection={reflection}
              pathTitle={reflection.pathTitle}
              pathId={reflection.pathId}
              className="h-full hover:border-primary/50 transition-colors"
            />
          ))}
        </div>
      )}
    </div>
  );
}
