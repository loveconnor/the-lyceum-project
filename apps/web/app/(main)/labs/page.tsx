import React from "react";
import { generateMeta } from "@/lib/utils";
import { promises as fs } from "fs";
import path from "path";

import Labs from "./labs";

async function getLabs() {
  const data = await fs.readFile(
    path.join(process.cwd(), "app/(main)/labs/data/labs.json")
  );
  return JSON.parse(data.toString());
}

export async function generateMetadata() {
  return generateMeta({
    title: "The Lyceum Project - Labs",
    description:
      "Hands-on learning labs to master web development concepts through practice. Built with shadcn/ui, Next.js and Tailwind CSS.",
    canonical: "/labs"
  });
}

export default async function Page() {
  const labs = await getLabs();

  return <Labs labs={labs} />;
}