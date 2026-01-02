import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Metadata } from "next"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface MetaOptions {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
}

export function generateMeta(options: MetaOptions): Metadata {
  const { title, description, canonical, image } = options;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thelyceum.dev";
  
  return {
    title,
    description,
    ...(canonical && {
      alternates: {
        canonical: `${baseUrl}${canonical}`,
      },
    }),
    openGraph: {
      title,
      description,
      url: canonical ? `${baseUrl}${canonical}` : baseUrl,
      siteName: "The Lyceum Project",
      ...(image && { images: [image] }),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export function extractJSON<T>(text: string): T {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  return JSON.parse(cleaned) as T;
}
