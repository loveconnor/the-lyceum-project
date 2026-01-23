"use client";

import { useState, useRef, useEffect } from "react";
import {
  GripVertical,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { Markdown } from "./markdown";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

/**
 * OrderSteps Component
 * * Purpose: Captures procedural knowledge by asking users to sequence items correctly.
 */

type OrderStep = { id: string; label: string };

type OrderStepsProps = {
  items: OrderStep[];
  correctOrder?: string[] | null;
  explanation?: string | null;
  title?: string | null;
  description?: string | null;
  shuffleOnReset?: boolean;
  showStatus?: boolean;
  showFeedback?: boolean;
  className?: string[];
};

export function OrderSteps({ element }: ComponentRenderProps) {
  const props = element.props as OrderStepsProps;
  const customClass = getCustomClass(props);
  const items = Array.isArray(props.items) ? props.items : [];
  const correctOrder = Array.isArray(props.correctOrder)
    ? props.correctOrder
    : null;
  const explanation = props.explanation ?? null;
  const title = props.title ?? "Sequence the Steps";
  const description =
    props.description ?? "Drag the items into the correct procedural order.";
  const shuffleOnReset = props.shuffleOnReset ?? true;
  const showStatus = props.showStatus ?? true;
  const showFeedback = props.showFeedback ?? true;
  // State for the current list order
  const [orderedItems, setOrderedItems] = useState<OrderStep[]>(items);
  // State for UI interaction (dragging)
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  // State for submission status
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Restore saved state on mount
  useEffect(() => {
    const savedState = typeof (window as any).__getWidgetState === "function" 
      ? (window as any).__getWidgetState() 
      : null;
    
    if (savedState) {
      if (savedState.orderedItems) setOrderedItems(savedState.orderedItems);
      if (typeof savedState.isSubmitted === 'boolean') setIsSubmitted(savedState.isSubmitted);
      if (typeof savedState.isCorrect === 'boolean') setIsCorrect(savedState.isCorrect);
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (orderedItems.length > 0 && orderedItems !== items) {
      if (typeof (window as any).__saveWidgetState === "function") {
        (window as any).__saveWidgetState({
          orderedItems,
          isSubmitted,
          isCorrect
        });
      }
    }
  }, [orderedItems, isSubmitted, isCorrect, items]);

  // Refs for drag and drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Reset state if initial items change
  useEffect(() => {
    setOrderedItems(items);
    setIsSubmitted(false);
    setIsCorrect(null);
  }, [items]);

  // Handle Drag Start
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    setDraggedItemIndex(index);
    // Visual tweak for the ghost image
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle Drag Enter (Reordering Logic)
  const onDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    // Prevent default to allow drop
    e.preventDefault();

    // If we aren't dragging anything or are over the same item, do nothing
    if (dragItem.current === null || dragItem.current === index) return;

    // Create a copy of the list
    const newItems = [...orderedItems];

    // Remove the dragged item
    const draggedIndex = dragItem.current;
    if (draggedIndex === null) return;
    const draggedItemContent = newItems[draggedIndex]!;
    newItems.splice(dragItem.current, 1);

    // Insert it at the new position
    newItems.splice(index, 0, draggedItemContent);

    // Update refs and state
    dragItem.current = index;
    setOrderedItems(newItems);
    setDraggedItemIndex(index);
  };

  // Handle Drag End
  const onDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggedItemIndex(null);
  };

  // Handle Drag Over (Necessary for onDrop to fire, though we do logic in DragEnter for smoothness)
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    if (correctOrder && correctOrder.length > 0) {
      const current = orderedItems.map((item) => item.id);
      const matches =
        current.length === correctOrder.length &&
        current.every((id, idx) => id === correctOrder[idx]);
      setIsCorrect(matches);
      
      // Mark step as complete if order is correct
      if (matches && typeof (window as any).__markStepComplete === "function") {
        (window as any).__markStepComplete();
      }
    }
  };

  const handleReset = () => {
    const next = shuffleOnReset
      ? [...items].sort(() => Math.random() - 0.5)
      : [...items];
    setOrderedItems(next);
    setIsSubmitted(false);
    setIsCorrect(null);
  };

  return (
    <div className={`${baseClass} ${customClass} w-full max-w-2xl mx-auto`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-left">{title}</div>
          <div className="text-xs text-muted-foreground mt-1 text-left">
            <Markdown>{description}</Markdown>
          </div>
        </div>
        {showStatus && isSubmitted ? (
          <div className="flex items-center gap-2 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Captured
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {orderedItems.map((item, index) => (
          <div
            key={item.id}
            draggable={!isSubmitted}
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            className={`relative group flex items-center gap-3 p-3 rounded-md border transition-colors duration-200 ${
              isSubmitted
                ? "cursor-default bg-muted/30 border-border"
                : "cursor-grab active:cursor-grabbing bg-background border-border hover:bg-muted/30"
            } ${draggedItemIndex === index ? "opacity-50 ring-2 ring-primary/20 bg-primary/5" : ""}`}
          >
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border ${
                isSubmitted
                  ? "bg-muted border-border text-muted-foreground"
                  : "bg-muted/50 border-border text-foreground"
              }`}
            >
              {index + 1}
            </div>

            <span
              className={`flex-grow text-xs font-medium ${isSubmitted ? "text-muted-foreground" : "text-foreground"}`}
            >
              {item.label}
            </span>

            {!isSubmitted ? (
              <div className="text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                <GripVertical className="w-4 h-4" />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={handleReset}
          className="h-7 px-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset
          </span>
        </button>

        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            className="h-7 px-3 rounded bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <span className="inline-flex items-center gap-1">
              Submit Order
              <ArrowRight className="w-3 h-3" />
            </span>
          </button>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            Order locked
          </div>
        )}
      </div>

      {showFeedback && isSubmitted && correctOrder ? (
        <div
          className={`mt-3 rounded-md p-3 border text-xs ${
            isCorrect
              ? "bg-emerald-50/50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
              : "bg-rose-50/50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800 text-rose-900 dark:text-rose-300"
          }`}
        >
          <div className="flex items-start gap-2">
            <div
              className={`p-1 rounded-full shrink-0 ${
                isCorrect
                  ? "bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300"
                  : "bg-rose-100 dark:bg-rose-800 text-rose-600 dark:text-rose-300"
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="font-semibold">
                {isCorrect ? "Correct order" : "Incorrect order"}
              </div>
              {explanation ? (
                <div className="text-muted-foreground mt-1">
                  <Markdown>{explanation}</Markdown>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
