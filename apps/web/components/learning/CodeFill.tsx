"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronRight, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "./markdown";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

type CodeFillGap = {
  id: string;
  expectedId: string;
  placeholder?: string | null;
};

type CodeFillOption = {
  id: string;
  label: string;
  type?: string | null;
};

type CodeFillScenario = {
  id: string;
  title?: string | null;
  description?: string | null;
  language?: string | null;
  difficulty?: string | null;
  codeTemplate: string;
  gaps: CodeFillGap[];
  options: CodeFillOption[];
};

type CodeFillProps = {
  title?: string | null;
  description?: string | null;
  codeTemplate?: string | null;
  gaps?: CodeFillGap[];
  options?: CodeFillOption[];
  scenarios?: CodeFillScenario[];
  startIndex?: number | null;
  showHeader?: boolean;
  showOptions?: boolean;
  showControls?: boolean;
  showScenarioNavigation?: boolean;
  showFeedback?: boolean;
  autoAdvance?: boolean;
  controlsSlotMode?: "append" | "replace";
  optionsSlotMode?: "append" | "replace";
  headerSlotMode?: "append" | "replace";
  className?: string[];
};

const DEFAULT_SCENARIOS: CodeFillScenario[] = [
  {
    id: "python-avg",
    title: "Calculate Average",
    description: "Complete the logic to calculate the average of a list.",
    language: "python",
    difficulty: "Beginner",
    codeTemplate: `def calculate_average(numbers):
    if not numbers:
        return 0
        
    total = 0
    for num in numbers:
        {{gap_1}}
        
    return {{gap_2}}`,
    gaps: [
      { id: "gap_1", expectedId: "opt_acc" },
      { id: "gap_2", expectedId: "opt_div" },
    ],
    options: [
      { id: "opt_acc", label: "total += num", type: "logic" },
      { id: "opt_wrong_1", label: "total = num", type: "logic" },
      { id: "opt_div", label: "total / len(numbers)", type: "math" },
      { id: "opt_wrong_2", label: "total / numbers", type: "math" },
      { id: "opt_wrong_3", label: "total * len(numbers)", type: "math" },
    ],
  },
  {
    id: "js-async",
    title: "Async Data Fetching",
    description: "Structure the async/await calls correctly.",
    language: "javascript",
    difficulty: "Intermediate",
    codeTemplate: `async function getUserData(userId) {
  try {
    const response = {{gap_1}} fetch(\`/api/users/\${userId}\`);
    
    if (!response.ok) {
      throw new Error('Network error');
    }

    const data = {{gap_2}} response.json();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}`,
    gaps: [
      { id: "gap_1", expectedId: "opt_await" },
      { id: "gap_2", expectedId: "opt_await" },
    ],
    options: [
      { id: "opt_await", label: "await", type: "keyword" },
      { id: "opt_async", label: "async", type: "keyword" },
      { id: "opt_then", label: ".then()", type: "method" },
      { id: "opt_return", label: "return", type: "keyword" },
    ],
  },
  {
    id: "react-effect",
    title: "React Effect Cleanup",
    description: "Prevent memory leaks in useEffect.",
    language: "javascript",
    difficulty: "Advanced",
    codeTemplate: `function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchUser(userId).then(data => {
      if (isMounted) setUser(data);
    });

    return () => { {{gap_1}} };
  }, [{{gap_2}}]);

  if (!user) return <div>Loading...</div>;
  return <div>{user.name}</div>;
}`,
    gaps: [
      { id: "gap_1", expectedId: "opt_cleanup" },
      { id: "gap_2", expectedId: "opt_dep" },
    ],
    options: [
      { id: "opt_cleanup", label: "isMounted = false", type: "logic" },
      { id: "opt_wrong_clean", label: "return false", type: "logic" },
      { id: "opt_dep", label: "userId", type: "variable" },
      { id: "opt_wrong_dep", label: "user", type: "variable" },
      { id: "opt_empty", label: "[]", type: "syntax" },
    ],
  },
];

