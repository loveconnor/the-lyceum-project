"use client";

import { useSyncExternalStore } from "react";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTheme } from "next-themes";
import { useI18n } from "@/components/providers/i18n-provider";

export function ColorModeSelector() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  return (
    <div className="flex flex-col gap-4">
      <Label htmlFor="roundedCorner">{t("appearance.theme.colorMode.label")}</Label>
      <ToggleGroup
        value={mounted ? theme : undefined}
        type="single"
        onValueChange={(value) => {
          if (value) setTheme(value);
        }}
        className="*:border-input w-full gap-4 *:rounded-md *:border">
        <ToggleGroupItem variant="outline" value="light">
          {t("appearance.theme.colorMode.light")}
        </ToggleGroupItem>
        <ToggleGroupItem
          variant="outline"
          value="dark"
          className="data-[variant=outline]:border-l-1">
          {t("appearance.theme.colorMode.dark")}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
