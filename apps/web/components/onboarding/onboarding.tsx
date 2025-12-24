"use client";

import { InterestsStep } from "./interests-step";
import { WorkPreferencesStep } from "./starting-point-step";
import { AccountTypeStep } from "./ready-step";

import { useOnboardingStore } from "@/app/onboarding/store";

const steps = [InterestsStep, WorkPreferencesStep, AccountTypeStep];

export default function Onboarding() {
  const { currentStep } = useOnboardingStore();
  const CurrentStepComponent = steps[currentStep];

  return (
    <div className="mx-auto max-w-3xl lg:pt-10">
      <CurrentStepComponent />
    </div>
  );
}
