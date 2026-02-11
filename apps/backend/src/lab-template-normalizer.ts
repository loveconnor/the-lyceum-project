type JsonRecord = Record<string, unknown>;
type DatasetColumnType = "number" | "string" | "date";

export type LabTemplateType = "analyze" | "build" | "derive" | "explain" | "explore" | "revise";
export type LabDifficulty = "beginner" | "intermediate" | "advanced";

export const LAB_TEMPLATE_TYPES: LabTemplateType[] = [
  "analyze",
  "build",
  "derive",
  "explain",
  "explore",
  "revise",
];

const BUILD_LANGUAGES = new Set([
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
]);

const DIFFICULTIES = new Set<LabDifficulty>(["beginner", "intermediate", "advanced"]);

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : {});

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asString = (value: unknown, fallback = ""): string => asNonEmptyString(value) ?? fallback;

const asNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return asNonEmptyString(entry);
      if (isRecord(entry)) {
        return (
          asNonEmptyString(entry.title) ??
          asNonEmptyString(entry.name) ??
          asNonEmptyString(entry.label) ??
          asNonEmptyString(entry.area) ??
          asNonEmptyString(entry.description) ??
          asNonEmptyString(entry.question)
        );
      }
      return null;
    })
    .filter((entry): entry is string => Boolean(entry));
};

const uniqueStrings = (values: string[], max = 24): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value);
    if (result.length >= max) break;
  }
  return result;
};

const kebab = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const titleCase = (input: string): string =>
  input
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const inferColumnType = (values: unknown[]): DatasetColumnType => {
  const filtered = values.filter((value) => value !== null && value !== undefined);
  if (filtered.length === 0) return "string";
  if (filtered.every((value) => typeof value === "number")) return "number";
  if (
    filtered.every(
      (value) =>
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}/.test(value) &&
        !Number.isNaN(new Date(value).getTime())
    )
  ) {
    return "date";
  }
  return "string";
};

const clampDuration = (value: number): number => Math.max(10, Math.min(240, Math.round(value)));

const normalizeWidgetTypeKey = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
};

const WIDGET_TYPE_BY_KEY: Record<string, string> = {
  text_input: "editor",
  textinput: "editor",
  editor: "editor",
  multiple_choice: "multiple-choice",
  multiplechoice: "multiple-choice",
  code_editor: "code-editor",
  codeeditor: "code-editor",
  derivation_steps: "derivation-steps",
  derivationsteps: "derivation-steps",
  short_answer: "short_answer",
  shortanswer: "short_answer",
  fill_in_the_blank: "fill_in_the_blank",
  fillintheblank: "fill_in_the_blank",
  code_fill: "code_fill",
  codefill: "code_fill",
  true_false: "true_false",
  truefalse: "true_false",
  matching: "matching",
  order_steps: "order_steps",
  ordersteps: "order_steps",
  drag_drop: "drag_drop",
  dragdrop: "drag_drop",
  numeric_input: "numeric_input",
  numericinput: "numeric_input",
  diagram_selection: "diagram_selection",
  diagramselection: "diagram_selection",
};

const LEARN_BY_DOING_WIDGET_TYPES = new Set([
  "short_answer",
  "multiple_choice",
  "code_fill",
  "true_false",
  "fill_in_the_blank",
  "order_steps",
  "drag_drop",
  "numeric_input",
  "diagram_selection",
  "matching",
]);

const BUILD_WIDGET_TYPES = new Set<string>([
  "editor",
  "multiple-choice",
  "code-editor",
  ...LEARN_BY_DOING_WIDGET_TYPES,
]);

const DERIVE_WIDGET_TYPES = new Set<string>([
  "editor",
  "multiple-choice",
  "code-editor",
  "derivation-steps",
  ...LEARN_BY_DOING_WIDGET_TYPES,
]);

const REVISE_WIDGET_TYPES = new Set<string>([
  "editor",
  "multiple-choice",
  "code-editor",
  ...LEARN_BY_DOING_WIDGET_TYPES,
]);

