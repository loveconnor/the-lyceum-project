import type { LearningPath, Module, PathItem } from "@/app/(main)/paths/types";
import type { Lab } from "@/app/(main)/labs/types";

export type AIConstraintContext = "path" | "module" | "lab";

const DEFAULT_CONSTRAINTS: Record<AIConstraintContext, string> = {
  path: "Designed for ~30 min/day.",
  module: "Will not introduce new prerequisites.",
  lab: "Assumes basic familiarity with the topic."
};

const normalizeConstraint = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const formatMinutes = (minutes: number): string => {
  const rounded = Math.max(1, Math.round(minutes));
  return `${rounded} min`;
};

type ConstraintSource = {
  generation_constraint?: string | null;
  ai_constraint?: string | null;
  constraint?: string | null;
  assumption?: string | null;
};

const extractConstraint = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as ConstraintSource;
  return normalizeConstraint(
    source.generation_constraint ??
      source.ai_constraint ??
      source.constraint ??
      source.assumption
  );
};

export function resolveAIConstraintText({
  explicit,
  context,
  estimatedDuration
}: {
  explicit?: string | null;
  context: AIConstraintContext;
  estimatedDuration?: number | null;
}): string {
  const normalized = normalizeConstraint(explicit);
  if (normalized) return normalized;

  if (context === "lab" && typeof estimatedDuration === "number" && Number.isFinite(estimatedDuration)) {
    return `Designed for ~${formatMinutes(estimatedDuration)}.`;
  }

  return DEFAULT_CONSTRAINTS[context];
}

export function getPathConstraint(path: LearningPath): string {
  const explicit = extractConstraint(path);
  return resolveAIConstraintText({
    explicit,
    context: "path",
    estimatedDuration: path.estimated_duration
  });
}

export function getModuleConstraint(module: Module | PathItem): string {
  const explicit = extractConstraint(module) ?? extractConstraint(module.content_data);
  return resolveAIConstraintText({
    explicit,
    context: "module"
  });
}

export function getLabConstraint(lab: Lab): string {
  const explicit = extractConstraint(lab) ?? extractConstraint(lab.template_data);
  return resolveAIConstraintText({
    explicit,
    context: "lab",
    estimatedDuration: lab.estimated_duration
  });
}
