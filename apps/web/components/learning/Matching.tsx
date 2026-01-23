"use client";

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { Check, RotateCcw, X } from "lucide-react";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

// --- Types ---

interface Item {
  id: string;
  label: string;
}

interface MatchingProps {
  leftItems: Item[];
  rightItems: Item[];
  shuffleRight?: boolean;
  title?: string | null;
  description?: string | null;
  showProgress?: boolean;
  className?: string[];
}

/**
 * The Core Matching Component
 */
export function Matching({ element }: ComponentRenderProps) {
  const customClass = getCustomClass(element.props as Record<string, unknown>);
  const props = element.props as unknown as MatchingProps;
  const leftItems = Array.isArray(props.leftItems) ? props.leftItems : [];
  const initialRightItems = Array.isArray(props.rightItems)
    ? props.rightItems
    : [];
  const shuffleRight = Boolean(props.shuffleRight);
  const title = props.title ?? "Match the following";
  const description = props.description ?? null;
  const showProgress = props.showProgress ?? true;

  // State
  const [rightOrder, setRightOrder] = useState<Item[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // leftId -> rightId
  const [mistakes, setMistakes] = useState<Record<string, boolean>>({}); // leftId -> isError
  const [isComplete, setIsComplete] = useState(false);

  // Restore saved state on mount
  useEffect(() => {
    const savedState = typeof (window as any).__getWidgetState === "function" 
      ? (window as any).__getWidgetState() 
      : null;
    
    if (savedState) {
      if (savedState.matches) setMatches(savedState.matches);
      if (savedState.mistakes) setMistakes(savedState.mistakes);
      if (typeof savedState.isComplete === 'boolean') setIsComplete(savedState.isComplete);
      if (savedState.rightOrder) setRightOrder(savedState.rightOrder);
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (Object.keys(matches).length > 0 || Object.keys(mistakes).length > 0) {
      if (typeof (window as any).__saveWidgetState === "function") {
        (window as any).__saveWidgetState({
          matches,
          mistakes,
          isComplete,
          rightOrder
        });
      }
    }
  }, [matches, mistakes, isComplete, rightOrder]);

  // Refs for calculating line positions
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rightRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // State to force re-render of lines
  const [lineCoordinates, setLineCoordinates] = useState<
    {
      start: { x: number; y: number };
      end: { x: number; y: number };
      color: string;
    }[]
  >([]);

  // Initialize and Shuffle
  useEffect(() => {
    let right = [...initialRightItems];
    if (shuffleRight) {
      right = right.sort(() => Math.random() - 0.5);
    }
    setRightOrder(right);
  }, [initialRightItems, shuffleRight]);

  // Check completion
  useEffect(() => {
    const correctMatchesCount = Object.entries(matches).filter(
      ([leftId, rightId]) => leftId === rightId,
    ).length;

    if (correctMatchesCount === leftItems.length && leftItems.length > 0) {
      setIsComplete(true);
      
      // Mark step as complete for learn-by-doing navigation
      if (typeof (window as any).__markStepComplete === "function") {
        (window as any).__markStepComplete();
      }
    }
  }, [matches, leftItems.length]);

  // Logic to calculate line positions
  const updateLines = useMemo(() => {
    return () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const lines: Array<{
        start: { x: number; y: number };
        end: { x: number; y: number };
        color: string;
      }> = [];

      // Draw matched lines
      Object.entries(matches).forEach(([leftId, rightId]) => {
        const leftEl = leftRefs.current.get(leftId);
        const rightEl = rightRefs.current.get(rightId);

        if (leftEl && rightEl) {
          const leftRect = leftEl.getBoundingClientRect();
          const rightRect = rightEl.getBoundingClientRect();

          const rawStartX = leftRect.right - containerRect.left + 6;
          const rawEndX = rightRect.left - containerRect.left - 6;
          const startX = rawStartX;
          const endX = Math.max(rawEndX, startX + 12);

          // Calculate start (right side of left item) and end (left side of right item) relative to container
          lines.push({
            start: {
              x: startX,
              y: leftRect.top + leftRect.height / 2 - containerRect.top,
            },
            end: {
              x: endX,
              y: rightRect.top + rightRect.height / 2 - containerRect.top,
            },
            color: leftId === rightId ? "url(#gradient-line)" : "#ef4444",
          });
        }
      });
      setLineCoordinates(lines);
    };
  }, [matches, rightOrder]);

  // Update lines after layout changes
  useLayoutEffect(() => {
    requestAnimationFrame(updateLines);
  }, [updateLines, matches, rightOrder]);

  // Update lines on resize
  useEffect(() => {
    window.addEventListener("resize", updateLines);
    return () => window.removeEventListener("resize", updateLines);
  }, [updateLines]);

  // Handle Selection
  const handleLeftClick = (id: string) => {
    if (matches[id]) return; // Already matched (or currently showing error)

    // If we click a different left item, we don't necessarily need to clear mistakes elsewhere,
    // but typically we let the timeout handle it.
    setSelectedLeft(id === selectedLeft ? null : id);
  };

  const handleRightClick = (rightItem: Item) => {
    if (!selectedLeft) return;

    // Check if this right item is already matched to someone else
    const isAlreadyMatched = Object.values(matches).includes(rightItem.id);
    if (isAlreadyMatched) return;

    const leftId = selectedLeft;
    const isCorrect = leftId === rightItem.id;

    // Connect them immediately (optimistic UI)
    setMatches((prev) => ({ ...prev, [leftId]: rightItem.id }));
    setSelectedLeft(null); // Clear selection

    if (!isCorrect) {
      // It's a mistake: Mark it, then reject it after delay
      setMistakes((prev) => ({ ...prev, [leftId]: true }));

      setTimeout(() => {
        setMatches((prev) => {
          const newMatches = { ...prev };
          delete newMatches[leftId]; // Remove the bad connection
          return newMatches;
        });
        setMistakes((prev) => ({ ...prev, [leftId]: false })); // Clear error state
      }, 1000);
    }
  };

  const handleReset = () => {
    setMatches({});
    setSelectedLeft(null);
    setIsComplete(false);
    setMistakes({});
    // Re-shuffle
    if (shuffleRight) {
      setRightOrder([...initialRightItems].sort(() => Math.random() - 0.5));
    }
  };

  return (
    <div className={`${baseClass} ${customClass} w-full max-w-4xl mx-auto`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-left">{title}</div>
          {description ? (
            <div className="text-xs text-muted-foreground mt-1 text-left">
              {description}
            </div>
          ) : null}
        </div>
        <button
          onClick={handleReset}
          className="h-7 px-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Reset"
        >
          <span className="inline-flex items-center gap-1">
            <RotateCcw size={14} /> Reset
          </span>
        </button>
      </div>

      <div className="relative" ref={containerRef}>
        {/* SVG Overlay for Lines */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-10 overflow-visible">
          <defs>
            <linearGradient
              id="gradient-line"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#6366f1" /> {/* Indigo-500 */}
              <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet-500 */}
            </linearGradient>
          </defs>
          {lineCoordinates.map((line, i) => (
            <path
              key={i}
              d={`
                M ${line.start.x} ${line.start.y} 
                C ${line.start.x + 50} ${line.start.y}, 
                  ${line.end.x - 50} ${line.end.y}, 
                  ${line.end.x} ${line.end.y}
              `}
              fill="none"
              stroke={line.color}
              strokeWidth="3"
              strokeLinecap="round"
              className="drop-shadow-sm transition-all duration-500 ease-out"
              style={{
                strokeDasharray: 1000,
                strokeDashoffset: 0,
                animation: "draw 0.5s ease-out forwards",
              }}
            />
          ))}
        </svg>

        <div className="flex flex-row justify-between gap-6 md:gap-10 relative z-20">
          {/* Left Column */}
          <div className="flex flex-col gap-3 w-1/2">
            {leftItems.map((item) => {
              const isMatched = !!matches[item.id];
              const isSelected = selectedLeft === item.id;
              const isError = mistakes[item.id];

              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    if (el) leftRefs.current.set(item.id, el);
                  }}
                  onClick={() => handleLeftClick(item.id)}
                  disabled={isMatched}
                  className={`relative group w-full text-left p-3 rounded-md border transition-colors duration-200 outline-none select-none flex items-center justify-between ${
                    isError
                      ? "bg-rose-50 border-rose-300 text-rose-700 animate-shake"
                      : isMatched
                        ? "bg-muted/30 border-border text-muted-foreground cursor-default"
                        : isSelected
                          ? "bg-primary/5 border-primary/60 text-foreground ring-2 ring-primary/15"
                          : "bg-background border-border text-foreground hover:bg-muted/30"
                  }`}
                >
                  <span className="font-medium text-xs md:text-sm">
                    {item.label}
                  </span>

                  {/* Status Icon */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isError
                        ? "bg-rose-100 text-rose-600"
                        : isMatched
                          ? "bg-primary/10 text-primary"
                          : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {isError && <X size={12} strokeWidth={3} />}
                    {isMatched && !isError && (
                      <Check size={12} strokeWidth={3} />
                    )}
                    {!isMatched && !isSelected && !isError && (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                    )}
                  </div>

                  {/* Connector Dot */}
                  <div
                    className={`absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all z-30 ${
                      isError
                        ? "bg-rose-500 border-background"
                        : isMatched
                          ? "bg-primary border-background"
                          : isSelected
                            ? "bg-primary border-background scale-110"
                            : "bg-transparent border-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-3 w-1/2">
            {rightOrder.map((item) => {
              // Find if this item is involved in a match
              const matchedLeftId = Object.keys(matches).find(
                (key) => matches[key] === item.id,
              );
              const isMatched = !!matchedLeftId;
              const isError = matchedLeftId ? mistakes[matchedLeftId] : false;
              const isTargetForSelection = selectedLeft && !isMatched;

              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    if (el) rightRefs.current.set(item.id, el);
                  }}
                  onClick={() => handleRightClick(item)}
                  disabled={isMatched}
                  className={`relative w-full text-left p-3 rounded-md border transition-colors duration-200 outline-none select-none flex items-center gap-3 ${
                    isError
                      ? "bg-rose-50 border-rose-300 text-rose-700"
                      : isMatched
                        ? "bg-muted/30 border-border text-muted-foreground cursor-default"
                        : isTargetForSelection
                          ? "bg-background border-border hover:border-primary/60 hover:ring-2 hover:ring-primary/10 cursor-pointer"
                          : "bg-background border-border text-foreground"
                  }`}
                >
                  {/* Connector Dot (Left side of right item) */}
                  <div
                    className={`absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all z-30 ${
                      isError
                        ? "bg-rose-500 border-background"
                        : isMatched
                          ? "bg-primary border-background"
                          : "bg-transparent border-transparent"
                    }`}
                  />

                  <span className="font-normal text-xs md:text-sm">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showProgress ? (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {Object.keys(matches).filter((k) => !mistakes[k]).length} of{" "}
            {leftItems.length} connected
          </div>
          {isComplete ? (
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs animate-in fade-in slide-in-from-bottom-2">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                <Check size={14} />
              </div>
              <span>Perfect Match!</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes draw {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
