"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

interface DataPoint {
  label: string;
  value: number;
}

export function LineGraph({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const data = (props.data as DataPoint[]) || [];
  const title = props.title as string | undefined;
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  // SVG dimensions with padding
  const width = 300;
  const height = 100;
  const padding = { top: 10, right: 10, bottom: 10, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate points for the SVG path
  const points = data.map((d, i) => {
    const x =
      padding.left +
      (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2);
    const y =
      padding.top + chartHeight - ((d.value - minValue) / range) * chartHeight;
    return { x, y, ...d };
  });

  const pathD =
    points.length > 0
      ? `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`
      : "";

  return (
    <div className={`${baseClass} ${customClass}`}>
      {title ? (
        <div className="text-xs font-medium mb-2 text-left">{title}</div>
      ) : null}
      <div className="relative h-24">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight / 2}
            x2={width - padding.right}
            y2={padding.top + chartHeight / 2}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={width - padding.right}
            y2={padding.top}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
          />
          {/* Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground/80"
            />
          )}
          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              className="fill-foreground"
            />
          ))}
        </svg>
      </div>
      {data.length > 0 && (
        <div className="flex justify-between mt-1">
          {data.map((d, i) => (
            <div
              key={i}
              className="text-[8px] text-muted-foreground text-center"
              style={{ width: `${100 / data.length}%` }}
            >
              {d.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
