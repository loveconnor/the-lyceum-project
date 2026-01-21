"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

interface DataPoint {
  label: string;
  value: number;
}

export function BarGraph({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const data = (props.data as DataPoint[]) || [];
  const title = props.title as string | undefined;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`${baseClass} ${customClass}`}>
      {title ? (
        <div className="text-xs font-medium mb-2 text-left">{title}</div>
      ) : null}
      <div className="flex gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-[8px] text-muted-foreground">{d.value}</div>
            <div className="w-full h-20 flex items-end">
              <div
                className="w-full bg-foreground/80 rounded-t transition-all"
                style={{
                  height: `${(d.value / maxValue) * 100}%`,
                  minHeight: 2,
                }}
              />
            </div>
            <div className="text-[8px] text-muted-foreground truncate w-full text-center">
              {d.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