const normalizeStepWidgets = (
  widgetsValue: unknown,
  allowedTypes: Set<string>
): Array<{ type: string; config: JsonRecord }> => {
  if (!Array.isArray(widgetsValue)) return [];
  return widgetsValue
    .map((widget) => {
      const source = asRecord(widget);
      const normalizedTypeKey = normalizeWidgetTypeKey(source.type);
      const mappedType = WIDGET_TYPE_BY_KEY[normalizedTypeKey] ?? "";
      if (!mappedType || !allowedTypes.has(mappedType)) return null;
      return {
        type: mappedType,
        config: asRecord(source.config),
      };
    })
    .filter((entry): entry is { type: string; config: JsonRecord } => Boolean(entry));
};

const normalizeBuildWidgets = (widgetsValue: unknown): Array<{ type: string; config: JsonRecord }> => {
  return normalizeStepWidgets(widgetsValue, BUILD_WIDGET_TYPES);
};

const normalizeDeriveWidgets = (widgetsValue: unknown): Array<{ type: string; config: JsonRecord }> => {
  return normalizeStepWidgets(widgetsValue, DERIVE_WIDGET_TYPES);
};

const normalizeReviseWidgets = (widgetsValue: unknown): Array<{ type: string; config: JsonRecord }> => {
  return normalizeStepWidgets(widgetsValue, REVISE_WIDGET_TYPES);
};

const normalizeAnalyzeTemplate = (value: unknown): JsonRecord => {
  const raw = asRecord(value);
  const rawDataset = asRecord(raw.dataset);
  const rowRecords = Array.isArray(rawDataset.rows)
    ? rawDataset.rows
        .filter(isRecord)
        .map((row) => {
          const normalized: Record<string, string | number> = {};
          Object.entries(row).forEach(([key, cellValue]) => {
            if (typeof cellValue === "number" && Number.isFinite(cellValue)) {
              normalized[key] = cellValue;
            } else if (typeof cellValue === "string") {
              normalized[key] = cellValue;
            } else if (cellValue !== null && cellValue !== undefined) {
              normalized[key] = String(cellValue);
            }
          });
          return normalized;
        })
    : [];

  const rowKeys = rowRecords.length > 0 ? Object.keys(rowRecords[0]) : [];
  const sourceColumns = Array.isArray(rawDataset.columns) ? rawDataset.columns : [];
  const canonicalColumns =
    sourceColumns.length > 0
      ? sourceColumns
          .map((column) => {
            if (typeof column === "string") {
              const key = asNonEmptyString(column);
              if (!key) return null;
              const values = rowRecords.map((row) => row[key]);
              return {
                key,
                label: titleCase(key),
                type: inferColumnType(values),
              };
            }
            const columnRecord = asRecord(column);
            const key = asNonEmptyString(columnRecord.key) ?? asNonEmptyString(columnRecord.name);
            if (!key) return null;
            const values = rowRecords.map((row) => row[key]);
            const typeCandidate = asString(columnRecord.type).toLowerCase();
            const type: DatasetColumnType =
              typeCandidate === "number" || typeCandidate === "date" || typeCandidate === "string"
                ? (typeCandidate as DatasetColumnType)
                : inferColumnType(values);
            return {
              key,
              label: asString(columnRecord.label, titleCase(key)),
              type,
            };
          })
          .filter((column): column is { key: string; label: string; type: DatasetColumnType } => Boolean(column))
      : rowKeys.map((key) => ({
          key,
          label: titleCase(key),
          type: inferColumnType(rowRecords.map((row) => row[key])),
        }));

  const rawGuiding = raw.guidingQuestions;
  const fallbackStepQuestions = Array.isArray(raw.steps)
    ? raw.steps
        .map((step) => asRecord(step))
        .flatMap((step) => toStringArray(step.keyQuestions))
    : [];

  const guidingQuestions: Record<string, string> = {
    question:
      asString(asRecord(rawGuiding).question, "") ||
      asString(raw.question, "") ||
      fallbackStepQuestions[0] ||
      "What specific question are you trying to answer with this dataset?",
    patterns:
      asString(asRecord(rawGuiding).patterns, "") ||
      fallbackStepQuestions[1] ||
      "What patterns or trends stand out in the data?",
    conclusions:
      asString(asRecord(rawGuiding).conclusions, "") ||
      fallbackStepQuestions[2] ||
      "What conclusion can you support with evidence from the dataset?",
    limitations:
      asString(asRecord(rawGuiding).limitations, "") ||
      fallbackStepQuestions[3] ||
      "What are the limitations or uncertainties in this analysis?",
  };

  const availableVariables = uniqueStrings(
    toStringArray(raw.availableVariables).length > 0
      ? toStringArray(raw.availableVariables)
      : canonicalColumns.map((column) => column.key),
    16
  );

  return {
    labTitle: asString(raw.labTitle, "Data Analysis Lab"),
    description: asString(raw.description, ""),
    dataset: {
      name: asString(rawDataset.name, "Dataset"),
      columns: canonicalColumns,
      rows: rowRecords,
    },
    availableVariables,
    guidingQuestions,
    steps: Array.isArray(raw.steps)
      ? raw.steps
          .map((step, index) => {
            const source = asRecord(step);
            const title = asString(source.title, `Step ${index + 1}`);
            const id = asString(source.id, kebab(title) || `step-${index + 1}`);
            return {
              id,
              title,
              instruction: asString(source.instruction, ""),
              keyQuestions: toStringArray(source.keyQuestions),
              description: asString(source.description, ""),
              hints: toStringArray(source.hints),
              widgets: Array.isArray(source.widgets) ? source.widgets : [],
            };
          })
          .filter((step) => step.id.length > 0)
      : [],
  };
};

