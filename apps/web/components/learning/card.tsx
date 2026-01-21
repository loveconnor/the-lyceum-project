"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Card({ element, children }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const maxWidthClass =
    props.maxWidth === "sm"
      ? "max-w-xs sm:min-w-[280px]"
      : props.maxWidth === "md"
        ? "max-w-sm sm:min-w-[320px]"
        : props.maxWidth === "lg"
          ? "max-w-md sm:min-w-[360px]"
          : "w-full";
  const centeredClass = props.centered ? "mx-auto" : "";

  return (
    <div
      className={`border border-border rounded-lg p-3 bg-background overflow-hidden ${maxWidthClass} ${centeredClass} ${baseClass} ${customClass}`}
    >
      {props.title ? (
        <div className="font-semibold text-sm mb-1 text-left">
          {props.title as string}
        </div>
      ) : null}
      {props.description ? (
        <div className="text-[10px] text-muted-foreground mb-2 text-left">
          {props.description as string}
        </div>
      ) : null}
      <div className="space-y-2">{children}</div>
    </div>
  );
}
