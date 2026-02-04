"use client";

import { useState, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import { BarChart3 } from "lucide-react";
import { subDays, format, startOfDay, endOfDay, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import CalendarDateRangePicker from "@/components/date-range-picker";
import { EmptyState } from "./empty-state";
import { FIRST_WEEK_LOOP_NOTE } from "./first-week-copy";

type ActivityEntry = {
  timestamp: string;
  type: 'lab' | 'path';
};

const chartConfig = {
  labs: {
    label: "Labs",
    color: "var(--chart-1)"
  },
  paths: {
    label: "Paths",
    color: "var(--chart-2)"
  }
} satisfies ChartConfig;

export function CourseProgressByMonth({
  activities = []
}: {
  activities?: ActivityEntry[];
}) {
  const today = new Date();
  const defaultFrom = startOfDay(subDays(today, 13)); // Last 14 days
  const defaultTo = endOfDay(today);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: defaultFrom,
    to: defaultTo
  });

  const chartData = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    
    const from = dateRange?.from || defaultFrom;
    const to = dateRange?.to || defaultTo;
    const daysDiff = differenceInDays(to, from);
    
    // Determine aggregation period based on date range
    // <= 35 days: daily, <= 90 days: weekly, > 90 days: monthly
    const aggregationType = daysDiff <= 35 ? 'daily' : daysDiff <= 90 ? 'weekly' : 'monthly';
    
    let intervals: { start: Date; end: Date; key: string; label: string }[];
    let getKey: (date: Date) => string;
    
    if (aggregationType === 'daily') {
      const days = eachDayOfInterval({ start: from, end: to });
      intervals = days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        return {
          start: day,
          end: endOfDay(day),
          key,
          label: format(day, 'MMM d')
        };
      });
      getKey = (date) => format(date, 'yyyy-MM-dd');
    } else if (aggregationType === 'weekly') {
      const weeks = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 0 });
      intervals = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
        const key = format(weekStart, 'yyyy-MM-dd');
        return {
          start: weekStart,
          end: weekEnd,
          key,
          label: format(weekStart, 'MMM d')
        };
      });
      getKey = (date) => format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    } else {
      // Monthly aggregation
      const months: { start: Date; end: Date; key: string; label: string }[] = [];
      let current = new Date(from.getFullYear(), from.getMonth(), 1);
      while (current <= to) {
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        months.push({
          start: current,
          end: monthEnd,
          key: format(current, 'yyyy-MM'),
          label: format(current, 'MMM yyyy')
        });
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
      intervals = months;
      getKey = (date) => format(new Date(date.getFullYear(), date.getMonth(), 1), 'yyyy-MM');
    }
    
    // Initialize data structure
    const dataMap = new Map<string, { labs: number; paths: number; label: string }>();
    intervals.forEach(interval => {
      dataMap.set(interval.key, { labs: 0, paths: 0, label: interval.label });
    });
    
    // Count activities
    activities.forEach(activity => {
      const activityDate = new Date(activity.timestamp);
      if (activityDate >= from && activityDate <= to) {
        const key = getKey(activityDate);
        const data = dataMap.get(key);
        if (data) {
          if (activity.type === 'lab') {
            data.labs++;
          } else if (activity.type === 'path') {
            data.paths++;
          }
        }
      }
    });
    
    // Convert to array maintaining order
    return intervals.map(interval => {
      const data = dataMap.get(interval.key) || { labs: 0, paths: 0, label: interval.label };
      return {
        period: data.label,
        labs: data.labs,
        paths: data.paths
      };
    });
  }, [activities, dateRange, defaultFrom, defaultTo]);

  const hasData = chartData.some(d => d.labs > 0 || d.paths > 0);
  
  const periodLabel = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 'periods';
    const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    if (daysDiff <= 35) return 'days';
    if (daysDiff <= 90) return 'weeks';
    return 'months';
  }, [dateRange]);
  
  return (
    <Card className="pb-0 h-full flex flex-col">
      <CardHeader>
        <CardTitle>Activity Over Time</CardTitle>
        <CardDescription className="flex items-center gap-2">
          Labs and learning paths completed
          <Badge>{hasData ? `${chartData.length} ${periodLabel}` : "No data"}</Badge>
        </CardDescription>
        <CardAction>
          <CalendarDateRangePicker onDateChange={setDateRange} initialDate={dateRange} />
        </CardAction>
      </CardHeader>
      {hasData ? (
        <ChartContainer className="w-full lg:h-[430px] min-h-[260px]" config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 24
            }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={chartData.length > 10 ? -45 : 0}
              textAnchor={chartData.length > 10 ? "end" : "middle"}
              height={chartData.length > 10 ? 80 : 30}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="labs"
              fill="var(--color-labs)"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
            <Bar
              dataKey="paths"
              fill="var(--color-paths)"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ChartContainer>
      ) : (
        <EmptyState
          icon={BarChart3}
          className="mx-auto mb-6 flex h-[360px] max-w-md items-center justify-center"
          title="No monthly progress yet"
          description="Track at least one activity to spark your trendline and see momentum build."
          note={FIRST_WEEK_LOOP_NOTE}
        />
      )}
    </Card>
  );
}
