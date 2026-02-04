"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, GraduationCap, Loader2, MoreHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/utils/supabase/client";
import { EmptyState } from "./empty-state";
import { FIRST_WEEK_LOOP_NOTE } from "./first-week-copy";
import PathDetailDialog from "@/components/paths/path-detail-dialog";
import { generatePath, fetchPaths } from "@/lib/api/paths";
import { usePathStore } from "@/app/(main)/paths/store";
import { markPrimaryFeature, trackEvent } from "@/lib/analytics";

export type Course = {
  id: number;
  name: string;
  category: string;
  confidence: string; // string from AI ("Complete an activity", etc.)
  progress: number;
  started: boolean;
  levelFit: string;
};

type Topic = { name: string; category: string; confidence: string; progress?: number };

type CourseActionsProps = {
  course: Course;
  onViewDetails: (course: Course) => void;
  onStartCourse: (course: Course) => void;
  disabled?: boolean;
};

function CourseActions({ course, onViewDetails, onStartCourse, disabled }: CourseActionsProps) {
  return (
    <div className="text-end">
      {course.started ? (
        <Button size="sm" disabled={disabled}>
          Continue <ChevronRight />
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" disabled={disabled}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onStartCourse(course)}>
              Start Path
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewDetails(course)}>
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export const createColumns = (
  onViewDetails: (course: Course) => void,
  onStartCourse: (course: Course) => void,
  isDisabled: boolean = false
): ColumnDef<Course>[] => [
  {
    accessorKey: "name",
    header: "Course name",
    cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => row.getValue("category")
  },
  {
    accessorKey: "confidence",
    header: "Confidence",
    cell: ({ row }) => <div className="font-medium">{row.getValue("confidence")}</div>
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => <Progress className="h-2 w-20" value={row.getValue("progress")} />
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <CourseActions
        course={row.original}
        onViewDetails={onViewDetails}
        onStartCourse={onStartCourse}
        disabled={isDisabled}
      />
    )
  }
];

export function RecommendedCoursesTable({
  topics = [],
  userId
}: {
  topics?: Topic[];
  userId?: string;
}) {
  const router = useRouter();
  const { setPaths, paths: storePaths } = usePathStore();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [recommended, setRecommended] = React.useState<Topic[]>(topics);
  const [status, setStatus] = React.useState<string | null>(null);
  const [isPathSheetOpen, setIsPathSheetOpen] = React.useState(false);
  const [selectedPathId, setSelectedPathId] = React.useState<string | null>(null);
  const [isGeneratingPath, setIsGeneratingPath] = React.useState(false);
  const isGeneratingPathRef = React.useRef(false);
  const isRegeneratingRef = React.useRef(false);

  React.useEffect(() => {
    setRecommended(topics);
    setIsRegenerating(false);
    setStatus(null);
  }, [topics, userId]);

  React.useEffect(() => {
    trackEvent("widget_rendered", {
      widget_type: "recommended_courses",
      triggered_by_ai: true,
      dashboard_variant: "main"
    });
  }, []);

  const data: Course[] = React.useMemo(() => 
    (recommended || []).map((t, idx) => ({
      id: idx + 1,
      name: t.name || "Recommended topic",
      category: t.category || "General",
      confidence: t.confidence || "Unknown",
      progress: t.progress ?? 0,
      started: false,
      levelFit: "Fit"
    })),
    [recommended]
  );

  const handleViewDetails = React.useCallback(async (course: Course) => {
    if (isGeneratingPathRef.current) return;
    isGeneratingPathRef.current = true;
    setIsGeneratingPath(true);
    try {
      // First, check if a path with this title already exists in store
      let currentPaths = storePaths;
      
      // If store is empty, try to fetch
      if (currentPaths.length === 0) {
        try {
          currentPaths = await fetchPaths();
          setPaths(currentPaths);
        } catch (e) {
          console.error("Failed to fetch paths", e);
        }
      }

      let pathToShow = currentPaths.find(p => 
        p.title.toLowerCase() === course.name.toLowerCase()
      );
      
      // If no existing path, generate a new one
      if (!pathToShow) {
        pathToShow = await generatePath({
          title: course.name,
          description: `Learn ${course.name}`,
          topics: [course.name, course.category].filter(Boolean),
          difficulty: "intermediate"
        });
        trackEvent("learning_path_created", {
          path_id: pathToShow.id,
          generated_by_ai: true,
          topic_domain: course.category,
          difficulty_level: "intermediate",
          total_labs: pathToShow.learning_path_items?.length ?? null
        });
        
        toast.success("Learning path generated!");
        
        // Update the store with the new path
        setPaths([...currentPaths, pathToShow]);
      }
      trackEvent("widget_interacted", {
        widget_type: "recommended_courses",
        triggered_by_ai: true,
        dashboard_variant: "main",
        interaction: "view_path_details",
        target_id: pathToShow.id
      });
      markPrimaryFeature("learning_path");
      
      // Open the path detail sheet with the path
      setSelectedPathId(pathToShow.id);
      setIsPathSheetOpen(true);
    } catch (error) {
      console.error("Error loading path:", error);
      toast.error("Failed to load learning path details");
    } finally {
      isGeneratingPathRef.current = false;
      setIsGeneratingPath(false);
    }
  }, [storePaths, setPaths]);

  const handleStartCourse = React.useCallback(async (course: Course) => {
    if (isGeneratingPathRef.current) return;
    isGeneratingPathRef.current = true;
    setIsGeneratingPath(true);
    try {
      // Generate a new path and navigate to it
      const newPath = await generatePath({
        title: course.name,
        description: `Learn ${course.name}`,
        topics: [course.name, course.category].filter(Boolean),
        difficulty: "intermediate"
      });
      trackEvent("learning_path_created", {
        path_id: newPath.id,
        generated_by_ai: true,
        topic_domain: course.category,
        difficulty_level: "intermediate",
        total_labs: newPath.learning_path_items?.length ?? null
      });
      trackEvent("learning_path_started", {
        path_id: newPath.id,
        generated_by_ai: true,
        topic_domain: course.category,
        difficulty_level: "intermediate",
        total_labs: newPath.learning_path_items?.length ?? null,
        completed_labs_count: 0
      });
      trackEvent("widget_interacted", {
        widget_type: "recommended_courses",
        triggered_by_ai: true,
        dashboard_variant: "main",
        interaction: "start_path_from_recommendations",
        target_id: newPath.id
      });
      markPrimaryFeature("learning_path");
      
      toast.success("Learning path generated!");
      router.push(`/paths/${newPath.id}`);
    } catch (error) {
      console.error("Error generating path:", error);
      toast.error("Failed to start course");
    } finally {
      isGeneratingPathRef.current = false;
      setIsGeneratingPath(false);
    }
  }, [router]);

  const handleClosePathSheet = () => {
    setIsPathSheetOpen(false);
    setSelectedPathId(null);
  };

  const columns = React.useMemo(
    () => createColumns(handleViewDetails, handleStartCourse, isGeneratingPath),
    [handleViewDetails, handleStartCourse, isGeneratingPath]
  );

  const handleRegenerate = React.useCallback(async () => {
    if (isRegeneratingRef.current) return;
    isRegeneratingRef.current = true;
    setIsRegenerating(true);
    setStatus("Requesting new recommendations...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        console.warn("No session found for regenerate");
        isRegeneratingRef.current = false;
        setIsRegenerating(false);
        setStatus("Sign in required to regenerate.");
        return;
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.BACKEND_URL ||
        "http://localhost:3001";

      const res = await fetch(`${baseUrl}/dashboard/recommendations/regenerate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store",
        signal: controller.signal
      });

      if (!res.ok) {
        console.warn("Failed to regenerate recommendations", res.status);
        setStatus("Unable to regenerate right now. Please try again.");
      } else {
        const json = await res.json();
        const refreshed = (json?.recommended_topics || []) as Topic[];
        setRecommended(refreshed.length ? refreshed : topics);
        setStatus("Recommendations refreshed.");
      }
      trackEvent("widget_interacted", {
        widget_type: "recommended_courses",
        triggered_by_ai: true,
        dashboard_variant: "main",
        interaction: "regenerate_recommendations"
      });
    } catch (error) {
      console.error("Regenerate recommendations error", error);
      setStatus(
        error instanceof DOMException && error.name === "AbortError"
          ? "Request timed out. Try again."
          : "Request failed. Please try again."
      );
    } finally {
      clearTimeout(timeout);
      isRegeneratingRef.current = false;
      setIsRegenerating(false);
      setTimeout(() => setStatus(null), 3000);
    }
  }, [topics]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection
    }
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Recommended Courses</CardTitle>
        <CardAction className="col-start-auto row-start-auto mt-2 flex items-center gap-2 justify-self-start lg:col-start-2 lg:row-start-1 lg:mt-0 lg:justify-self-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            aria-busy={isRegenerating}>
            {isRegenerating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Regenerating
              </>
            ) : (
              "Regenerate"
            )}
          </Button>
          <Input
            placeholder="Search courses"
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="w-full sm:w-52"
            disabled={isRegenerating}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {status && !isRegenerating && !isGeneratingPath && (
          <div className="mb-3 text-sm text-muted-foreground" aria-live="polite">
            {status}
          </div>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-36 text-center">
                    <EmptyState
                      icon={GraduationCap}
                      title="No recommendations yet"
                      description="Generate courses tailored to you. Click regenerate to get your first set."
                      note={FIRST_WEEK_LOOP_NOTE}
                      actionLabel="Regenerate"
                      actionIcon={Loader2}
                      onAction={handleRegenerate}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}>
              <ChevronRight />
            </Button>
          </div>
        )}
      </CardContent>
      
      {/* Path Detail Dialog */}
      <PathDetailDialog
        isOpen={isPathSheetOpen}
        onClose={handleClosePathSheet}
        pathId={selectedPathId}
      />
    </Card>
  );
}
