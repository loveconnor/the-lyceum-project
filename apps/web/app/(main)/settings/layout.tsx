import { Metadata } from "next";
import { generateMeta } from "@/lib/utils";
import { getServerTranslator } from "@/lib/i18n-server";

import { SidebarNav } from "./components/sidebar-nav";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "The Lyceum Project - Settings",
    description: "Manage your account settings and set e-mail preferences.",
    canonical: "/settings"
  });
}

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getServerTranslator();
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h2>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>
      <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
        <aside className="lg:w-64">
          <SidebarNav />
        </aside>
        <div className="flex-1 lg:max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
