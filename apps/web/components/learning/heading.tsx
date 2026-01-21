"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Heading({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const level = (props.level as number) || 2;
  const headingClass =
    level === 1
      ? "text-lg font-bold"
      : level === 3
        ? "text-xs font-semibold"
        : level === 4
          ? "text-[10px] font-semibold"
          : "text-sm font-semibold";

  return (
    <div className={`${headingClass} text-left ${baseClass} ${customClass}`}>
      {props.text as string}
    </div>
  );
}
