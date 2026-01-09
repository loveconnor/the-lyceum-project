"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { EmptyState } from "./empty-state";

const chartConfig = {
  lab_completed: {
    label: "Labs Completed",
    color: "var(--chart-1)"
  },
  lab_started: {
    label: "Labs Started",
    color: "var(--chart-2)"
  },
  path_completed: {
    label: "Paths Completed",
    color: "var(--chart-3)"
  },
  path_started: {
    label: "Paths Started",
    color: "var(--chart-4)"
  },
  chat_active: {
    label: "Chats Created",
    color: "var(--chart-5)"
  },
  none: {
    label: "No activity yet",
    color: "var(--chart-1)"
  }
} satisfies ChartConfig;

type ChartConfigKeys = keyof typeof chartConfig;

export function ChartMostActivity({
  activityCounts = {}
}: {
  activityCounts?: Record<string, number>;
}) {
  const entries = Object.entries(activityCounts || {}).filter(([_, value]) => value > 0);
  
  const chartData =
    entries.length > 0
      ? entries.map(([key, value], idx) => ({
          activity: chartConfig[key as ChartConfigKeys]?.label || key,
          count: value,
          fill: chartConfig[key as ChartConfigKeys]?.color || `var(--chart-${(idx % 4) + 1})`
        }))
      : [{ activity: "none", count: 1, fill: "var(--chart-1)" }];

  const hasData = entries.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {hasData ? (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[250px] min-h-[220px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="activity"
                  innerRadius={60}
                  strokeWidth={5}
                />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-6 px-4">
              {entries.map(([key, value]) => (
                <div className="flex flex-col items-center" key={key}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="block size-3 rounded-full"
                      style={{
                        backgroundColor: chartConfig[key as ChartConfigKeys]?.color
                      }}></span>
                    <div className="text-sm font-medium">{chartConfig[key as ChartConfigKeys]?.label}</div>
                  </div>
                  <div className="text-center text-2xl font-bold">{value}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Log your first study session or course to light up this activity map."
          />
        )}
      </CardContent>
    </Card>
  );
}
