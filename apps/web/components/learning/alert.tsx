"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Alert({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const alertType = props.type as string;
  const alertClass =
    alertType === "success"
      ? "bg-green-50 border-green-200"
      : alertType === "warning"
        ? "bg-yellow-50 border-yellow-200"
        : alertType === "error"
          ? "bg-red-50 border-red-200"
          : "bg-blue-50 border-blue-200";

  return (
    <div
      className={`p-2 rounded border ${alertClass} ${baseClass} ${customClass}`}
    >
      <div className="text-xs font-medium">{props.title as string}</div>
      {props.message ? (
        <div className="text-[10px] mt-0.5">{props.message as string}</div>
      ) : null}
    </div>
  );
}
