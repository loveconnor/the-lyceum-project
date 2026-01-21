"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Image({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const hasCustomSize =
    customClass.includes("w-") || customClass.includes("h-");
  const imgStyle = hasCustomSize
    ? {}
    : {
        width: (props.width as number) || 80,
        height: (props.height as number) || 60,
      };

  return (
    <div
      className={`bg-muted border border-border rounded flex items-center justify-center text-[10px] text-muted-foreground aspect-video ${baseClass} ${customClass}`}
      style={imgStyle}
    >
      {(props.alt as string) || "img"}
    </div>
  );
}
