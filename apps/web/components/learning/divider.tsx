"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Divider({ element }: ComponentRenderProps) {
  const customClass = getCustomClass(element.props);
  return <hr className={`border-border my-2 ${baseClass} ${customClass}`} />;
}
