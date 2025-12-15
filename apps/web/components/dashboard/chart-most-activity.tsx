"use client";

import * as React from "react";
import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";

const chartConfig = {
  mentoring: {
    label: "Mentoring",
    color: "var(--chart-1)"
  },
  organization: {
    label: "Organization",
    color: "var(--chart-2)"
  },
  planning: {
    label: "Planning",
    color: "var(--chart-3)"
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
  const entries = Object.entries(activityCounts || {});
  const dynamicConfig =
    entries.length > 0
      ? (Object.fromEntries(
          entries.map(([key], idx) => [
            key,
            {
              label: key,
              color: `var(--chart-${(idx % 3) + 1})`,
            },
          ]),
        ) as ChartConfig)
      : chartConfig;

  const chartData =
    entries.length > 0
      ? entries.map(([key, value]) => ({
          source: key,
          leads: value,
          fill: dynamicConfig[key as ChartConfigKeys]?.color || "var(--chart-1)"
        }))
      : [{ source: "none", leads: 1, fill: "var(--chart-1)" }];

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
              config={dynamicConfig}
              className="mx-auto aspect-square max-h-[250px] min-h-[220px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey="leads"
                  nameKey="source"
                  innerRadius={60}
                  strokeWidth={5}
                />
              </PieChart>
            </ChartContainer>
            <div className="flex justify-around">
              {chartData.map((item) => (
                <div className="flex flex-col" key={item.source}>
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className="block size-2 rounded-full"
                      style={{
                        backgroundColor: dynamicConfig[item.source as ChartConfigKeys]?.color
                      }}></span>
                    <div>{dynamicConfig[item.source as ChartConfigKeys]?.label}</div>
                  </div>
                  <div className="text-center text-xl font-semibold">{item.leads}%</div>
                </div>
              ))}
              <div></div>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-sm">
            No activity yet. Complete an activity to see chart data.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
