"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/app/onboarding/store";
import { User, Briefcase, BookOpen, Sparkles, Brain, InfinityIcon, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const accountTypes = [
  {
    id: "personal_growth",
    title: "Personal Growth",
    description: "Learn new skills and explore knowledge for yourself",
    icon: User,
    emoji: "🌱",
    features: [
      "Personalized learning path",
      "Self-paced progress",
      "Reflective feedback"
    ],
    color: "from-green-500 to-emerald-500"
  },
  {
    id: "career_goals",
    title: "Career Goals",
    description: "Build skills that support your professional future",
    icon: Briefcase,
    emoji: "💼",
    features: [
      "Skill-based labs",
      "Practical applications",
      "Achievement tracking"
    ],
    color: "from-blue-500 to-indigo-500"
  },
  {
    id: "school_support",
    title: "School Support",
    description: "Strengthen your understanding of class subjects",
    icon: BookOpen,
    emoji: "🎓",
    features: [
      "Subject-specific practice",
      "Homework-style challenges",
      "Concept mastery reports"
    ],
    color: "from-yellow-500 to-amber-500"
  },
  {
    id: "curiosity",
    title: "Curiosity",
    description: "Learn simply for the joy of discovering something new",
    icon: Sparkles,
    emoji: "💡",
    features: [
      "Open exploration paths",
      "Adaptive topic suggestions",
      "Fun experimental labs"
    ],
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "skill_improvement",
    title: "Skill Improvement",
    description: "Enhance your focus, time, and study habits",
    icon: Brain,
    emoji: "🧠",
    features: [
      "Time coach analytics",
      "Habit-building reflections",
      "Goal tracking support"
    ],
    color: "from-orange-500 to-red-500"
  },
  {
    id: "lifelong_learning",
    title: "Lifelong Learning",
    description: "Keep growing and exploring at your own pace",
    icon: InfinityIcon,
    emoji: "🔁",
    features: [
      "Ever-expanding content",
      "Long-term progress history",
      "Cross-topic integration"
    ],
    color: "from-teal-500 to-cyan-500"
  }
];

export function AccountTypeStep() {
  const supabase = createClient();
  const router = useRouter();
  const { data, updateAccountType, prevStep, reset } = useOnboardingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!data.accountType) return;
    setIsSubmitting(true);
    try {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();
      if (error || !user) throw new Error(error?.message || "You must be signed in.");

      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        onboarding_complete: true,
        onboarding_data: data
      });
      if (upsertError) throw new Error(upsertError.message);

      toast.success("Onboarding complete!");
      reset();
      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Unable to finish onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-3">
        <div className="bg-primary flex size-8 items-center justify-center rounded-full">
          <Briefcase className="text-primary-foreground size-4" />
        </div>
        <h1 className="text-2xl font-bold">How will you use Lyceum?</h1>
      </div>

      <div className="space-y-6">
        <RadioGroup
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
          value={data.accountType}
          onValueChange={(value) => updateAccountType(value)}>
          {accountTypes.map((type) => {
            return (
              <div key={type.id} className="relative">
                <RadioGroupItem value={type.id} id={type.id} className="peer sr-only" />
                <Label
                  htmlFor={type.id}
                  className="peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:border-primary hover:border-primary flex cursor-pointer flex-col items-start space-y-2 rounded-md border px-4 py-6">
                  <div className="text-3xl">{type.emoji}</div>
                  <h3 className="text-xl font-bold">{type.title}</h3>
                  <p className="text-muted-foreground">{type.description}</p>
                  <ul className="text-muted-foreground list-inside list-disc space-y-2">
                    {type.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
          Back
        </Button>
        <Button size="lg" onClick={handleSubmit} disabled={!data.accountType || isSubmitting}>
          {isSubmitting ? "Finishing..." : "Finish"}
        </Button>
      </div>
    </div>
  );
}
