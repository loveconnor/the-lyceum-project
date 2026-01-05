"use client";

import { InterestsStep } from "./interests-step";
import { WorkPreferencesStep } from "./starting-point-step";
import { AccountTypeStep } from "./ready-step";

import { useOnboardingStore } from "@/app/onboarding/store";
import { trackEvent } from "@/lib/analytics";
import { ANALYTICS_CONFIG } from "@/lib/analytics/config";
import React from "react";
const steps = [InterestsStep, WorkPreferencesStep, AccountTypeStep];

export default function Onboarding() {
  const { currentStep, markStarted, startedAt } = useOnboardingStore();
  const CurrentStepComponent = steps[currentStep];

  React.useEffect(() => {
    const now = Date.now();
    markStarted(now);

    if (!startedAt) {
      trackEvent("onboarding_started", {
        onboarding_version: ANALYTICS_CONFIG.onboardingVersion
      });
    }
  }, [markStarted, startedAt]);

  return (
    <div className="mx-auto max-w-3xl lg:pt-10">
      <CurrentStepComponent />
    </div>
  );
}
