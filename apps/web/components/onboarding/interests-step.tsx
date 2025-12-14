"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/app/onboarding/store";
import { Sparkles } from "lucide-react";

const interestOptions = [
  { name: "Technology", emoji: "💻" },
  { name: "Design", emoji: "🎨" },
  { name: "Science", emoji: "📈" },
  { name: "Math", emoji: "💰" },
  { name: "Writing", emoji: "🏥" },
  { name: "Psychology", emoji: "📚" },
  { name: "Education", emoji: "⚽" },
  { name: "Music", emoji: "✈️" },
  { name: "Histoy", emoji: "🍕" },
  { name: "Enviroment", emoji: "🎵" },
  { name: "Business", emoji: "🖼️" },
  { name: "Creativity", emoji: "📸" },
  { name: "Engineering", emoji: "✍️" },
  { name: "Logic", emoji: "🎮" },
  { name: "Language", emoji: "💪" },
  { name: "Philosphy", emoji: "👗" }
];

export function InterestsStep() {
  const { data, updateInterests, nextStep } = useOnboardingStore();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(data.interests);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleNext = () => {
    updateInterests(selectedInterests);
    nextStep();
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-3">
        <div className="bg-primary flex size-8 items-center justify-center rounded-full">
          <Sparkles className="text-primary-foreground size-4" />
        </div>
        <h1 className="text-2xl font-bold">What topics interest you most?</h1>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {interestOptions.map((interest) => (
            <div
              key={interest.name}
              className={`hover:border-primary cursor-pointer rounded-md border px-4 py-6 ${
                selectedInterests.includes(interest.name) ? "bg-primary/10 border-primary" : ""
              }`}
              onClick={() => toggleInterest(interest.name)}>
              <div className="space-y-2 text-center">
                <div className="text-2xl">{interest.emoji}</div>
                <div>{interest.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-end">
        <Button size="lg" onClick={handleNext} disabled={selectedInterests.length === 0}>
          Continue ({selectedInterests.length} selected)
        </Button>
      </div>
    </div>
  );
}
