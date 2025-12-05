"use client";

import { Users } from "lucide-react";
import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDashboardStore } from "@/store/dashboard-store";

// Couleurs exactes du design Figma
const LEARNING_COLOR_LIGHT = "#252C2C";
const LEARNING_COLOR_DARK = "#E8E9ED";
const REFLECTION_COLOR = "#888DF9";

// Couleurs pour les labels selon le thème
const LABEL_COLOR_LIGHT = "#95979d";
const LABEL_COLOR_DARK = "#B4B4B4"; // Gris clair pour dark mode

// Couleurs pour la grille selon le thème
const GRID_COLOR_LIGHT = "#E8E9ED";
const GRID_COLOR_DARK = "#2A2A2A";

export function ChartCard() {
  const { chartData } = useDashboardStore();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const learningColor = isDark ? LEARNING_COLOR_DARK : LEARNING_COLOR_LIGHT;
  const labelColor = isDark ? LABEL_COLOR_DARK : LABEL_COLOR_LIGHT;
  const gridColor = isDark ? GRID_COLOR_DARK : GRID_COLOR_LIGHT;

  return (
    <div className="relative rounded-xl border border-border bg-card p-6 max-h-[400px] overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-[15px] font-normal text-foreground tracking-[-0.45px]">
            Learning Engagement Over Time
          </h2>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-center gap-[22px]">
        <div className="flex items-center gap-1.5">
          <div
            className="size-3 rounded-full"
            style={{ backgroundColor: learningColor }}
          />
          <span className="text-xs font-medium text-muted-foreground tracking-[-0.24px]">
            Learning Hours
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="size-3 rounded-full"
            style={{ backgroundColor: REFLECTION_COLOR }}
          />
          <span className="text-xs font-medium text-muted-foreground tracking-[-0.24px]">
            Reflections Logged
          </span>
        </div>
      </div>

      <div className="relative pl-8">
        <ResponsiveContainer width="100%" height={237}>
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            barCategoryGap={4}
            barGap={5}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              strokeWidth={1}
            />
            <XAxis
            dataKey="week"
              tick={{
                fill: labelColor,
                fontSize: 12,
                fontWeight: 400,
                fontFamily: "inherit",
              }}
              axisLine={false}
              tickLine={false}
              tickMargin={13}
              style={{
                letterSpacing: "-0.24px",
              }}
            />
            <YAxis
              tick={{
                fill: labelColor,
                fontSize: 12,
                fontWeight: 400,
                fontFamily: "inherit",
              }}
              axisLine={false}
              tickLine={false}
              domain={[0, 14]}
              ticks={[0, 4, 8, 12, 14]}
              style={{
                letterSpacing: "-0.24px",
              }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "transparent",
                border: "none",
                boxShadow: "none",
                padding: 0,
              }}
              wrapperStyle={{
                outline: "none",
              }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const hoursEntry = payload.find((p) => p.dataKey === "learningHours");
                const reflectionEntry = payload.find((p) => p.dataKey === "reflections");
                return (
                  <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
                    <p className="mb-1.5 text-xs font-medium text-foreground tracking-[-0.24px]">
                      {label}
                    </p>
                    {hoursEntry && (
                      <div className="mb-1 flex items-center gap-1.5">
                        <div
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: learningColor }}
                        />
                        <span className="flex-1 text-xs font-medium text-foreground tracking-[-0.24px]">
                          {hoursEntry.value}h learning
                        </span>
                      </div>
                    )}
                    {reflectionEntry && (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: REFLECTION_COLOR }}
                        />
                        <span className="flex-1 text-xs font-medium text-foreground tracking-[-0.24px]">
                          {reflectionEntry.value} reflections
                        </span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="learningHours"
              fill={learningColor}
              radius={[4.912, 4.912, 0, 0]}
              barSize={30}
            />
            <Bar
              dataKey="reflections"
              fill={REFLECTION_COLOR}
              radius={[4.912, 4.912, 0, 0]}
              barSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}