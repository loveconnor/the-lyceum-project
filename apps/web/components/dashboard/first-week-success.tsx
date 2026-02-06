"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import {
  FIRST_WEEK_LOOP_NAME,
  FIRST_WEEK_LOOP_NOTE,
  FIRST_WEEK_LOOP_SUBTITLE
} from "./first-week-copy";

export type FirstWeekStatus = {
  onboarding_complete: boolean;
  module_completed: boolean;
  lab_completed: boolean;
  reflection_written: boolean;
};

type StepDefinition = {
  key: keyof FirstWeekStatus;
  label: string;
  shortLabel: string;
  href: string;
};

const steps: StepDefinition[] = [
  {
    key: "onboarding_complete",
    label: "Complete onboarding",
    shortLabel: "Onboarding",
    href: "/onboarding"
  },
  {
    key: "module_completed",
    label: "Finish 1 module",
    shortLabel: "Module",
    href: "/paths"
  },
  {
    key: "lab_completed",
    label: "Complete 1 lab",
    shortLabel: "Lab",
    href: "/labs"
  },
  {
    key: "reflection_written",
    label: "Write 1 reflection",
    shortLabel: "Reflection",
    href: "/reflections"
  }
];

export function FirstWeekSuccessLoop({ status }: { status: FirstWeekStatus }) {
  const hideKey = "lyceum_hide_getting_started_plan";
  const completedCount = steps.filter((step) => status[step.key]).length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const nextStep = steps.find((step) => !status[step.key]);
  const allComplete = completedCount === steps.length;
  const [isHiddenOverride, setIsHiddenOverride] = useState(false);
  const isHiddenFromStore = useSyncExternalStore(
    () => () => undefined,
    () => {
      if (!allComplete) return false;
      try {
        return window.localStorage.getItem(hideKey) === "1";
      } catch (error) {
        console.error("Failed to read getting-started visibility", error);
        return false;
      }
    },
    () => false
  );
  const isHidden = isHiddenFromStore || isHiddenOverride;

  const handleHide = () => {
    if (!allComplete) return;
    try {
      window.localStorage.setItem(hideKey, "1");
      setIsHiddenOverride(true);
    } catch (error) {
      console.error("Failed to hide getting-started plan", error);
    }
  };

  if (allComplete && isHidden) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg">
          {FIRST_WEEK_LOOP_NAME}
        </CardTitle>
        <CardDescription>{FIRST_WEEK_LOOP_SUBTITLE}</CardDescription>
        <CardAction>
          {nextStep ? (
            <Link href={nextStep.href}>
              <Button size="sm" variant="outline">
                Start {nextStep.shortLabel}
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="ghost" onClick={handleHide}>
              Hide
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {completedCount} of {steps.length} complete
          </span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <div className="space-y-2">
          {steps.map((step) => {
            const isComplete = status[step.key];
            const StatusIcon = isComplete ? CheckCircle2 : Circle;
            return (
              <Link
                key={step.key}
                href={step.href}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
                  isComplete ? "bg-muted/30" : "hover:bg-muted/30"
                )}>
                <div className="flex items-center gap-3">
                  <StatusIcon
                    className={cn(
                      "size-4",
                      isComplete ? "text-emerald-600" : "text-muted-foreground"
                    )}
                  />
                  <span className="font-medium">{step.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{step.shortLabel}</span>
              </Link>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground">{FIRST_WEEK_LOOP_NOTE}</div>
      </CardContent>
    </Card>
  );
}
