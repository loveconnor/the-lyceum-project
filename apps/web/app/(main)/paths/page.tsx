import React from "react";
import { generateMeta } from "@/lib/utils";
import { promises as fs } from "fs";
import path from "path";

import Paths from "./paths";

async function getPaths() {
  const data = await fs.readFile(
    path.join(process.cwd(), "app/(main)/paths/data/paths.json")
  );
  return JSON.parse(data.toString());
}

export async function generateMetadata() {
  return generateMeta({
    title: "The Lyceum Project - Learning Paths",
    description:
      "Structured learning paths to guide your curriculum. Choose your path and progress through organized modules and labs. Built with shadcn/ui, Next.js and Tailwind CSS.",
    canonical: "/paths"
  });
}

export default async function Page() {
  const paths = await getPaths();

  return <Paths paths={paths} />;
}