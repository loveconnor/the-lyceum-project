"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { D3Chart } from "./d3-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  BarChart3,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/custom/prompt/markdown";

/**
 * Chart Widget Data Interface
 * 
 * Supports multiple chart types including mathematical function plotting.
 * 
 * Example for mathematical functions:
 * {
 *   title: "Quadratic Function",
 *   description: "Graph of y = x^2",
 *   chartOptions: {
 *     series: [{
 *       type: 'function',
 *       function: 'x^2',           // Math expression
 *       xMin: -5,                   // Domain start
 *       xMax: 5,                    // Domain end
 *       numPoints: 200,             // Number of points to plot
 *       stroke: '#3b82f6',         // Line color
 *       strokeWidth: 3,            // Line width
 *       showPoints: false,         // Show dots on curve
 *       showZeroLine: true,        // Show x-axis reference
 *       label: 'y = x²'            // Function label
 *     }]
 *   }
 * }
 * 
 * Supported math operations:
 * - Basic: +, -, *, /, ^(power)
 * - Trig: sin, cos, tan, asin, acos, atan
 * - Hyperbolic: sinh, cosh, tanh
 * - Other: exp, log/ln, sqrt, abs, floor, ceil
 * - Constants: PI, E
 */
interface ChartWidgetData {
  title: string;
  description?: string;
  chartOptions: {
    series?: Array<{ type?: string }>;
    [key: string]: unknown;
  };
}

interface ChartWidgetProps {
  charts: ChartWidgetData[];
  height?: string;
  showNavigation?: boolean;
  showSidebar?: boolean;
  onViewComplete?: () => void;
  variant?: "card" | "full";
}

const useIsClient = () =>
  useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

export function ChartWidget({
  charts,
  height = "350px",
  showNavigation = true,
  showSidebar = true,
  onViewComplete
}: ChartWidgetProps) {
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const [viewedCharts, setViewedCharts] = useState<Set<number>>(new Set());
  const isMounted = useIsClient();

  // Mark chart as viewed after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!viewedCharts.has(currentChartIndex)) {
        setViewedCharts(prev => {
          const newViewed = new Set(prev);
          newViewed.add(currentChartIndex);
          return newViewed;
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentChartIndex, viewedCharts]);

  // Check if all charts have been viewed
  useEffect(() => {
    if (viewedCharts.size >= charts.length && onViewComplete) {
      onViewComplete();
    }
  }, [viewedCharts.size, charts.length, onViewComplete]);

  if (!charts || charts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-2xl border-2 border-dashed">
          <CardContent className="p-12 text-center space-y-4">
            <Eye className="w-16 h-16 mx-auto text-muted-foreground opacity-20" />
            <h3 className="text-2xl font-display text-foreground">No Charts Available</h3>
            <p className="text-muted-foreground leading-relaxed">
              Charts help visualize data and patterns through various chart types including bar, line, pie, scatter, and many more.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render chart until mounted to prevent hydration issues
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-pulse text-sm text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  const currentChart = charts[currentChartIndex];

  const chartContent = (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <h3 className="text-lg font-semibold mb-1 truncate">{currentChart.title}</h3>
        {currentChart.description && (
          <div className="text-sm text-muted-foreground line-clamp-2">
            <Markdown>{currentChart.description}</Markdown>
          </div>
        )}
      </div>

      {/* D3 Visualization */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border bg-card p-4 relative">
        <div className="w-full h-full">
          <D3Chart options={currentChart.chartOptions} height="100%" /> 
        </div>
      </div>

      {/* Navigation buttons */}
      {showNavigation && charts.length > 1 && (
        <div className="flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentChartIndex(Math.max(0, currentChartIndex - 1))}
            disabled={currentChartIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentChartIndex + 1} of {charts.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentChartIndex(Math.min(charts.length - 1, currentChartIndex + 1))}
            disabled={currentChartIndex === charts.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );

  if (!showSidebar) {
    return <div style={{ height }} className="w-full">{chartContent}</div>;
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left sidebar - Chart navigation */}
      <div className="w-80 flex-shrink-0 min-w-0">
        <Card className="py-0">
          <CardContent className="p-2">
            <div className="flex items-center justify-between px-2 py-2 mb-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Charts</h3>
              <Badge variant="outline" className="text-xs h-5">
                {charts.length}
              </Badge>
            </div>
            <nav className="flex flex-col space-y-0.5">
              {charts.map((chart, i) => {
                const isViewed = viewedCharts.has(i);
                const isActive = currentChartIndex === i;

                // Extract chart type from chartOptions
                const chartType = chart.chartOptions.series?.[0]?.type || 'chart';

                return (
                  <Button
                    key={i}
                    variant="ghost"
                    onClick={() => setCurrentChartIndex(i)}
                    className={cn(
                      "w-full text-left px-3 py-2 h-auto flex-col items-start gap-1 overflow-hidden",
                      isActive && "bg-muted hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-3 h-3" />
                        <span className="font-medium text-sm truncate">{chart.title}</span>
                      </div>
                      {isViewed && (
                        <CheckCircle2 className="w-3 h-3 ml-2 text-green-600 dark:text-green-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1 w-full overflow-hidden">
                      {chart.description || `${chartType} chart`}
                    </div>
                  </Button>
                );
              })}
            </nav>

            {/* Progress indicator */}
            {viewedCharts.size >= charts.length && (
              <Card className="border shadow-none bg-green-500/5 border-green-500/20 mt-2">
                <CardContent className="p-2">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-xs font-medium">All charts viewed!</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {chartContent}
      </div>
    </div>
  );
}

export type { ChartWidgetData };
