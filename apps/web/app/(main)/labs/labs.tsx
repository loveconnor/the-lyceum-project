"use client";

import React, { useEffect } from "react";
import { useLabStore } from "./store";

import LabList from "@/components/labs/lab-list";
import CreateLabDialog from "@/components/labs/create-lab-dialog";
import LabDetailSheet from "@/components/labs/lab-detail-sheet";

export default function Labs() {
  const {
    fetchLabs,
    activeTab,
    isAddDialogOpen,
    setAddDialogOpen,
    isLabSheetOpen,
    setLabSheetOpen,
    selectedLabId,
    setSelectedLabId
  } = useLabStore();

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

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
      </header>

      <LabList
        activeTab={activeTab}
        onSelectTodo={handleSelectTodo}
        onAddTodoClick={handleAddTodoClick}
      />

      <CreateLabDialog
        isOpen={isAddDialogOpen}
        onClose={handleCloseAddSheet}
        editTodoId={editTodoId}
      />

      <LabDetailSheet
        isOpen={isLabSheetOpen}
        onClose={handleCloseTodoSheet}
        labId={selectedLabId}
      />
    </div>
  );
}
