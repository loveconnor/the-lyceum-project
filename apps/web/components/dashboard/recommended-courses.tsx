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
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontalIcon } from "lucide-react";

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

export type Course = {
  id: number;
  name: string;
  category: string;
  confidence: string; // string from AI ("Complete an activity", etc.)
  progress: number;
  started: boolean;
  levelFit: string;
};

export const columns: ColumnDef<Course>[] = [
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
    cell: ({ row }) => {
      return (
        <div className="text-end">
          {row.original.started ? (
            <Button size="sm">
              Continue <ChevronRight />
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Start Course</DropdownMenuItem>
                <DropdownMenuItem>View Details</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      );
    }
  }
];

type Topic = { name: string; category: string; confidence: string; progress?: number };

export function RecommendedCoursesTable({
  topics = [],
  userId
}: {
  topics?: Topic[];
  userId?: string;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [recommended, setRecommended] = React.useState<Topic[]>(topics);
  const [status, setStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRecommended(topics);
    setIsRegenerating(false);
    setStatus(null);
  }, [topics, userId]);

  const data: Course[] = (recommended || []).map((t, idx) => ({
    id: idx + 1,
    name: t.name || "Recommended topic",
    category: t.category || "General",
    confidence: t.confidence || "Unknown",
    progress: t.progress ?? 0,
    started: false,
    levelFit: "Fit"
  }));

  const handleRegenerate = async () => {
    if (isRegenerating) return;
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
    } catch (error) {
      console.error("Regenerate recommendations error", error);
      setStatus(
        error instanceof DOMException && error.name === "AbortError"
          ? "Request timed out. Try again."
          : "Request failed. Please try again."
      );
    } finally {
      clearTimeout(timeout);
      setIsRegenerating(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

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
    <Card>
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
      <CardContent>
        {isRegenerating && (
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <Loader2 className="size-4 animate-spin" />
            Refreshing recommendations...
          </div>
        )}
        {status && !isRegenerating && (
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
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 pt-4">
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
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
        </div>
      </CardContent>
    </Card>
  );
}
