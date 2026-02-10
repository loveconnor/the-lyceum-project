"use client";

import React from "react";
import { demoRegistry, fallbackComponent } from "@/components/learning/index";
import { cn } from "@/lib/utils";

const LEARN_BY_DOING_WIDGET_MAP: Record<string, string> = {
  short_answer: "ShortAnswer",
  multiple_choice: "MultipleChoice",
  code_fill: "CodeFill",
  true_false: "TrueFalse",
  fill_in_the_blank: "FillInTheBlank",
  order_steps: "OrderSteps",
  drag_drop: "DragDrop",
  numeric_input: "NumericInput",
  diagram_selection: "DiagramSelection",
  matching: "Matching",
  ShortAnswer: "ShortAnswer",
  MultipleChoice: "MultipleChoice",
  CodeFill: "CodeFill",
  TrueFalse: "TrueFalse",
  FillInTheBlank: "FillInTheBlank",
  OrderSteps: "OrderSteps",
  DragDrop: "DragDrop",
  NumericInput: "NumericInput",
  DiagramSelection: "DiagramSelection",
  Matching: "Matching",
};

export const normalizeLearnByDoingWidgetType = (type: string): string =>
  LEARN_BY_DOING_WIDGET_MAP[type] || type;

export const isLearnByDoingWidgetType = (type: string): boolean => {
  const normalized = normalizeLearnByDoingWidgetType(type);
  return Boolean((demoRegistry as Record<string, unknown>)[normalized]);
};

interface LabLearningWidgetProps {
  widgetType: string;
  config?: Record<string, unknown>;
  widgetKey: string;
  className?: string;
}

export function LabLearningWidget({
  widgetType,
  config,
  widgetKey,
  className,
}: LabLearningWidgetProps) {
  const normalizedType = normalizeLearnByDoingWidgetType(widgetType);
  const registry = demoRegistry as Record<
    string,
    React.ComponentType<{
      element: {
        key: string;
        type: string;
        props?: Record<string, unknown>;
        children?: string[];
      };
    }>
  >;
  const WidgetComponent = registry[normalizedType] || fallbackComponent;

  const element = React.useMemo(
    () => ({
      key: widgetKey,
      type: normalizedType,
      props: config || {},
    }),
    [widgetKey, normalizedType, config]
  );

  return (
    <div className={cn("w-full", className)}>
      <WidgetComponent element={element} />
    </div>
  );
}

