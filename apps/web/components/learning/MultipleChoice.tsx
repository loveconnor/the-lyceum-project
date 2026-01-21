"use client";

import { useState, useMemo } from "react";
import { Check, X, AlertCircle, ArrowRight, RotateCcw } from "lucide-react";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";
/* --- UTILITY FUNCTIONS --- */

// Fisher-Yates Shuffle
const shuffleArray = <T,>(array: T[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = newArray[i]!;
    newArray[i] = newArray[j]!;
    newArray[j] = temp;
  }
  return newArray;
};

/* --- MAIN COMPONENT: MULTIPLE CHOICE --- */

type MultipleChoiceOption = { id: string; label: string };

type MultipleChoiceQuestion = {
  id: string;
  question: string;
  options: MultipleChoiceOption[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  minSelections?: number;
  misconceptions?: Record<string, string> | null;
};

type MultipleChoiceProps = {
  question?: string | null;
  options?: MultipleChoiceOption[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  minSelections?: number;
  questions?: MultipleChoiceQuestion[];
  misconceptions?: Record<string, string> | null;
  shuffle?: boolean;
  showFeedback?: boolean;
  className?: string[];
};

export function MultipleChoice({ element }: ComponentRenderProps) {
  const props = element.props as MultipleChoiceProps;
  const customClass = getCustomClass(props);
  const questions = Array.isArray(props.questions) ? props.questions : null;
  const question = props.question ?? "";
  const options = Array.isArray(props.options) ? props.options : [];
  const correctOptionId = String(props.correctOptionId || "");
  const correctOptionIds = Array.isArray(props.correctOptionIds)
    ? props.correctOptionIds
    : [];
  const minSelections =
    typeof props.minSelections === "number" ? props.minSelections : 1;
  const misconceptions = props.misconceptions ?? {};
  const shuffle = Boolean(props.shuffle);
  const showFeedback = props.showFeedback ?? true;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});

  const activeQuestion = questions ? questions[currentIndex] : null;
  const activeQuestionId = activeQuestion?.id ?? "single";
  const activeQuestionText = activeQuestion?.question ?? question;
  const activeOptions = activeQuestion?.options ?? options;
  const activeCorrectId = activeQuestion?.correctOptionId ?? correctOptionId;
  const activeCorrectIds = activeQuestion?.correctOptionIds ?? correctOptionIds;
  const activeMinSelections =
    typeof activeQuestion?.minSelections === "number"
      ? activeQuestion.minSelections
      : minSelections;
  const activeMisconceptions = activeQuestion?.misconceptions ?? misconceptions;
  const selectedId = selections[activeQuestionId] ?? null;
  const status = submitted[activeQuestionId] ? "submitted" : "idle";
  const feedback = feedbackByQuestion[activeQuestionId] ?? null;

  // Memoize shuffled options so they don't jump around on re-renders
  const displayOptions = useMemo(() => {
    return shuffle ? shuffleArray(activeOptions) : activeOptions;
  }, [activeOptions, shuffle]);

  const handleSelect = (id: string) => {
    if (status === "submitted") return;
    if (activeMinSelections > 1) {
      const current = selections[activeQuestionId]
        ? selections[activeQuestionId].split("|")
        : [];
      const isSelected = current.includes(id);
      const next = isSelected
        ? current.filter((item) => item !== id)
        : [...current, id];
      setSelections((prev) => ({
        ...prev,
        [activeQuestionId]: next.join("|"),
      }));
      return;
    }

    setSelections((prev) => ({ ...prev, [activeQuestionId]: id }));
  };

  const handleSubmit = () => {
    if (!selectedId) return;

    if (activeMinSelections > 1) {
      const selectedIds = selectedId.split("|").filter(Boolean);
      if (selectedIds.length < activeMinSelections) {
        setFeedbackByQuestion((prev) => ({
          ...prev,
          [activeQuestionId]: {
            type: "error",
            message: `Select at least ${activeMinSelections} options.`,
          },
        }));
        return;
      }
    }

    const selectedIds = selectedId.split("|").filter(Boolean);
    const isMulti = activeMinSelections > 1 || activeCorrectIds.length > 0;
    const isCorrect = isMulti
      ? selectedIds.length > 0 &&
        activeCorrectIds.length > 0 &&
        selectedIds.every((id) => activeCorrectIds.includes(id)) &&
        activeCorrectIds.every((id) => selectedIds.includes(id))
      : selectedId === activeCorrectId;
    setSubmitted((prev) => ({ ...prev, [activeQuestionId]: true }));

    if (isCorrect) {
      setFeedbackByQuestion((prev) => ({
        ...prev,
        [activeQuestionId]: {
          type: "success",
          message: "Correct! You've grasped the concept perfectly.",
        },
      }));
    } else {
      const misconceptionMsg =
        (activeMinSelections > 1
          ? selectedIds
              .map((id) => activeMisconceptions[id])
              .filter(Boolean)
              .join(" ")
          : selectedId && activeMisconceptions[selectedId]) ||
        "That's not quite right. Review the concept and try again.";
      setFeedbackByQuestion((prev) => ({
        ...prev,
        [activeQuestionId]: {
          type: "error",
          message: misconceptionMsg,
        },
      }));
    }
  };

  const handleReset = () => {
    setSelections((prev) => {
      const next = { ...prev };
      delete next[activeQuestionId];
      return next;
    });
    setSubmitted((prev) => ({ ...prev, [activeQuestionId]: false }));
    setFeedbackByQuestion((prev) => {
      const next = { ...prev };
      delete next[activeQuestionId];
      return next;
    });
  };

  const canGoPrev = Boolean(questions && currentIndex > 0);
  const canGoNext = Boolean(questions && currentIndex < questions.length - 1);

  return (
    <div className={`${baseClass} ${customClass} w-full max-w-2xl mx-auto`}>
      {activeQuestionText ? (
        <div className="text-sm font-semibold text-left mb-3">
          {activeQuestionText}
        </div>
      ) : null}

      <div className="space-y-2">
        {displayOptions.map((option) => {
          const isSelected =
            activeMinSelections > 1
              ? selectedId?.split("|").includes(option.id)
              : selectedId === option.id;
          const isSubmitted = status === "submitted";

          let containerClasses =
            "relative flex items-center p-3 rounded-md border cursor-pointer transition-colors duration-200";
          let indicatorColor = "border-border text-transparent";

          if (isSubmitted) {
            if (
              (activeMinSelections > 1 &&
                activeCorrectIds.includes(option.id)) ||
              option.id === activeCorrectId
            ) {
              containerClasses += " bg-emerald-50 border-emerald-500";
              indicatorColor = "border-emerald-500 bg-emerald-500 text-white";
            } else if (isSelected && option.id !== correctOptionId) {
              containerClasses += " bg-rose-50 border-rose-300";
              indicatorColor = "border-rose-400 text-rose-500";
            } else {
              containerClasses += " opacity-60";
            }
          } else if (isSelected) {
            containerClasses += " border-foreground bg-muted/30";
            indicatorColor = "border-foreground bg-foreground text-background";
          } else {
            containerClasses += " border-border hover:bg-muted/30";
          }

          return (
            <div
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={containerClasses}
              role="radio"
              aria-checked={isSelected}
            >
              <div
                className={`flex items-center justify-center w-4 h-4 rounded-full border ${indicatorColor} mr-3 shrink-0 transition-colors`}
              >
                {isSubmitted &&
                ((activeMinSelections > 1 &&
                  activeCorrectIds.includes(option.id)) ||
                  option.id === correctOptionId) ? (
                  <Check className="w-3 h-3" strokeWidth={3} />
                ) : isSubmitted && isSelected ? (
                  <X className="w-3 h-3" strokeWidth={3} />
                ) : (
                  <div
                    className={`w-2 h-2 rounded-full bg-background ${
                      isSelected ? "opacity-100" : "opacity-0"
                    }`}
                  />
                )}
              </div>

              <div className="flex-1">
                <span
                  className={`text-sm ${
                    isSelected || (isSubmitted && option.id === correctOptionId)
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {option.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {showFeedback && status === "submitted" && feedback ? (
        <div
          className={`mt-3 text-xs rounded-md p-2 border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-100"
              : "bg-amber-50 text-amber-900 border-amber-100"
          }`}
        >
          <div className="flex items-start gap-2">
            {feedback.type === "success" ? (
              <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
            )}
            <div>
              <div className="font-semibold">
                {feedback.type === "success" ? "Spot on!" : "Not quite."}
              </div>
              <div className="text-muted-foreground">{feedback.message}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 mt-3">
        {questions ? (
          <div className="text-[10px] text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {canGoPrev ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="h-7 px-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Previous
            </button>
          ) : null}

          {canGoNext ? (
            <button
              type="button"
              onClick={() =>
                setCurrentIndex((prev) =>
                  Math.min(prev + 1, (questions?.length ?? 1) - 1),
                )
              }
              className="h-7 px-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Next
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {status === "submitted" ? (
            <button
              type="button"
              onClick={handleReset}
              className="h-7 px-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="inline-flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Try Again
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedId}
              className="h-7 px-3 rounded bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1">
                Check Answer <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
