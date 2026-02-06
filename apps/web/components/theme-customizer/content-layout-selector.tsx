"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Label } from "@/components/ui/label";
import { useThemeConfig } from "@/components/active-theme";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/components/providers/i18n-provider";

export function ContentLayoutSelector() {
  const { theme, setTheme } = useThemeConfig();
  const { t } = useI18n();

  return (
    <div className="hidden flex-col gap-4 lg:flex">
      <Label>{t("appearance.theme.contentLayout.label")}</Label>
      <ToggleGroup
        value={theme.contentLayout}
        type="single"
        onValueChange={(value) => setTheme({ ...theme, contentLayout: value as any })}
        className="*:border-input w-full gap-4 *:rounded-md *:border">
        <ToggleGroupItem variant="outline" value="full">
          {t("appearance.theme.contentLayout.full")}
        </ToggleGroupItem>
        <ToggleGroupItem
          variant="outline"
          value="centered"
          className="data-[variant=outline]:border-l-1">
          {t("appearance.theme.contentLayout.centered")}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
