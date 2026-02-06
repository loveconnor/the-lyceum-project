"use client";

import { useOnboardingStore } from "@/app/onboarding/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

type StartingLevel = "new" | "familiar" | "comfortable" | null;

export function WorkPreferencesStep() {
  const { data, updateWorkPreferences, nextStep, markSkipped } = useOnboardingStore();
  const [selectedLevel, setSelectedLevel] = useState<StartingLevel>(data.workPreferences.experience as StartingLevel || null);

  const handleSelect = (level: StartingLevel) => {
    setSelectedLevel(level);
    if (level) {
      updateWorkPreferences({ experience: level });
    }
  };

  const handleSkip = () => {
    updateWorkPreferences({ experience: "adaptive" });
    markSkipped();
    nextStep();
  };

  const handleNext = () => {
    if (selectedLevel) {
      nextStep();
    }
  };

  const options = [
    {
      value: "new" as const,
      title: "New to this",
      description: "Start with the basics",
      icon: "+"
    },
    {
      value: "familiar" as const,
      title: "Some familiarity",
      description: "I know a few things",
      icon: "◐"
    },
    {
      value: "comfortable" as const,
      title: "Comfortable, want challenge",
      description: "Push me further",
      icon: "◉"
    }
  ];

  return (
    <div className="flex h-screen flex-col px-4 overflow-hidden relative">
      <div className="flex flex-col items-center justify-center flex-1">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-normal">Where are you starting today?</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {options.map((option) => (
              <Card
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg border-2
                  ${
                    selectedLevel === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }
                `}
              >
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center space-y-6 min-h-[220px]">
                    <div className={`
                      rounded-lg w-20 h-20 flex items-center justify-center transition-colors flex-shrink-0
                      ${selectedLevel === option.value ? "bg-primary/10" : "bg-muted"}
                    `}>
                      <span className="text-4xl">{option.icon}</span>
                    </div>
                    <div className="text-center space-y-2 flex-1 flex flex-col justify-start">
                      <h3 className="font-semibold text-lg">{option.title}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={handleNext}
              disabled={!selectedLevel}
              className="min-w-[200px] rounded-full disabled:opacity-50"
            >
              Continue
            </Button>
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Skip, I&apos;ll get started on my own
            </button>
          </div>
        </div>
      </div>
      </div>
  );
}
