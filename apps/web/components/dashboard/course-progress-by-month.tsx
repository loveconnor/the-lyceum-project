"use client";

import { Area, AreaChart, CartesianGrid } from "recharts";

import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import CalendarDateRangePicker from "@/components/date-range-picker";

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)"
  }
} satisfies ChartConfig;

export function CourseProgressByMonth({
  monthlyActivity = {}
}: {
  monthlyActivity?: Record<string, number>;
}) {
  const entries = Object.entries(monthlyActivity || {});
  const chartData =
    entries.length > 0
      ? entries.map(([month, value]) => ({ month, desktop: value }))
      : [{ month: "No data", desktop: 0 }];

  const hasData = entries.length > 0;
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Course Progress by Month</CardTitle>
        <CardDescription className="flex items-center gap-2">
          Compared to previous month
          <Badge>{entries.length > 1 ? "+ trend" : "No data"}</Badge>
        </CardDescription>
        <CardAction>
          <CalendarDateRangePicker />
        </CardAction>
      </CardHeader>
      {hasData ? (
        <ChartContainer className="w-full lg:h-[430px] min-h-[260px]" config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 0,
              right: 0
            }}>
            <CartesianGrid vertical={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      ) : (
        <div className="px-4 pb-4 text-sm text-muted-foreground">
          No monthly progress yet. Complete an activity to see your trend.
        </div>
      )}
    </Card>
  );
}
