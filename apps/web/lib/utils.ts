import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Metadata } from "next";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`
}
export function generateMeta({
  title,
  description,
  canonical
}: {
  title: string;
  description: string;
  canonical: string;
}): Metadata {
  return {
    title: `${title}`,
      description: description,
      metadataBase: new URL(`https://shadcnuikit.com`),
    alternates: {
      canonical: `/dashboard${canonical}`
    },
    openGraph: {
      images: [`/images/seo.jpg`]
    }
  };
}