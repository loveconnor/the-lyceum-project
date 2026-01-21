"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Avatar({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const name = (props.name as string) || "?";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarSize =
    props.size === "lg"
      ? "w-10 h-10 text-sm"
      : props.size === "sm"
        ? "w-6 h-6 text-[8px]"
        : "w-8 h-8 text-[10px]";

  return (
    <div
      className={`${avatarSize} rounded-full bg-muted flex items-center justify-center font-medium ${baseClass} ${customClass}`}
    >
      {initials}
    </div>
  );
}
