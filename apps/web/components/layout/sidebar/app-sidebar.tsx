"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Clock3,
  Compass,
  FlaskConical,
  LayoutDashboard,
  Link as LinkIcon,
  NotebookPen,
  Sparkles,
  Target,
  Users
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useIsTablet } from "@/hooks/use-mobile";
import { useUserProfile } from "@/components/providers/user-provider";
import { getInitials } from "@/lib/user-profile";
import { createClient } from "@/utils/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavUser } from "./nav-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const isTablet = useIsTablet();
  const user = useUserProfile();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile, pathname]);

  useEffect(() => {
    setOpen(!isTablet);
  }, [isTablet, setOpen]);

  const userInitial = getInitials(user?.name, user?.email);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const menuButtonClass = "text-sm text-muted-foreground";

  return (
    <Sidebar className="overflow-hidden" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="hover:text-foreground h-10 group-data-[collapsible=icon]:px-0! hover:bg-[var(--primary)]/5">
              <span className="text-foreground font-semibold">The Lyceum Project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          <div className="space-y-4 p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={menuButtonClass}>
                      <Sparkles className="size-4" />
                      <span>AI Assistant</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive className={menuButtonClass}>
                      <LayoutDashboard className="size-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={menuButtonClass}>
                      <Compass className="size-4" />
                      <span>Learning Paths</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={menuButtonClass}>
                      <FlaskConical className="size-4" />
                      <span>Labs</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={menuButtonClass}>
                      <NotebookPen className="size-4" />
                      <span>Reflections</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={menuButtonClass}>
                      <Clock3 className="size-4" />
                      <span>Planner / Time Coach</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={menuButtonClass}>
                      <Target className="size-4" />
                      <span>Relevance Explorer</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={menuButtonClass}>
                      <Users className="size-4" />
                      <span>Community</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground h-4 pb-2 pt-1 text-xs">Quick Links</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={menuButtonClass}>
                      <LinkIcon className="size-4" />
                      <span>Start New Lab</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={menuButtonClass}>
                      <LinkIcon className="size-4" />
                      <span>Continue Reflection</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton className={menuButtonClass}>
                      <LinkIcon className="size-4" />
                      <span>View Goals</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <Card className="gap-4 overflow-hidden py-4 group-data-[collapsible=icon]:hidden">
          <CardHeader className="px-3">
            <CardTitle>Complete Onboarding</CardTitle>
            <CardDescription>
            Complete the quick checklist to tailor labs, reflections, and pacing to your goals.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3">
            <Button className="w-full" asChild>
              <Link href="/dashboard/onboarding" target="_blank">
                Go to Onboarding
              </Link>
            </Button>
          </CardContent>
        </Card>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