const normalizeBuildTemplate = (value: unknown): JsonRecord => {
  const raw = asRecord(value);
  const languageCandidate = asString(raw.language).toLowerCase();
  const language = BUILD_LANGUAGES.has(languageCandidate) ? languageCandidate : "javascript";

  const testCases = Array.isArray(raw.testCases)
    ? raw.testCases
        .map((testCase, index) => {
          const source = asRecord(testCase);
          return {
            id: asString(source.id, `test-${index + 1}`),
            input: asString(source.input, ""),
            expectedOutput: asString(source.expectedOutput, ""),
            description: asString(source.description, ""),
            stepId: asString(source.stepId, "") || undefined,
          };
        })
        .filter((testCase) => testCase.id.length > 0)
    : [];

  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .map((step, index) => {
          const source = asRecord(step);
          const title = asString(source.title, `Step ${index + 1}`);
          const id = asString(source.id, kebab(title) || `step-${index + 1}`);
          return {
            id,
            title,
            instruction: asString(source.instruction, ""),
            keyQuestions: toStringArray(source.keyQuestions),
            prompt: asString(source.prompt, ""),
            skeletonCode: asString(source.skeletonCode, ""),
            starterCode: asString(source.starterCode, asString(source.starter_code, "")),
            widgets: normalizeBuildWidgets(source.widgets),
          };
        })
        .filter((step) => step.id.length > 0)
    : [];

  return {
    labTitle: asString(raw.labTitle, "Build Lab"),
    description: asString(raw.description, ""),
    problemStatement: asString(raw.problemStatement, ""),
    initialCode: asString(raw.initialCode, language === "python" ? "# Start coding here\n" : "// Start coding here\n"),
    language,
    testCases:
      testCases.length > 0
        ? testCases
        : [
            {
              id: "test-1",
              input: "",
              expectedOutput: "",
              description: "Basic sanity check.",
            },
          ],
    hints: Array.isArray(raw.hints) ? raw.hints : [],
    stepPrompts: isRecord(raw.stepPrompts) ? raw.stepPrompts : undefined,
    steps,
  };
};

