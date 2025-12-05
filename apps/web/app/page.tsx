import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { SidebarProvider } from "@lyceum/ui/ui/sidebar";
import { createClient } from "@/utils/supabase/server";
import type { DashboardUser } from "@/types/user";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const dashboardUser: DashboardUser = {
    name:
      profile?.full_name ||
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email,
    avatarUrl:
      profile?.avatar_url || (user.user_metadata?.avatar_url as string | null),
  };

  return (
    <SidebarProvider className="bg-sidebar">
      <DashboardSidebar user={dashboardUser} />
      <div className="h-svh overflow-hidden lg:p-2 w-full">
        <div className="lg:border lg:rounded-md overflow-hidden flex flex-col items-center justify-start bg-container h-full w-full bg-background">
          <DashboardHeader user={dashboardUser} />
          <DashboardContent />
        </div>
      </div>
    </SidebarProvider>
  );
}