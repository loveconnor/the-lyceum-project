"use client";

import { useState, useEffect, useMemo } from "react";
import { RotateCcw, Check, X } from "lucide-react";
import { Markdown } from "./markdown";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

type Category = { id: string; label: string };

type CategorizeItem = {
  id: string;
  label: string;
  correctCategoryId?: string | null;
};

type DragDropProps = {
  title?: string | null;
  description?: string | null;
  categories: Category[];
  items: CategorizeItem[];
  showStatus?: boolean;
  showFeedback?: boolean;
  className?: string[];
};

export function DragDrop({ element }: ComponentRenderProps) {
  const props = element.props as DragDropProps;
  const customClass = getCustomClass(props);
  const title = props.title ?? "Categorization";
  const description = props.description ?? null;
  const categories = Array.isArray(props.categories) ? props.categories : [];
  const baseItems = Array.isArray(props.items) ? props.items : [];
  const showStatus = props.showStatus ?? true;
  const showFeedback = props.showFeedback ?? true;

  const normalizedItems = useMemo(() => {
    const validCategoryIds = new Set(categories.map((cat) => cat.id));
    return baseItems
      .filter((item) => item.id && item.label)
      .map((item) => {
        if (
          item.correctCategoryId &&
          validCategoryIds.has(item.correctCategoryId)
        ) {
          return item;
        }
        if (validCategoryIds.size > 0) {
          return { ...item, correctCategoryId: categories[0]!.id };
        }
        return { ...item, correctCategoryId: null };
      });
  }, [baseItems, categories]);

  const [items, setItems] = useState(
    normalizedItems.map((item) => ({
      ...item,
      categoryId: null as string | null,
    })),
  );
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [itemResults, setItemResults] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    setItems(normalizedItems.map((item) => ({ ...item, categoryId: null })));
    setSelectedItemId(null);
    setIsComplete(false);
    setIsCorrect(null);
    setItemResults({});
  }, [normalizedItems]);

  useEffect(() => {
    const allCategorized =
      items.length > 0 && items.every((i) => i.categoryId !== null);
    setIsComplete(allCategorized);

    if (
      allCategorized &&
      showFeedback &&
      items.every((i) => i.correctCategoryId)
    ) {
      const allCorrect = items.every(
        (i) => i.categoryId === i.correctCategoryId,
      );
      setIsCorrect(allCorrect);
      
      // Mark step as complete if all items are correctly categorized
      if (allCorrect && typeof (window as any).__markStepComplete === "function") {
        (window as any).__markStepComplete();
      }
    } else {
      setIsCorrect(null);
    }
  }, [items, showFeedback]);

  const handleReset = () => {
    setItems(items.map((i) => ({ ...i, categoryId: null })));
    setSelectedItemId(null);
    setIsCorrect(null);
    setItemResults({});
  };

  const moveItem = (itemId: string, categoryId: string | null) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, categoryId } : item)),
    );
    setItemResults((prev) => {
      const item = items.find((i) => i.id === itemId);
      if (!item || !showFeedback) {
        return prev;
      }
      if (!categoryId) {
        return { ...prev, [itemId]: null };
      }
      if (!item.correctCategoryId) {
        return prev;
      }
      return { ...prev, [itemId]: categoryId === item.correctCategoryId };
    });
    setSelectedItemId(null);
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    itemId: string,
  ) => {
    e.dataTransfer.setData("text/plain", itemId);
    setDraggedItemId(itemId);
  };

  const handleDragEnd = () => setDraggedItemId(null);
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) =>
    e.preventDefault();

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetCategoryId: string | null,
  ) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (itemId) moveItem(itemId, targetCategoryId);
    setDraggedItemId(null);
  };

  const handleClickInteraction = (
    id: string | null,
    type: "item" | "category",
  ) => {
    if (type === "item") {
      setSelectedItemId(selectedItemId === id ? null : id);
    } else if (type === "category" && selectedItemId) {
      moveItem(selectedItemId, id);
    }
  };

  const getItemsForCategory = (catId: string | null) =>
    items.filter((i) => i.categoryId === catId);

  return (
    <div className={`${baseClass} ${customClass} w-full max-w-5xl mx-auto`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-left">{title}</div>
          {description ? (
            <div className="text-xs text-muted-foreground mt-1 text-left">
              <Markdown>{description}</Markdown>
            </div>
          ) : null}
        </div>
        <button
          onClick={handleReset}
          className="h-7 px-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Reset"
        >
          <span className="inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Uncategorized</span>
            <span className="bg-muted text-foreground px-2 py-0.5 rounded text-[10px]">
              {getItemsForCategory(null).length}
            </span>
          </div>

          <div
            className={`min-h-[160px] p-3 rounded-md border border-dashed transition-colors duration-200 ${
              selectedItemId && getItemsForCategory(null).length === 0
                ? "border-foreground bg-muted/30"
                : "border-border"
            } ${draggedItemId ? "border-foreground/40" : ""}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
            onClick={() => handleClickInteraction(null, "category")}
          >
            {getItemsForCategory(null).length === 0 && !isComplete ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-xs">
                Empty
              </div>
            ) : null}

            {isComplete && getItemsForCategory(null).length === 0 ? (
              <div className="h-24 flex flex-col items-center justify-center text-foreground animate-in fade-in duration-500">
                <Check className="w-6 h-6 mb-1" />
                <span className="font-semibold text-xs">All Done</span>
              </div>
            ) : null}

            <div className="space-y-2">
              {getItemsForCategory(null).map((item) => (
                <MinimalItem
                  key={item.id}
                  item={item}
                      result={itemResults[item.id] ?? null}
                  isSelected={selectedItemId === item.id}
                  onClick={() => handleClickInteraction(item.id, "item")}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-xs text-foreground">
                  {cat.label}
                </h3>
              </div>

              <div
                className={`flex-1 p-3 rounded-md border transition-colors duration-200 ${
                  selectedItemId
                    ? "border-foreground/40 bg-muted/30 cursor-pointer"
                    : "border-border bg-background"
                } ${draggedItemId ? "bg-muted/30" : ""}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, cat.id)}
                onClick={() => handleClickInteraction(cat.id, "category")}
              >
                <div className="space-y-2">
                  {getItemsForCategory(cat.id).map((item) => (
                    <MinimalItem
                      key={item.id}
                      item={item}
                      result={itemResults[item.id] ?? null}
                      isSelected={selectedItemId === item.id}
                      onClick={() => handleClickInteraction(item.id, "item")}
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragEnd={handleDragEnd}
                      stopPropagation
                    />
                  ))}

                  {getItemsForCategory(cat.id).length === 0 &&
                  !selectedItemId ? (
                    <div className="py-8 text-center text-[10px] text-muted-foreground">
                      Drop items here
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showStatus && isComplete ? (
        <div className="mt-4 text-xs text-muted-foreground">
          {items.length} of {items.length} categorized
        </div>
      ) : null}

      {showFeedback && isComplete && isCorrect !== null ? (
        <div
          className={`mt-3 rounded-md p-3 border text-xs ${
            isCorrect
              ? "bg-emerald-50/50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
              : "bg-rose-50/50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800 text-rose-900 dark:text-rose-300"
          }`}
        >
          <div className="font-semibold">
            {isCorrect ? "All correct" : "Some categories are incorrect"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const MinimalItem = ({
  item,
  isSelected,
  onClick,
  onDragStart,
  onDragEnd,
  stopPropagation,
  result,
}: {
  item: CategorizeItem;
  isSelected: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  stopPropagation?: boolean;
  result: boolean | null;
}) => {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(event) => {
        if (stopPropagation) event.stopPropagation();
        onClick();
      }}
      className={`relative px-3 py-2 rounded border text-xs font-medium cursor-grab active:cursor-grabbing select-none transition-colors duration-150 flex items-center gap-2 ${
        isSelected
          ? "bg-foreground text-background border-foreground"
          : "bg-background text-foreground border-border hover:bg-muted/30"
      }`}
    >
      <span>{item.label}</span>
      {result !== null && !isSelected ? (
        <span className={`ml-auto inline-flex items-center gap-1 text-[10px] ${result ? "text-emerald-600" : "text-rose-600"}`}>
          {result ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {result ? "Correct" : "Try again"}
        </span>
      ) : null}
      {isSelected ? (
        <div className="ml-auto w-2 h-2 rounded-full bg-background animate-pulse" />
      ) : null}
    </div>
  );
};
