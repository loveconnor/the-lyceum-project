"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Form({ element, children }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);

  return (
    <div
      className={`border border-border rounded-lg p-3 bg-background ${baseClass} ${customClass}`}
    >
      {props.title ? (
        <div className="font-semibold text-sm mb-2 text-left">
          {props.title as string}
        </div>
      ) : null}
      <div className="space-y-2">{children}</div>
    </div>
  );
}