const normalizeDeriveTemplate = (value: unknown): JsonRecord => {
  const raw = asRecord(value);
  const availableRules = Array.isArray(raw.availableRules)
    ? raw.availableRules
        .map((rule, index) => {
          const source = asRecord(rule);
          const name = asString(source.name, `Rule ${index + 1}`);
          return {
            id: asString(source.id, kebab(name) || `rule-${index + 1}`),
            name,
            formula: asString(source.formula, ""),
            category: asString(source.category, "") || undefined,
          };
        })
        .filter((rule) => rule.id.length > 0)
    : [];

  const rawInitialStep = asRecord(raw.initialStep);

  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .map((step, index) => {
          const source = asRecord(step);
          const title = asString(source.title, `Step ${index + 1}`);
          const id = asString(source.id, kebab(title) || `step-${index + 1}`);
          return {
            id,
            title,
            instruction: asString(source.instruction, ""),
            keyQuestions: toStringArray(source.keyQuestions),
            prompt: asString(source.prompt, ""),
            widgets: normalizeDeriveWidgets(source.widgets),
          };
        })
        .filter((step) => step.id.length > 0)
    : [];

  return {
    labTitle: asString(raw.labTitle, "Derivation Lab"),
    description: asString(raw.description, ""),
    problemStatement: asString(raw.problemStatement, asString(raw.goal, "Solve the provided derivation problem.")),
    availableRules,
    initialStep: {
      expression: asString(rawInitialStep.expression, ""),
      justification: asString(rawInitialStep.justification, ""),
    },
    expectedSteps: asNumber(raw.expectedSteps, steps.length > 0 ? steps.length : 4),
    verificationHints: toStringArray(raw.verificationHints),
    conceptCheck: {
      question: asString(asRecord(raw.conceptCheck).question, ""),
      explanation: asString(asRecord(raw.conceptCheck).explanation, "") || undefined,
    },
    steps,
  };
};

const normalizeExplainTemplate = (value: unknown): JsonRecord => {
  const raw = asRecord(value);
  const rawArtifact = asRecord(raw.artifact);
  const languageCandidate = asString(rawArtifact.language ?? raw.language).toLowerCase();
  const artifactLanguage = BUILD_LANGUAGES.has(languageCandidate) ? languageCandidate : "javascript";

  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .map((step, index) => {
          const source = asRecord(step);
          const title = asString(source.title, `Step ${index + 1}`);
          const id = asString(source.id, kebab(title) || `step-${index + 1}`);
          return {
            id,
            title,
            instruction: asString(source.instruction, ""),
            keyQuestions: toStringArray(source.keyQuestions),
            prompt: asString(source.prompt, ""),
          };
        })
        .filter((step) => step.id.length > 0)
    : [];

  return {
    labTitle: asString(raw.labTitle, "Code Explanation Lab"),
    description: asString(raw.description, ""),
    artifact: {
      title: asString(rawArtifact.title, "Code Artifact"),
      description: asString(rawArtifact.description, ""),
      code: asString(rawArtifact.code ?? raw.artifactCode, "// No code provided"),
      language: artifactLanguage,
    },
    language: artifactLanguage,
    keyQuestions: isRecord(raw.keyQuestions) ? raw.keyQuestions : undefined,
    learningObjectives: toStringArray(raw.learningObjectives),
    steps,
  };
};

const normalizeExploreTemplate = (value: unknown): JsonRecord => {
  const raw = asRecord(value);
  const sourceParameters = Array.isArray(raw.parameters)
    ? raw.parameters
    : Array.isArray(raw.paramConfig)
      ? raw.paramConfig
      : [];

  const parameters = sourceParameters
    .map((entry, index) => {
      const source = asRecord(entry);
      const label = asString(source.label, `Parameter ${index + 1}`);
      const min = asNumber(source.min, 0);
      const max = asNumber(source.max, min + 100);
      const step = asNumber(source.step, 1);
      const defaultValue = asNumber(source.defaultValue ?? source.default, min);
      return {
        id: asString(source.id, kebab(label) || `param-${index + 1}`),
        label,
        unit: asString(source.unit, "") || undefined,
        min,
        max: max > min ? max : min + Math.max(step, 1),
        step: step > 0 ? step : 1,
        defaultValue,
        hint: asString(source.hint ?? source.description, "") || undefined,
      };
    })
    .filter((entry) => entry.id.length > 0);

  const stepQuestions = Array.isArray(raw.steps)
    ? raw.steps
        .map((step) => asRecord(step))
        .flatMap((step) => [...toStringArray(step.questions), ...toStringArray(step.instructions)])
    : [];

  const guidingQuestions = uniqueStrings(
    [
      ...toStringArray(raw.guidingQuestions),
      ...stepQuestions,
      asString(raw.hypothesis, ""),
    ].filter((entry) => entry.length > 0),
    8
  );

  return {
    labTitle: asString(raw.labTitle, "Exploration Lab"),
    description: asString(raw.description, ""),
    parameters:
      parameters.length > 0
        ? parameters
        : [
            {
              id: "parameter-1",
              label: "Parameter",
              min: 0,
              max: 100,
              step: 1,
              defaultValue: 50,
            },
          ],
    guidingQuestions:
      guidingQuestions.length > 0
        ? guidingQuestions
        : [
            "What happens when you increase each parameter?",
            "Which parameter has the strongest impact on the outcome?",
            "What relationship do you observe between inputs and outputs?",
          ],
    expectedInsights: toStringArray(raw.expectedInsights),
    simulationFormula: asString(raw.simulationFormula, "") || undefined,
  };
};

