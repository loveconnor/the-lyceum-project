"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  RefreshCcw,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { Markdown } from "./markdown";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

type BlankDefinition = {
  id: string;
  correctAnswers: string[];
  placeholder?: string | null;
  hint?: string | null;
};

type FillInTheBlankProps = {
  title?: string | null;
  description?: string | null;
  textTemplate: string;
  blanks: BlankDefinition[];
  wordBank?: string[];
  caseSensitive?: boolean;
  showCard?: boolean;
  showHeader?: boolean;
  showActions?: boolean;
  showValidation?: boolean;
  className?: string[];
};

type Segment =
  | { type: "text"; content: string; key: number }
  | { type: "blank"; id: string; def?: BlankDefinition; key: number };

type DragSource = "bank" | "input";

type DragPayload = {
  text: string;
  source: DragSource;
  identifier: number | string;
};

export function FillInTheBlank({ element }: ComponentRenderProps) {
  const props = element.props as FillInTheBlankProps;
  const customClass = getCustomClass(props);
  const title = props.title ?? null;
  const description = props.description ?? null;
  const textTemplate = props.textTemplate ?? "";
  const blanks = Array.isArray(props.blanks) ? props.blanks : [];
  const wordBank = Array.isArray(props.wordBank) ? props.wordBank : [];
  const caseSensitive = Boolean(props.caseSensitive);
  const showCard = props.showCard ?? false;
  const showHeader = props.showHeader ?? false;
  const showActions = props.showActions ?? false;
  const showValidation = props.showValidation ?? false;

  // State to track user inputs keyed by blank ID
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [bankItems, setBankItems] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "checked">("idle"); // 'idle', 'checked'
  const [results, setResults] = useState<
    Record<string, "correct" | "incorrect">
  >({}); // { [id]: 'correct' | 'incorrect' }
  const [dragOverId, setDragOverId] = useState<string | null>(null); // Track which input is being hovered
  const [isBankHovered, setIsBankHovered] = useState(false);

  // Initialize/Reset logic
  useEffect(() => {
    setBankItems([...wordBank]);
    setInputs({});
    setResults({});
    setStatus("idle");
  }, [wordBank, textTemplate]); // Re-init if props change widely

  // Parse the template to identify segments and blank placeholders
  const segments = useMemo<Segment[]>(() => {
    const hasExplicitPlaceholders = /(\{\{[^}]+\}\}|\{[^}]+\})/.test(
      textTemplate,
    );

    if (hasExplicitPlaceholders) {
      const parts = textTemplate.split(/(\{\{[^}]+\}\}|\{[^}]+\})/g);
      return parts.map((part, index) => {
        const match = part.match(/^(?:\{\{([^}]+)\}\}|\{([^}]+)\})$/);
        const rawId = match?.[1] || match?.[2];
        if (rawId) {
          const blankId = rawId.trim();
          const blankDef = blanks.find((b) => b.id === blankId);
          return { type: "blank", id: blankId, def: blankDef, key: index };
        }
        return { type: "text", content: part, key: index };
      });
    }

    let blankIndex = 0;
    const parts = textTemplate.split(/(_{3,})/g);
    return parts.map((part, index) => {
      if (/^_{3,}$/.test(part)) {
        const blankDef = blanks[blankIndex];
        blankIndex += 1;
        if (blankDef) {
          return { type: "blank", id: blankDef.id, def: blankDef, key: index };
        }
      }
      return { type: "text", content: part, key: index };
    });
  }, [textTemplate, blanks]);

  const handleInputChange = (id: string, value: string) => {
    if (status === "checked") {
      setStatus("idle");
      setResults({});
    }
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const validate = () => {
    const newResults: Record<string, "correct" | "incorrect"> = {};

    blanks.forEach((blank) => {
      const userInput = inputs[blank.id] || "";
      const validAnswers = blank.correctAnswers || [];

      const isCorrect = validAnswers.some((answer) => {
        if (caseSensitive) {
          return userInput.trim() === answer;
        }
        return userInput.trim().toLowerCase() === answer.toLowerCase();
      });

      newResults[blank.id] = isCorrect ? "correct" : "incorrect";
    });

    setResults(newResults);
    setStatus("checked");
  };

  const reset = () => {
    setInputs({});
    setResults({});
    setStatus("idle");
    setBankItems([...wordBank]);
  };

  // --- Drag and Drop Logic ---

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    text: string,
    source: DragSource,
    identifier: number | string,
  ) => {
    // source: 'bank' | 'input'
    // identifier: index (if bank) or blankId (if input)
    const payload: DragPayload = { text, source, identifier };
    const payloadStr = JSON.stringify(payload);
    e.dataTransfer.setData("application/json", payloadStr);
    e.dataTransfer.effectAllowed = "move";
  };

  // Drop into an INPUT
  const handleInputDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetId: string,
  ) => {
    e.preventDefault();
    setDragOverId(null);

    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr) return;

    let payload: DragPayload | null = null;
    try {
      payload = JSON.parse(dataStr) as DragPayload;
    } catch {
      return;
    }

    if (!payload) return;
    const { text, source, identifier } = payload;
    const targetCurrentValue = inputs[targetId];

    // Prepare updates
    let newBank = [...bankItems];
    let newInputs = { ...inputs };

    if (source === "bank") {
      // Remove from bank
      // We use index (identifier) to ensure we remove the correct instance if duplicate words exist
      if (typeof identifier === "number" && newBank[identifier] === text) {
        newBank.splice(identifier, 1);
      } else {
        // Fallback safety
        const idx = newBank.indexOf(text);
        if (idx > -1) newBank.splice(idx, 1);
      }
    } else if (source === "input" && typeof identifier === "string") {
      // If dropped on self, do nothing
      if (identifier === targetId) return;
      // Clear source input
      newInputs[identifier] = "";
    }

    // If target had a value, return it to the bank
    if (targetCurrentValue) {
      newBank.push(targetCurrentValue);
    }

    // Update target input
    newInputs[targetId] = text;

    setBankItems(newBank);
    setInputs(newInputs);

    if (status === "checked") {
      setStatus("idle");
      setResults({});
    }
  };

  // Drop back into the WORD BANK
  const handleBankDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsBankHovered(false);

    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr) return;

    let payload: DragPayload | null = null;
    try {
      payload = JSON.parse(dataStr) as DragPayload;
    } catch {
      return;
    }

    if (!payload) return;
    const { text, source, identifier } = payload;

    if (source === "input" && typeof identifier === "string") {
      // Remove from input
      setInputs((prev) => ({ ...prev, [identifier]: "" }));
      // Add to bank
      setBankItems((prev) => [...prev, text]);

      if (status === "checked") {
        setStatus("idle");
        setResults({});
      }
    }
  };

  // --- Render Helpers ---

  const getInputStyle = (id: string) => {
    const base =
      "mx-1 border rounded-md px-2 py-0.5 text-base leading-snug outline-none transition-colors duration-200 min-w-[64px] inline-flex items-center justify-between bg-background";
    const state = results[id];

    // Drag Hover State
    if (dragOverId === id) {
      return `${base} border-primary/50 ring-2 ring-primary/10 text-foreground`;
    }

    // Validation States
    if (status === "checked") {
      if (state === "correct")
        return `${base} border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-300`;
      if (state === "incorrect")
        return `${base} border-rose-500/50 bg-rose-50 dark:bg-rose-900/30 text-rose-900 dark:text-rose-300`;
    }

    // Default State
    return `${base} border-border text-foreground focus-within:ring-2 focus-within:ring-primary/15 focus-within:border-primary/40`;
  };

  const wordBankSection = (
    <div
      className={`transition-colors duration-200 ${
        showCard
          ? "px-4 py-3 border border-border rounded-md bg-muted/20"
          : "px-0 py-0"
      } ${isBankHovered ? "bg-primary/5 ring-2 ring-primary/10" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsBankHovered(true);
      }}
      onDragLeave={() => setIsBankHovered(false)}
      onDrop={handleBankDrop}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Word Bank
          {bankItems.length === 0 && (
            <span className="ml-2 font-normal lowercase text-muted-foreground/60">
              (empty)
            </span>
          )}
        </p>
        {isBankHovered && (
          <span className="text-[10px] text-primary font-medium">
            Drop to remove
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {bankItems.map((word, idx) => (
          <div
            key={`${word}-${idx}`}
            draggable
            onDragStart={(e) => handleDragStart(e, word, "bank", idx)}
            className="cursor-grab active:cursor-grabbing px-2.5 py-1 bg-background border border-border rounded-md shadow-sm hover:border-primary/40 hover:text-primary transition-colors text-xs font-medium flex items-center gap-2 select-none"
          >
            {word}
          </div>
        ))}
      </div>
    </div>
  );

  const contentSection = (
    <div className="leading-loose text-base text-foreground/80">
      <div className="font-medium">
        {segments.map((segment) => {
          if (segment.type === "text") {
            return (
              <span key={segment.key} className="whitespace-pre-wrap">
                {segment.content}
              </span>
            );
          }

          if (segment.type === "blank") {
            const { id, def } = segment;
            if (!def)
              return (
                <span key={segment.key} className="text-destructive">
                  [Missing Def: {id}]
                </span>
              );

            const inputValue = inputs[id] ?? "";
            const hasValue = !!inputValue;

            return (
              <span
                key={segment.key}
                className="relative inline-block align-bottom"
              >
                <div
                  // Container acts as the input zone
                  className={getInputStyle(id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverId !== id) setDragOverId(id);
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleInputDrop(e, id)}
                  style={{
                    minWidth: hasValue ? "auto" : "64px",
                    width: hasValue ? "auto" : undefined,
                  }}
                >
                  {/* If we have a value, render it as a draggable chip inside the input area.
                     If not, render a transparent input for typing fallback.
                   */}
                  {hasValue ? (
                    <div
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(e, inputValue, "input", id)
                      }
                      className="flex items-center gap-2 px-1 py-0.5 cursor-grab active:cursor-grabbing hover:text-primary w-full"
                      title="Drag to move or remove"
                    >
                      <span className="font-semibold">{inputValue}</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => handleInputChange(id, e.target.value)}
                      placeholder={def.placeholder || ""}
                      className="bg-transparent border-none outline-none w-full text-inherit p-0 placeholder:text-muted-foreground/60"
                      autoComplete="off"
                    />
                  )}
                </div>

                {/* Feedback Icon Overlay */}
                {status === "checked" && (
                  <span className="absolute -right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {results[id] === "correct" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </span>
                )}
              </span>
            );
          }
          return null;
        })}
      </div>
    </div>
  );

  return (
    <div
      className={`${baseClass} ${customClass} w-full max-w-3xl mx-auto my-8 ${
        showCard ? "border border-border rounded-lg p-3 bg-background" : ""
      }`}
    >
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted text-foreground">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs">
                {title || "Fill in the Blanks"}
              </div>
              {description && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  <Markdown>{description}</Markdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {wordBankSection}
        {contentSection}
      </div>

      {showActions && (
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={reset}
            className="px-2.5 py-1 text-[10px] rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="inline-flex items-center gap-1">
              <RefreshCcw className="w-3 h-3" />
              Reset
            </span>
          </button>
          <button
            type="button"
            onClick={validate}
            disabled={
              status === "checked" &&
              Object.values(results).every((r) => r === "correct")
            }
            className="px-3 py-1.5 rounded text-[10px] font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Check Answers
          </button>
        </div>
      )}

      {showValidation &&
        status === "checked" &&
        Object.values(results).some((r) => r === "incorrect") && (
          <div className="mt-3 text-[10px] text-rose-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Incorrect Responses:</p>
                <ul className="list-disc list-inside space-y-1">
                  {blanks
                    .filter((b) => results[b.id] === "incorrect")
                    .map((b) => (
                      <li key={b.id}>
                        <span className="font-medium">{b.id}:</span> You entered
                        "{inputs[b.id] || ""}".
                        {b.hint && (
                          <span className="text-rose-700 ml-1 italic">
                            — Hint: {b.hint}
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
