import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterTab } from "@/app/(main)/paths/types";
import { EnumPathStatus, pathStatusNamed } from "@/app/(main)/paths/enum";

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
        <TabsTrigger value="all">All Paths</TabsTrigger>
        {Object.values(EnumPathStatus).map((status) => (
          <TabsTrigger key={status} value={status}>
            {pathStatusNamed[status]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default StatusTabs;