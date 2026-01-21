"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Stack({ element, children }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const isHorizontal = props.direction === "horizontal";
  const stackGap =
    props.gap === "lg" ? "gap-3" : props.gap === "sm" ? "gap-1" : "gap-2";

  return (
    <div
      className={`flex ${isHorizontal ? "flex-row flex-wrap items-center" : "flex-col"} ${stackGap} ${baseClass} ${customClass}`}
    >
      {children}
    </div>
  );
}