const normalizeCodeSnippet = (value: string) => {
  if (!value) return value;

  let normalized = value
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\\t/g, "\t");
  const hasGapPlaceholder = /{{\s*gap[^}]*}}/.test(normalized);

  // If authored as a single-line block, expand the body for readability.
  // Example:
  // "public void makeSound() { System.out.println(\"Bark\"); }"
  // -> "public void makeSound() {\n  System.out.println(\"Bark\");\n}"
  if (!normalized.includes("\n") && !hasGapPlaceholder) {
    const blockMatch = normalized.match(/^(.*)\{\s*([\s\S]*?)\s*\}\s*$/);
    if (blockMatch) {
      const header = blockMatch[1].trimEnd();
      const body = blockMatch[2].trim();
      if (body.length > 0) {
        normalized = `${header}{\n  ${body}\n}`;
      }
    }
  }

  return normalized;
};

const highlightSyntax = (text: string) => {
  if (!text) return null;

  const regex =
    /((?:s?['"`])(?:(?!\1|\\).|\\.)*\1|(?:(?:\/\/|#).*$)|(?:\b(?:def|class|if|else|elif|return|for|while|import|from|as|try|except|finally|raise|async|await|function|const|let|var|new|this|typeof|instanceof|void|delete|null|true|false|undefined|in|of|console)\b)|(?:\b\d+(?:\.\d+)?\b))/gm;

  return text.split(regex).map((part, i) => {
    if (!part) return null;
    let style = "text-muted-foreground";

    if (/^['"`]/.test(part)) style = "text-green-600 dark:text-green-400";
    else if (/^(?:\/\/|#)/.test(part)) style = "text-muted-foreground/60 italic";
    else if (/^\d/.test(part)) style = "text-orange-600 dark:text-orange-400";
    else if (
      /^(def|class|if|else|elif|return|for|while|import|from|as|try|except|finally|raise|async|await|function|const|let|var|new|this|typeof|instanceof|void|delete|null|true|false|undefined|in|of|console)$/.test(
        part,
      )
    )
      style = "text-purple-600 dark:text-purple-400 font-semibold";

    return (
      <span key={i} className={style}>
        {part}
      </span>
    );
  });
};

type ValidationState = {
  submitted: boolean;
  results: Record<string, boolean>;
  correct: boolean;
};

type CodeRendererProps = {
  template: string;
  gaps: CodeFillGap[];
  answers: Record<string, CodeFillOption | undefined>;
  selectedGap: string | null;
  onGapClick: (gapId: string) => void;
  onOptionDrop: (gapId: string, option: CodeFillOption) => void;
  validationState: ValidationState;
};

const CodeRenderer = ({
  template,
  gaps,
  answers,
  selectedGap,
  onGapClick,
  onOptionDrop,
  validationState,
}: CodeRendererProps) => {
  const normalizedTemplate = useMemo(() => {
    let normalized = normalizeCodeSnippet(template);

    // If a template is authored as a single line like:
    // "public {{gap_1}} class Animal { {{gap_2}} }"
    // render the block body on its own line for better code alignment.
    if (!normalized.includes("\n")) {
      normalized = normalized.replace(
        /\{\s*({{gap[^}]*}})\s*\}/g,
        "{\n  $1\n}",
      );
    }

    return normalized;
  }, [template]);

  const parts = useMemo(() => {
    const regex = /({{gap[^}]*}})/g;
    return normalizedTemplate.split(regex);
  }, [normalizedTemplate]);

  const handleDragOver = (e: React.DragEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent<HTMLSpanElement>, gapId: string) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData("application/json");
      if (data) {
        const option = JSON.parse(data) as CodeFillOption;
        onOptionDrop(gapId, option);
      }
    } catch (err) {
      console.error("Failed to parse drop data", err);
    }
  };

  return (
    <div className="font-mono text-sm leading-8 whitespace-pre overflow-x-auto">
      {parts.map((part, index) => {
        const gapMatch = part.match(/{{(gap[^}]+)}}/);
        const gapId = gapMatch?.[1];

        if (gapId) {
          const filledOption = answers[gapId];
          const isSelected = selectedGap === gapId;
          const isCorrect = validationState?.results?.[gapId];
          const isError = validationState?.submitted && !isCorrect;

          let classes =
            "inline-block min-w-[80px] min-h-[28px] px-3 py-1 my-0.5 rounded text-xs transition-all duration-200 cursor-pointer select-none border border-dashed align-middle whitespace-pre";

          if (isSelected) {
            classes +=
              " border-primary bg-primary/10 text-primary ring-2 ring-primary/20 border-solid";
          } else if (filledOption) {
            classes +=
              " border-border bg-card text-foreground border-solid shadow-sm";
          } else {
            classes +=
              " border-border bg-transparent text-muted-foreground hover:border-foreground/50 hover:bg-card";
          }

          if (isCorrect) {
            classes = classes
              .replace("border-border", "border-emerald-500")
              .replace(
                "bg-card",
                "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-solid",
              )
              .replace("bg-transparent", "bg-emerald-50 dark:bg-emerald-900/20")
              .replace("border-primary", "border-emerald-500")
              .replace("bg-primary/10", "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300");
          }
          if (isError) {
            classes = classes
              .replace("border-border", "border-rose-500")
              .replace("bg-card", "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-solid")
              .replace("bg-transparent", "bg-rose-50 dark:bg-rose-900/20");
          }

          return (
            <span
              key={index}
              onClick={() => onGapClick(gapId)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, gapId)}
              className={classes}
            >
              {filledOption ? normalizeCodeSnippet(filledOption.label) : ""}
            </span>
          );
        }

        return <span key={index}>{highlightSyntax(part)}</span>;
      })}
    </div>
  );
};

type OptionBankProps = {
  options: Array<CodeFillOption & { instanceKey: string }>;
  onSelect: (option: CodeFillOption) => void;
};

const OptionBank = ({ options, onSelect }: OptionBankProps) => {
  const handleDragStart = (
    e: React.DragEvent<HTMLButtonElement>,
    option: CodeFillOption,
  ) => {
    e.dataTransfer.setData("application/json", JSON.stringify(option));
    e.dataTransfer.effectAllowed = "copy";
  };

  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
        Options
      </h3>
      {safeOptions.map((opt) => {
        const { instanceKey, ...option } = opt;
        return (
        <button
          key={instanceKey}
          draggable
          onDragStart={(e) => handleDragStart(e, option)}
          onClick={() => onSelect(option)}
          className="
            w-full text-left px-4 py-3
            bg-card border border-border rounded-lg shadow-sm
            hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md
            active:scale-[0.98] transition-all duration-150
            cursor-grab active:cursor-grabbing
          "
        >
          <span className="font-mono text-sm text-foreground pointer-events-none whitespace-pre-wrap leading-7">
            {normalizeCodeSnippet(option.label)}
          </span>
        </button>
        );
      })}
    </div>
  );
};

