"use client";

import { Download, Plus, Github } from "lucide-react";
import { Button } from "@lyceum/ui/ui/button";
import { SidebarTrigger } from "@lyceum/ui/ui/sidebar";
import { ThemeToggle } from "../theme-switcher";  
import Link from "next/link";
import type { DashboardUser } from "@/types/user";
import { signout } from "@/app/auth/actions";

type DashboardHeaderProps = {
  user: DashboardUser;
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <div className="w-full sticky top-0 z-10 border-b border-border bg-background px-3 py-2.5 sm:px-4 sm:py-3 md:px-7">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
        <SidebarTrigger className="shrink-0" />
          <div className="space-y-1 min-w-0">
        <h1 className="text-base sm:text-xl md:text-2xl font-medium text-foreground truncate">
              Welcome back, {user.name} 👋
        </h1>
            <p className="text-sm text-muted-foreground truncate">
              Today’s Focus: Completing your active lab • Next reflection due Friday 2pm
            </p>
          </div>
      </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-2">
            <Button size="default" className="gap-2 min-h-10 px-4">
            <Plus className="size-4" />
              <span className="hidden xl:inline">Start New Goal</span>
          </Button>
        </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-10 w-10"
            render={
              <Link
            href="https://github.com/loveconnor/the-lyceum-project"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="size-4" />
              </Link>
            }
          ></Button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}