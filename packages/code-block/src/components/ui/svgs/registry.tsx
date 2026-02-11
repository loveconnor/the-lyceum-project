import type { FC, SVGProps } from "react";

import { Astro } from "./astro";
import { BaseUI } from "./base-ui";
import { CodeFile } from "./code-file";
import { GitHub } from "./github";
import { Java } from "./java";
import { Nextjs } from "./nextjs";
import { RadixUI } from "./radix-ui";
import { ReactRouter } from "./react-router";
import { React } from "./react";
import { ShadcnUI } from "./shadcn";
import { Shiki } from "./shiki";
import { SugarHigh } from "./sugar-high";
import { Vite } from "./vite";
import { XformerlyTwitter } from "./twitter";

type IconComponent = FC<SVGProps<SVGSVGElement>>;

const ICON_BY_KEY: Record<string, IconComponent> = {
  astro: Astro,
  "base-ui": BaseUI,
  code: CodeFile,
  "code-file": CodeFile,
  github: GitHub,
  java: Java,
  next: Nextjs,
  nextjs: Nextjs,
  radix: RadixUI,
  "radix-ui": RadixUI,
  react: React,
  "react-router": ReactRouter,
  shadcn: ShadcnUI,
  shiki: Shiki,
  sugarhigh: SugarHigh,
  "sugar-high": SugarHigh,
  vite: Vite,
  x: XformerlyTwitter,
  twitter: XformerlyTwitter,
};

const LANGUAGE_TO_ICON_KEY: Record<string, string> = {
  astro: "astro",
  bash: "code",
  css: "code",
  go: "code",
  html: "code",
  java: "java",
  javascript: "code",
  js: "code",
  json: "code",
  jsx: "react",
  md: "code",
  markdown: "code",
  mdx: "code",
  py: "code",
  python: "code",
  react: "react",
  "react-router": "react-router",
  sh: "code",
  shell: "code",
  ts: "code",
  tsx: "react",
  typescript: "code",
  xml: "code",
  yml: "code",
  yaml: "code",
  zsh: "code",
};

// Add new SVGs to ICON_BY_KEY and map language aliases in LANGUAGE_TO_ICON_KEY.

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]/g, "");

const resolveCodeBlockIcon = (language?: string): IconComponent => {
  if (!language) return CodeFile;

  const normalized = normalize(language);
  const mapped = LANGUAGE_TO_ICON_KEY[normalized] ?? normalized;
  return ICON_BY_KEY[mapped] ?? CodeFile;
};

export { resolveCodeBlockIcon };
