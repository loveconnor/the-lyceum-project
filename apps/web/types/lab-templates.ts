/**
 * Type definitions for AI-generated lab templates
 * These interfaces define the structure that AI should generate when creating labs
 */

// ============= ANALYZE TEMPLATE =============
export interface AnalyzeLabData {
  labTitle: string;
  description: string;
  dataset: {
    name: string;
    columns: Array<{
      key: string;
      label: string;
      type: "number" | "string" | "date";
    }>;
    rows: Record<string, string | number>[];
  };
  availableVariables: string[];
  guidingQuestions: {
    question: string;
    patterns: string;
    conclusions: string;
    limitations: string;
  };
}

// ============= BUILD TEMPLATE =============
export interface BuildLabData {
  labTitle: string;
  description: string;
  problemStatement?: string;
  initialCode: string;
  language: "javascript" | "typescript" | "python" | "java" | "cpp";
  testCases: Array<{
    id: string;
    input: string;
    expectedOutput: string;
    description?: string;
    stepId?: string; // Associates test with a specific step
  }>;
  hints?: Array<{
    stepId: string;
    hint: string;
  }>;
  stepPrompts?: {
    understand: string;
    design: string;
    test: string;
    explain: string;
  };
  // AI-generated structured steps like Explain template
  steps?: Array<{
    id: string;
    title: string;
    instruction?: string;
    keyQuestions?: string[];
    prompt?: string;
  }>;
}

// ============= DERIVE TEMPLATE =============
export interface DeriveLabData {
  labTitle: string;
  description: string;
  problemStatement: string;
  availableRules: Array<{
    id: string;
    name: string;
    formula: string;
    category?: string;
  }>;
  initialStep?: {
    expression: string;
    justification: string;
  };
  expectedSteps?: number;
  verificationHints?: string[];
  conceptCheck?: {
    question: string;
    explanation?: string;
  };
  steps?: Array<{
    id: string;
    title: string;
    widgets?: Array<{
      type: "text-input" | "multiple-choice" | "derivation-steps";
      config: any;
    }>;
  }>;
}

// ============= EXPLAIN TEMPLATE =============
export interface ExplainLabData {
  labTitle: string;
  description: string;
  artifactCode?: string;
  artifact?: {
    code: string;
    language: "javascript" | "typescript" | "python" | "java" | "cpp";
  };
  language?: "javascript" | "typescript" | "python" | "java" | "cpp";
  guidingQuestions?: {
    whatDoesItDo: string;
    edgeCases: string[];
    complexity: {
      time: string;
      space: string;
    };
  };
  keyQuestions?: {
    read?: string[];
    predict?: string[];
    explain?: string[];
    edgeCases?: string[];
  };
  steps?: Array<{
    id: string;
    title: string;
    instruction?: string;
    keyQuestions?: string[];
    prompt?: string;
  }>;
  learningObjectives?: string[];
}

// ============= EXPLORE TEMPLATE =============
export interface ExploreLabData {
  labTitle: string;
  description: string;
  parameters: Array<{
    id: string;
    label: string;
    unit?: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    hint?: string;
  }>;
  simulationFormula?: string;
  expectedInsights: string[];
  guidingQuestions: string[];
}

// ============= REVISE TEMPLATE =============
export interface ReviseLabData {
  labTitle: string;
  description: string;
  initialDraft: string;
  targetAudience: string;
  purpose: string;
  rubricCriteria: Array<{
    id: string;
    name: string;
    description: string;
    guidanceQuestion: string;
    hint: string;
  }>;
  improvementAreas: string[];
}

// ============= UNIFIED LAB TYPE =============
export type LabTemplateType = "analyze" | "build" | "derive" | "explain" | "explore" | "revise";

export interface UnifiedLabData {
  type: LabTemplateType;
  data: AnalyzeLabData | BuildLabData | DeriveLabData | ExplainLabData | ExploreLabData | ReviseLabData;
  metadata: {
    createdAt: string;
    estimatedDuration?: number; // in minutes
    difficulty?: "beginner" | "intermediate" | "advanced";
    topics?: string[];
  };
  // Dynamic steps for templates that support them
  steps?: Array<{
    id: string;
    title: string;
    instruction?: string;
    keyQuestions?: string[];
    prompt?: string;
  }>;
}
