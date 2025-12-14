import Onboarding from "@/components/onboarding/onboarding";
import { generateMeta } from "@/lib/utils";

export async function generateMetadata() {
  return generateMeta({
    title: "Onboarding Flow",
    description:
      "Onboarding flow screens are a step-by-step process that asks users questions to personalize their experience.",
    canonical: "/onboarding"
  });
}

export default function Page() {
  return <Onboarding />;
}
