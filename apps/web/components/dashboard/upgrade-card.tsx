"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@lyceum/ui/ui/button";
import Link from "next/link";

export function UpgradeCard() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
      <div className="relative space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">Finish your onboarding</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Complete the quick checklist to tailor labs, reflections, and pacing to your goals.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center gap-1.5 text-sm min-h-9"
          render={<Link href="/onboarding" rel="noopener noreferrer">
            Go to onboarding
            <ArrowRight className="size-3.5" />
          </Link>}
        >
          <Link href="/onboarding" rel="noopener noreferrer">
            Go to onboarding
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