const normalizeReviseTemplate = (value: unknown): JsonRecord => {
  const raw = asRecord(value);
  const writingTask = asRecord(raw.writingTask);

  const rubricCriteria = Array.isArray(raw.rubricCriteria)
    ? raw.rubricCriteria
        .map((criterion, index) => {
          const source = asRecord(criterion);
          const name = asString(source.name, `Criterion ${index + 1}`);
          return {
            id: asString(source.id, kebab(name) || `criterion-${index + 1}`),
            name,
            description: asString(source.description, ""),
            guidanceQuestion: asString(
              source.guidanceQuestion,
              `How can you improve this draft with respect to ${name.toLowerCase()}?`
            ),
            hint: asString(source.hint, ""),
          };
        })
        .filter((criterion) => criterion.id.length > 0)
    : [];

  const improvementAreas = uniqueStrings(
    Array.isArray(raw.improvementAreas)
      ? raw.improvementAreas.flatMap((entry) => {
          if (typeof entry === "string") return [entry];
          const source = asRecord(entry);
          return [asString(source.area, ""), ...toStringArray(source.suggestions)].filter(Boolean);
        })
      : [],
    12
  );

  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .map((step, index) => {
          const source = asRecord(step);
          const title = asString(source.title ?? source.focus, `Step ${index + 1}`);
          const id = asString(source.id, kebab(title) || `step-${index + 1}`);
          return {
            id,
            title,
            instruction: asString(source.instruction, asString(source.focus, "")),
            keyQuestions: toStringArray(source.keyQuestions),
            prompt: asString(source.prompt, ""),
            widgets: normalizeReviseWidgets(source.widgets),
          };
        })
        .filter((step) => step.id.length > 0)
    : [];

  return {
    labTitle: asString(raw.labTitle, "Revision Lab"),
    description: asString(raw.description, ""),
    initialDraft: asString(raw.initialDraft ?? raw.originalDraft, asString(writingTask.description, "")),
    targetAudience: asString(raw.targetAudience, asString(writingTask.audience, "General audience")),
    purpose: asString(raw.purpose, asString(writingTask.purpose, "Improve clarity and effectiveness.")),
    rubricCriteria,
    improvementAreas,
    steps,
  };
};

export const isLabTemplateType = (value: unknown): value is LabTemplateType =>
  typeof value === "string" && LAB_TEMPLATE_TYPES.includes(value as LabTemplateType);

export const normalizeTemplateData = (templateType: LabTemplateType, data: unknown): JsonRecord => {
  switch (templateType) {
    case "analyze":
      return normalizeAnalyzeTemplate(data);
    case "build":
      return normalizeBuildTemplate(data);
    case "derive":
      return normalizeDeriveTemplate(data);
    case "explain":
      return normalizeExplainTemplate(data);
    case "explore":
      return normalizeExploreTemplate(data);
    case "revise":
      return normalizeReviseTemplate(data);
    default:
      return asRecord(data);
  }
};

export const normalizeDifficulty = (value: unknown, fallback: LabDifficulty = "intermediate"): LabDifficulty => {
  const normalized = asString(value).toLowerCase();
  if (normalized === "intro") return "beginner";
  if (DIFFICULTIES.has(normalized as LabDifficulty)) return normalized as LabDifficulty;
  return fallback;
};

export const normalizeEstimatedDuration = (value: unknown, fallback = 45): number =>
  clampDuration(asNumber(value, fallback));

export const normalizeTopics = (value: unknown, fallbackTopics: string[] = []): string[] => {
  const normalized = uniqueStrings([...toStringArray(value), ...fallbackTopics], 8);
  return normalized.length > 0 ? normalized : ["Practice"];
};
