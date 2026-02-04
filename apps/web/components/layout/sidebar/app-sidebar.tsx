"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { useIsTablet } from "@/hooks/use-mobile";
import { useUserProfile } from "@/components/providers/user-provider";
import { getInitials } from "@/lib/user-profile";
import { createClient } from "@/utils/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavUser } from "./nav-user";
import Link from "next/link";
import { SIDEBAR_ITEMS } from "@/lib/settings";
import { useUserSettings } from "@/components/providers/settings-provider";
import logo from "../logo.png"
import Image from "next/image";
import { useI18n } from "@/components/providers/i18n-provider";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const isTablet = useIsTablet();
  const user = useUserProfile();
  const { settings } = useUserSettings();
  const { t } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile, pathname]);

  useEffect(() => {
    setOpen(!isTablet);
  }, [isTablet, setOpen]);

  const userInitial = getInitials(user?.name, user?.email);
  const visibleItems = SIDEBAR_ITEMS.filter((item) =>
    settings.display.sidebarItems.includes(item.id)
  );
  const primaryItems = visibleItems.filter((item) => item.group === "primary");
  const quickLinks = visibleItems.filter((item) => item.group === "quick_links");
  const hasAssistant = primaryItems.some((item) => item.id === "ai_assistant");
  const otherPrimary = primaryItems.filter((item) => item.id !== "ai_assistant");

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
            <SidebarMenuButton size="lg" className="hover:bg-[var(--primary)]/5">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                <Image src={logo} alt="Logo" className="h-5 w-5 dark:invert" width={20} height={20} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="text-foreground font-semibold">{t("app.name")}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          <div className="space-y-4 py-3">
            {hasAssistant && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {primaryItems
                      .filter((item) => item.id === "ai_assistant")
                      .map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            className={menuButtonClass}
                            asChild={Boolean(item.href)}>
                            {item.href ? (
                              <Link href={item.href}>
                                <item.icon className="size-4" />
                                <span>{t(item.labelKey)}</span>
                              </Link>
                            ) : (
                              <>
                                <item.icon className="size-4" />
                                <span>{t(item.labelKey)}</span>
                              </>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {hasAssistant && <SidebarSeparator />}

            {otherPrimary.length > 0 && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {otherPrimary.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={item.href ? pathname === item.href : false}
                          className={menuButtonClass}
                          asChild={Boolean(item.href)}>
                          {item.href ? (
                            <Link href={item.href}>
                              <item.icon className="size-4" />
                              <span>{t(item.labelKey)}</span>
                            </Link>
                          ) : (
                            <>
                              <item.icon className="size-4" />
                              <span>{t(item.labelKey)}</span>
                            </>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

          </div>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        {/*
        <Card className="gap-4 overflow-hidden py-4 group-data-[collapsible=icon]:hidden">
          <CardHeader className="px-3">
            <CardTitle>Complete Onboarding</CardTitle>
            <CardDescription>
            Complete the quick checklist to tailor labs, reflections, and pacing to your goals.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3">
            <Button className="w-full" asChild>
              <Link href="/onboarding">Go to Onboarding</Link>
            </Button>
          </CardContent>
        </Card>
        */}
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
