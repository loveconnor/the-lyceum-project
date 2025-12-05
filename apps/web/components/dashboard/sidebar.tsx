"use client";

import { useState } from "react";
import {
  Search,
  Bell,
  Sparkles,
  LayoutDashboard,
  Compass,
  FlaskConical,
  NotebookPen,
  Clock3,
  Target,
  Users,
  Link as LinkIcon,
  Folder,
  ChevronDown,
  MessageSquare,
  Settings,
  HelpCircle,
  Plus,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@lyceum/ui/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyceum/ui/ui/dropdown-menu";
import { Button } from "@lyceum/ui/ui/button";
import { Input } from "@lyceum/ui/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lyceum/ui/ui/collapsible";
import { Kbd } from "@lyceum/ui/ui/kbd";
import { cn } from "@lyceum/ui/lib/utils";
import { UpgradeCard } from "./upgrade-card";
import { Avatar, AvatarFallback, AvatarImage } from "@lyceum/ui/ui/avatar";
import type { DashboardUser } from "@/types/user";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export function DashboardSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: DashboardUser }) {
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const userInitial = user.name?.charAt(0)?.toUpperCase() || "U";
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Sidebar
      className="lg:border-r-0! overflow-hidden"
      collapsible="offcanvas"
      {...props}
    >
      <SidebarHeader className="pb-0 overflow-x-hidden">
        <div className="px-2 py-3">
          <div className="flex items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center justify-between gap-3 h-auto p-0 hover:bg-transparent w-full"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                      <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold leading-none">{user.name}</span>
                      {user.email && (
                        <span className="text-xs text-muted-foreground leading-tight">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="start">
                <DropdownMenuItem>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 text-sm text-muted-foreground"
                  >
                    <span className="flex-1 text-left">Logout</span>
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground z-10" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8 pr-8 h-8 text-sm text-muted-foreground placeholder:text-muted-foreground tracking-[-0.42px] bg-background"
            />
            <div className="flex items-center gap-0.5 rounded border border-border bg-sidebar px-1.5 py-0.5 shrink-0 absolute right-2 top-1/2 -translate-y-1/2">
              <span className="text-[10px] font-medium text-muted-foreground leading-none tracking-[-0.1px]">
                ⌘
              </span>
              <Kbd className="h-auto min-w-0 px-0 py-0 text-[10px] leading-none tracking-[-0.1px] bg-transparent border-0">
                K
              </Kbd>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
                  <Bell className="size-4" />
                  <span>Notifications</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
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
                <SidebarMenuButton
                  isActive
                  className="text-sm text-muted-foreground"
                >
                  <LayoutDashboard className="size-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
                  <Compass className="size-4" />
                  <span>Learning Paths</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
                  <FlaskConical className="size-4" />
                  <span>Labs</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
                  <NotebookPen className="size-4" />
                  <span>Reflections</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
                  <Clock3 className="size-4" />
                  <span>Planner / Time Coach</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
                  <Target className="size-4" />
                  <span>Relevance Explorer</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
                  <Users className="size-4" />
                  <span>Community</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
                  <LinkIcon className="size-4" />
                  <span>Instructor</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="h-4 pb-2 pt-1 text-xs text-muted-foreground">
            Quick Links
          </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
                      <Folder className="size-4" />
                  <span>Start New Lab</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
                      <Folder className="size-4" />
                  <span>Continue Reflection</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                <SidebarMenuButton className="text-sm text-muted-foreground">
                      <Folder className="size-4" />
                  <span>View Goals</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 overflow-x-hidden">
        <UpgradeCard />
        <div className="space-y-1 mb-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="text-sm text-muted-foreground">
                <MessageSquare className="size-4" />
                <span>Feedback</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton className="text-sm text-muted-foreground">
                <Settings className="size-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton className="text-sm text-muted-foreground">
                <HelpCircle className="size-4" />
                <span>Help Center</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}