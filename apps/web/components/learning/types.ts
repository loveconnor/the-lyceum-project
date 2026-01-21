import type { ReactNode } from "react";
import type { UIElement, Action } from "@ai-json-renderer/core";

export interface ComponentRenderProps {
  element: UIElement;
  children?: ReactNode;
  onAction?: (action: Action) => void;
  loading?: boolean;
}

export type ComponentRegistry = Record<
  string,
  React.ComponentType<ComponentRenderProps>
>;
