import React from "react";
import { cookies } from "next/headers";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SiteHeader } from "@/components/layout/header";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_USER_PROFILE, mapUserToProfile } from "@/lib/user-profile";
import { UserProvider } from "@/components/providers/user-provider";
import { coerceSettings } from "@/lib/settings";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { FontApplier } from "@/components/font-applier";
import { I18nBridge } from "@/components/providers/i18n-bridge";

export default async function MainLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const supabase = await createClient();
  let userProfile = DEFAULT_USER_PROFILE;
  let userSettings = coerceSettings();

  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    userProfile = mapUserToProfile(user);
    userSettings = coerceSettings((user as any)?.user_metadata?.settings);

    if (user) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const resolvedName =
        profileRow?.full_name ||
        [profileRow?.first_name, profileRow?.last_name].filter(Boolean).join(" ") ||
        userSettings.account.name ||
        userProfile.name;

      userSettings.profile.email =
        userSettings.profile.email || profileRow?.email || userProfile.email || "";
      userSettings.profile.username =
        userSettings.profile.username || resolvedName || userProfile.name;
      userSettings.profile.avatarUrl =
        userSettings.profile.avatarUrl || profileRow?.avatar_url || userProfile.avatarUrl;
      userSettings.account.name = userSettings.account.name || resolvedName || userProfile.name;
    } else {
      userSettings.profile.email = userSettings.profile.email || userProfile.email || "";
      userSettings.profile.username = userSettings.profile.username || userProfile.name;
      userSettings.profile.avatarUrl = userSettings.profile.avatarUrl || userProfile.avatarUrl;
      userSettings.account.name = userSettings.account.name || userProfile.name;
    }
  } catch (error) {
    console.error("Failed to load user profile", error);
  }
  const defaultOpen =
    cookieStore.get("sidebar_state")?.value === "true" ||
    cookieStore.get("sidebar_state") === undefined;

  return (
    <UserProvider user={userProfile}>
      <SettingsProvider initialSettings={userSettings}>
        <I18nBridge>
          <FontApplier />
          <SidebarProvider
            defaultOpen={defaultOpen}
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 64)",
                "--header-height": "calc(var(--spacing) * 14)",
                "--content-padding": "calc(var(--spacing) * 4)",
                "--content-margin": "calc(var(--spacing) * 1.5)",
                "--content-full-height":
                  "calc(100vh - var(--header-height) - (var(--content-padding) * 2) - (var(--content-margin) * 2))"
              } as React.CSSProperties
            }>
            <AppSidebar variant="inset" />
            <SidebarInset>
              <SiteHeader />
              <div className="bg-muted/50 flex flex-1 flex-col">
                <div className="@container/main p-[var(--content-padding)] xl:group-data-[theme-content-layout=centered]/layout:container xl:group-data-[theme-content-layout=centered]/layout:mx-auto">
                  {children}
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </I18nBridge>
      </SettingsProvider>
    </UserProvider>
  );
}
