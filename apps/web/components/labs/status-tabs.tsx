import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterTab } from "@/app/(main)/labs/types";
import { EnumLabStatus, labStatusNamed } from "@/app/(main)/labs/enum";

interface StatusTabsProps {
  onTabChange: (tab: FilterTab) => void;
  activeTab: FilterTab;
}

const StatusTabs: React.FC<StatusTabsProps> = ({ onTabChange, activeTab }) => {
  return (
    <Tabs
      defaultValue={activeTab}
      onValueChange={(value) => onTabChange(value as FilterTab)}
      value={activeTab}>
      <TabsList>
        <TabsTrigger value="all">All Labs</TabsTrigger>
        {Object.values(EnumLabStatus).map((status) => (
          <TabsTrigger key={status} value={status}>
            {labStatusNamed[status]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default StatusTabs;