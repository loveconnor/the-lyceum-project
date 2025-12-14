"use client";

import { Briefcase } from "lucide-react";
import { useOnboardingStore } from "@/app/onboarding/store";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function WorkPreferencesStep() {
  const { data, updateWorkPreferences, nextStep, prevStep } = useOnboardingStore();

  const handleNext = () => {
    const { workStyle, experience, availability } = data.workPreferences;
    if (workStyle && experience && availability) {
      nextStep();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-3">
        <div className="bg-primary flex size-8 items-center justify-center rounded-full">
          <Briefcase className="text-primary-foreground size-4" />
        </div>
        <h1 className="text-2xl font-bold">Tell us how you like to learn</h1>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="font-medium">Preferred learning mode</div>
          <RadioGroup
            value={data.workPreferences.workStyle}
            onValueChange={(value) => updateWorkPreferences({ workStyle: value })}
            className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { value: "self-guided", label: "Self-guided", desc: "I like to explore topics on my own", icon: "🏠" },
              { value: "structured", label: "Structured", desc: "I prefer clear paths with small steps", icon: "🔄" },
              {
                value: "collaborative",
                label: "Collaborative",
                desc: "I like learning with others or group feedback",
                icon: "🏢"
              }
            ].map((option) => (
              <div key={option.value} className="relative">
                <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                <Label
                  htmlFor={option.value}
                  className="peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:border-primary hover:border-primary flex cursor-pointer flex-col items-center justify-center rounded-md border p-4 text-base">
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-muted-foreground text-center text-sm">{option.desc}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <div className="font-medium">Learning experience / Comfort level</div>
          <RadioGroup
            value={data.workPreferences.experience}
            onValueChange={(value) => updateWorkPreferences({ experience: value })}
            className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { value: "beginner", label: "Beginner", desc: "I’m new to most topics", icon: "🌱" },
              { value: "intermediate", label: "Intermediate", desc: "I’ve done some self‑learning or coursework", icon: "🚀" },
              { value: "experienced", label: "Experienced", desc: "I’m comfortable with advanced material", icon: "⭐" }
            ].map((option) => (
              <div key={option.value} className="relative">
                <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                <Label
                  htmlFor={option.value}
                  className="peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:border-primary hover:border-primary flex cursor-pointer flex-col items-center justify-center rounded-md border p-4 text-base">
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-muted-foreground text-center text-sm">{option.desc}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <div className="font-medium">Time commitment</div>
          <RadioGroup
            value={data.workPreferences.availability}
            onValueChange={(value) => updateWorkPreferences({ availability: value })}
            className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { value: "daily-learner", label: "Daily learner", desc: "I study almost every day", icon: "⏰" },
              {
                value: "A-few-times-a-week",
                label: "A few times a week",
                desc: "I learn in short sessions",
                icon: "⏳"
              },
              { value: "flexible", label: "Flexible", desc: "I jump in whenever I can", icon: "📋" }
            ].map((option) => (
              <div key={option.value} className="relative">
                <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                <Label
                  htmlFor={option.value}
                  className="peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:border-primary hover:border-primary flex cursor-pointer flex-col items-center justify-center rounded-md border p-4 text-base">
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-muted-foreground text-center text-sm">{option.desc}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep}>
            Back
          </Button>
          <Button size="lg" onClick={handleNext}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
