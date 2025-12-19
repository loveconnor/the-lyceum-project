"use client";

import React, { useEffect } from "react";
import { useLabStore } from "./store";

import LabList from "@/components/labs/lab-list";
import CreateLabSheet from "@/components/labs/create-lab-sheet";
import LabDetailSheet from "@/components/labs/lab-detail-sheet";
import { Lab } from "./types";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Labs({ labs }: { labs: Lab[] }) {
  const {
    setLabs,
    activeTab,
    isAddDialogOpen,
    setAddDialogOpen,
    isLabSheetOpen,
    setLabSheetOpen,
    selectedLabId,
    setSelectedLabId
  } = useLabStore();

  useEffect(() => {
    setLabs(labs);
  }, [labs]);

  // Add state for managing edit mode
  const [editTodoId, setEditTodoId] = React.useState<string | null>(null);

  const handleAddTodoClick = () => {
    // Clear edit ID when adding a new Lab
    setEditTodoId(null);
    setAddDialogOpen(true);
  };

  const handleEditTodoClick = (id: string) => {
    // Set the edit ID and open the add/edit sheet
    setEditTodoId(id);
    setAddDialogOpen(true);
  };

  const handleSelectTodo = (id: string) => {
    setSelectedLabId(id);
    setLabSheetOpen(true);
  };

  const handleCloseAddSheet = () => {
    setAddDialogOpen(false);
    setEditTodoId(null);
  };

  const handleCloseTodoSheet = () => {
    setLabSheetOpen(false);
    setSelectedLabId(null);
  };

  return (
    <div className="space-y-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Labs</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/labs/build-demo">
              <ExternalLink className="h-4 w-4" />
              Build Demo
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/labs/explain-demo">
              <ExternalLink className="h-4 w-4" />
              Explain Demo
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/labs/derive-demo">
              <ExternalLink className="h-4 w-4" />
              Derive Demo
            </Link>
          </Button>
        </div>
      </header>

      <LabList
        activeTab={activeTab}
        onSelectTodo={handleSelectTodo}
        onAddTodoClick={handleAddTodoClick}
      />

      <CreateLabSheet
        isOpen={isAddDialogOpen}
        onClose={handleCloseAddSheet}
        editTodoId={editTodoId}
      />

      <LabDetailSheet
        isOpen={isLabSheetOpen}
        onClose={handleCloseTodoSheet}
        todoId={selectedLabId}
      />
    </div>
  );
}