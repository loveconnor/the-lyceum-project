import React from "react";
import { generateMeta } from "@/lib/utils";
import Labs from "./labs";

export async function generateMetadata() {
  return generateMeta({
    title: "The Lyceum Project - Labs",
    description:
      "Hands-on learning labs to master web development concepts through practice. Built with shadcn/ui, Next.js and Tailwind CSS.",
    canonical: "/labs"
  });
}

export default async function Page() {
  // Labs will be fetched client-side from the API
  return <Labs />;
}