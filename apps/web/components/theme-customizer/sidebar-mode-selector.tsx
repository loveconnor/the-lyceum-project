"use client";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSidebar } from "@/components/ui/sidebar";
import { useI18n } from "@/components/providers/i18n-provider";

export function SidebarModeSelector() {
  const { toggleSidebar } = useSidebar();
  const { t } = useI18n();

  return (
    <div className="hidden flex-col gap-4 lg:flex">
      <Label>{t("appearance.theme.sidebarMode.label")}</Label>
      <ToggleGroup
        type="single"
        onValueChange={() => toggleSidebar()}
        className="*:border-input w-full gap-4 *:rounded-md *:border">
        <ToggleGroupItem variant="outline" value="full">
          {t("appearance.theme.sidebarMode.default")}
        </ToggleGroupItem>
        <ToggleGroupItem
          variant="outline"
          value="centered"
          className="data-[variant=outline]:border-l-1">
          {t("appearance.theme.sidebarMode.icon")}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
