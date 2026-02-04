"use client";

import React, { useEffect } from "react";
import { usePathStore } from "./store";

import PathList from "@/components/paths/path-list";
import PathDetailDialog from "@/components/paths/path-detail-dialog";
import CreatePathDialog from "@/components/paths/create-path-dialog";
import { LearningPath } from "./types";

export default function Paths({ paths }: { paths: LearningPath[] }) {
  const {
    setPaths,
    activeTab,
    isAddDialogOpen,
    setAddDialogOpen,
    isPathSheetOpen,
    setPathSheetOpen,
    selectedPathId,
    setSelectedPathId
  } = usePathStore();

  useEffect(() => {
    setPaths(paths);
  }, [paths, setPaths]);

  // Add state for managing edit mode
  const [editPathId, setEditPathId] = React.useState<string | null>(null);

  const handleAddPathClick = () => {
    // Clear edit ID when adding a new Path
    setEditPathId(null);
    setAddDialogOpen(true);
  };

  const handleEditPathClick = (id: string) => {
    // Set the edit ID and open the add/edit sheet
    setEditPathId(id);
    setAddDialogOpen(true);
  };

  const handleSelectPath = (id: string) => {
    setSelectedPathId(id);
    setPathSheetOpen(true);
  };

  const handleCloseAddSheet = () => {
    setAddDialogOpen(false);
    setEditPathId(null);
  };

  const handleClosePathSheet = () => {
    setPathSheetOpen(false);
    setSelectedPathId(null);
  };

  return (
    <div className="space-y-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Learning Paths</h1>
        <p className="text-muted-foreground mt-1">
          Choose your curriculum and track your progress through structured learning modules
        </p>
      </header>

      <PathList
        activeTab={activeTab}
        onSelectPath={handleSelectPath}
        onAddPathClick={handleAddPathClick}
      />

      <CreatePathDialog
        isOpen={isAddDialogOpen}
        onClose={handleCloseAddSheet}
        editPathId={editPathId}
      />

      <PathDetailDialog
        isOpen={isPathSheetOpen}
        onClose={handleClosePathSheet}
        pathId={selectedPathId}
      />
    </div>
  );
}
