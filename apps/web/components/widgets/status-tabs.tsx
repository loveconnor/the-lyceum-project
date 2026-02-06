"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StatusTabsProps<T extends string> {
  onTabChange: (tab: T | "all") => void;
  activeTab: T | "all";
  statusEnum: Record<string, T>;
  statusNamed: Record<T, string>;
  allLabel: string;
}

function StatusTabs<T extends string>({
  onTabChange,
  activeTab,
  statusEnum,
  statusNamed,
  allLabel
}: StatusTabsProps<T>) {
  return (
    <Tabs
      defaultValue={activeTab}
      onValueChange={(value) => onTabChange(value as T | "all")}
      value={activeTab}>
      <TabsList>
        <TabsTrigger value="all">{allLabel}</TabsTrigger>
        {Object.values(statusEnum).map((status) => (
          <TabsTrigger key={status} value={status}>
            {statusNamed[status]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export default StatusTabs;
