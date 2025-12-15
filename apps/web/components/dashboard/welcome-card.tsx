"use client";

import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/components/providers/user-provider";
import { useUserSettings } from "@/components/providers/settings-provider";

export function WelcomeCard() {
  const user = useUserProfile();
  const { settings } = useUserSettings();
  const displayName =
    settings.account.name || settings.profile.username || user?.name || "there";
  const firstName = displayName.split(" ")[0] || "there";

  return (
    <Card className="overflow-hidden">
      <CardContent className="relative">
        <div className="grid items-center pt-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="font-display text-3xl">
              Hi, {firstName} <span className="text-4xl">{"\u{1F44B}"}</span>
            </div>
            <div className="text-2xl">What do you want to learn today with your partner?</div>
            <div className="text-muted-foreground">
              Discover courses, track progress, and achieve your learning goods seamlessly.
            </div>
            <div className="pt-2">
              <Button>Explorer Course</Button>
            </div>
          </div>
          <figure className="hidden lg:col-span-1 lg:block">
            <Image
              width={100}
              height={50}
              src={`/academy-dashboard-light.svg`}
              className="block h-auto w-full dark:hidden"
              loading="eager"
              style={{ width: "auto", height: "auto" }}
              unoptimized
              alt="shadcn/ui"
            />
            <Image
              width={100}
              height={50}
              src={`/academy-dashboard-dark.svg`}
              className="hidden h-auto w-full dark:block"
              loading="eager"
              style={{ width: "auto", height: "auto" }}
              unoptimized
              alt="shadcn/ui"
            />
          </figure>
          <Image
            fill
            src={`/star-shape.png`}
            className="pointer-events-none absolute inset-0 object-contain"
            priority
            loading="eager"
            sizes="100vw"
            unoptimized
            alt="shadcn/ui"
          />
        </div>
      </CardContent>
    </Card>
  );
}