function getNextGapId(
  gapIds: string[],
  currentId: string,
  answers: Record<string, CodeFillOption | undefined>,
) {
  const currentIndex = gapIds.indexOf(currentId);
  const forward = gapIds.slice(currentIndex + 1).find((id) => !answers[id]);
  if (forward) return forward;
  return gapIds.find((id) => !answers[id]) ?? null;
}

export function CodeFill({ element, children }: ComponentRenderProps) {
  const props = element.props as CodeFillProps;
  const customClass = getCustomClass(props);
  const title = props.title ?? null;
  const description = props.description ?? null;
  const showHeader = props.showHeader ?? true;
  const showOptions = props.showOptions ?? true;
  const showControls = props.showControls ?? true;
  const showScenarioNavigation = props.showScenarioNavigation ?? true;
  const showFeedback = props.showFeedback ?? true;
  const autoAdvance = props.autoAdvance ?? true;
  const controlsSlotMode = props.controlsSlotMode ?? "append";
  const optionsSlotMode = props.optionsSlotMode ?? "append";
  const headerSlotMode = props.headerSlotMode ?? "append";

  const scenarios = useMemo<CodeFillScenario[]>(() => {
    if (Array.isArray(props.scenarios) && props.scenarios.length > 0) {
      return props.scenarios;
    }

    if (
      props.codeTemplate &&
      Array.isArray(props.gaps) &&
      Array.isArray(props.options)
    ) {
      return [
        {
          id: "scenario-1",
          title,
          description,
          codeTemplate: props.codeTemplate,
          gaps: props.gaps,
          options: props.options,
        },
      ];
    }

    return DEFAULT_SCENARIOS;
  }, [
    props.scenarios,
    props.codeTemplate,
    props.gaps,
    props.options,
    title,
    description,
  ]);

  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(() => {
    const initialIndex =
      typeof props.startIndex === "number" ? props.startIndex : 0;
    return Math.max(0, Math.min(initialIndex, scenarios.length - 1));
  });
  const [answers, setAnswers] = useState<Record<string, CodeFillOption>>({});
  const [selectedGap, setSelectedGap] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<ValidationState>({
    submitted: false,
    results: {},
    correct: false,
  });

  const scenario = scenarios[currentScenarioIndex] ?? scenarios[0];
  const availableOptions = useMemo<Array<CodeFillOption & { instanceKey: string }>>(() => {
    if (!scenario) return [];

    const canonicalOptionById = new Map<string, CodeFillOption>();
    const totalById = new Map<string, number>();

    // Preserve author order while allowing duplicate pool entries by id.
    for (const option of scenario.options) {
      if (!canonicalOptionById.has(option.id)) {
        canonicalOptionById.set(option.id, option);
      }
      totalById.set(option.id, (totalById.get(option.id) ?? 0) + 1);
    }

    // If a correct option id is used in multiple gaps, ensure enough copies exist.
    const expectedCounts = new Map<string, number>();
    for (const gap of scenario.gaps) {
      expectedCounts.set(gap.expectedId, (expectedCounts.get(gap.expectedId) ?? 0) + 1);
    }
    for (const [optionId, expectedCount] of expectedCounts.entries()) {
      const currentTotal = totalById.get(optionId) ?? 0;
      if (currentTotal < expectedCount && canonicalOptionById.has(optionId)) {
        totalById.set(optionId, expectedCount);
      }
    }

    const usedById = new Map<string, number>();
    for (const selected of Object.values(answers)) {
      if (!selected?.id) continue;
      usedById.set(selected.id, (usedById.get(selected.id) ?? 0) + 1);
    }

    const pool: Array<CodeFillOption & { instanceKey: string }> = [];
    for (const [optionId, totalCount] of totalById.entries()) {
      const option = canonicalOptionById.get(optionId);
      if (!option) continue;
      const usedCount = usedById.get(optionId) ?? 0;
      const remaining = Math.max(0, totalCount - usedCount);

      for (let i = 0; i < remaining; i += 1) {
        pool.push({ ...option, instanceKey: `${optionId}__${i}` });
      }
    }

    return pool;
  }, [scenario, answers]);

  useEffect(() => {
    if (currentScenarioIndex > scenarios.length - 1) {
      setCurrentScenarioIndex(0);
    }
  }, [currentScenarioIndex, scenarios.length]);

  useEffect(() => {
    setAnswers({});
    setValidationState({ submitted: false, results: {}, correct: false });
    setSelectedGap(null);
  }, [scenario?.id, scenario?.codeTemplate]);

  const childrenArray = React.Children.toArray(children).filter(Boolean);
  const slotChildren = (slot: string) =>
    childrenArray.filter(
      (child) =>
        React.isValidElement(child) &&
        (child.props as { slot?: string }).slot === slot,
    );
  const unslottedChildren = childrenArray.filter(
    (child) =>
      !React.isValidElement(child) || !(child.props as { slot?: string }).slot,
  );

  const handleGapClick = (gapId: string) => {
    if (validationState.correct) return;
    setSelectedGap(gapId);
  };

  const handleOptionSelect = (option: CodeFillOption) => {
    if (!scenario) return;
    const targetGap =
      selectedGap || scenario.gaps.find((gap) => !answers[gap.id])?.id;
    if (!targetGap) return;

    setAnswers((prev) => {
      const nextAnswers = { ...prev, [targetGap]: option };
      if (autoAdvance) {
        const gapIds = scenario.gaps.map((g) => g.id);
        const nextGap = getNextGapId(gapIds, targetGap, nextAnswers);
        setSelectedGap(nextGap);
      }
      return nextAnswers;
    });

    if (validationState.submitted) {
      setValidationState((prev) => ({ ...prev, submitted: false }));
    }
  };

  const handleOptionDrop = (gapId: string, option: CodeFillOption) => {
    if (validationState.correct) return;

    setAnswers((prev) => ({ ...prev, [gapId]: option }));

    if (validationState.submitted) {
      setValidationState((prev) => ({ ...prev, submitted: false }));
    }
  };

  const checkAnswers = () => {
    if (!scenario) return;
    const results: Record<string, boolean> = {};
    let allCorrect = true;
    scenario.gaps.forEach((gap) => {
      const selectedOption = answers[gap.id];
      const isCorrect = selectedOption?.id === gap.expectedId;
      results[gap.id] = isCorrect;
      if (!isCorrect) allCorrect = false;
    });
    setValidationState({ submitted: true, results, correct: allCorrect });
    
    // Mark step as complete if all answers are correct
    if (allCorrect && typeof (window as any).__markStepComplete === "function") {
      (window as any).__markStepComplete();
    }
  };

  const handleNext = () => {
    if (!showScenarioNavigation) return;
    if (currentScenarioIndex < scenarios.length - 1) {
      setCurrentScenarioIndex((prev) => prev + 1);
      return;
    }

    const win = window as unknown as { __demoNextStep?: () => void };
    win.__demoNextStep?.();
  };

  const handleReset = () => {
    setAnswers({});
    setValidationState({ submitted: false, results: {}, correct: false });
    setSelectedGap(null);
  };

  if (!scenario) {
    return null;
  }

  const isComplete = scenario.gaps.every((gap) => Boolean(answers[gap.id]));

  return (
    <div
      className={`w-full max-w-4xl mx-auto space-y-8 text-foreground ${baseClass} ${customClass}`}
    >
      {/* INSTRUCTIONS */}
      {showHeader && (
        <div className="space-y-2">
          {(scenario.title || title) && (
            <h2 className="text-2xl font-bold text-foreground">
              {scenario.title ?? title}
            </h2>
          )}
          {(scenario.description || description) && (
            <div className="text-muted-foreground text-base">
              <Markdown>{scenario.description ?? description ?? ""}</Markdown>
            </div>
          )}
          {headerSlotMode === "append" && slotChildren("header")}
        </div>
      )}
      {headerSlotMode === "replace" && slotChildren("header")}

      {slotChildren("content").length > 0 && (
        <div className="space-y-3">{slotChildren("content")}</div>
      )}

      {/* MAIN WORKSPACE */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)] gap-8">
        {/* CODE BOX */}
        <div className="md:col-span-2">
          <div
            className={`
              h-full bg-muted/30 rounded-xl p-8 border-2 transition-colors duration-300
              ${validationState.correct ? "border-emerald-100 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-900/20" : "border-border/50"}
            `}
          >
            <CodeRenderer
              template={scenario.codeTemplate}
              gaps={scenario.gaps}
              answers={answers}
              selectedGap={selectedGap}
              onGapClick={handleGapClick}
              onOptionDrop={handleOptionDrop}
              validationState={validationState}
            />
          </div>
        </div>

        {/* OPTIONS */}
        <div className="md:col-span-1 md:min-w-[220px]">
          {showOptions && optionsSlotMode !== "replace" && (
            <OptionBank
              options={availableOptions}
              onSelect={handleOptionSelect}
            />
          )}
          {optionsSlotMode === "replace" && slotChildren("options")}
          {optionsSlotMode === "append" && slotChildren("options")}

          {/* Feedback Message */}
          {showFeedback && !selectedGap && !validationState.correct && (
            <p className="text-sm text-gray-400 italic mt-4">
              Select a gap to start or drag an option.
            </p>
          )}
        </div>
      </div>

      {/* CONTROLS */}
      {showControls && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {controlsSlotMode !== "replace" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw size={18} />
              Reset
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-4">
            {showFeedback &&
              validationState.submitted &&
              !validationState.correct && (
                <div className="flex items-center gap-2 text-rose-600 font-medium animate-in fade-in">
                  <AlertCircle size={20} />
                  <span>Incorrect</span>
                </div>
              )}

            {controlsSlotMode !== "replace" && (
              <>
                {validationState.correct ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="gap-2 px-6"
                  >
                    <span>Next</span>
                    <ChevronRight size={20} />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={checkAnswers}
                    disabled={!isComplete}
                    className="gap-2 px-6"
                  >
                    <Play size={20} fill="currentColor" />
                    <span>Run Code</span>
                  </Button>
                )}
              </>
            )}
            {controlsSlotMode === "append" && slotChildren("controls")}
            {controlsSlotMode === "replace" && slotChildren("controls")}
          </div>
        </div>
      )}

      {unslottedChildren.length > 0 && (
        <div className="space-y-3">{unslottedChildren}</div>
      )}
    </div>
  );
}
