import React from "react";
import { generateMeta } from "@/lib/utils";
import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";

import ModulesView from "@/components/modules/modules-view";

async function getPaths() {
  const data = await fs.readFile(
    path.join(process.cwd(), "app/(main)/paths/data/paths.json")
  );
  return JSON.parse(data.toString());
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paths = await getPaths();
  const learningPath = paths.find((p: any) => p.id === id);

  if (!learningPath) {
    return generateMeta({
      title: "The Lyceum Project - Path Not Found",
      description: "The requested learning path could not be found.",
      canonical: `/paths/${id}`
    });
  }

  return generateMeta({
    title: `The Lyceum Project - ${learningPath.title}`,
    description: learningPath.description || `Explore the modules in ${learningPath.title}`,
    canonical: `/paths/${id}`
  });
}

export default async function PathModulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paths = await getPaths();
  const learningPath = paths.find((p: any) => p.id === id);

  if (!learningPath) {
    notFound();
  }

  return <ModulesView path={learningPath} />;
}
