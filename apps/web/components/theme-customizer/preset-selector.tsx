"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { DEFAULT_THEME, THEMES } from "@/lib/themes";
import { useThemeConfig } from "@/components/active-theme";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/providers/i18n-provider";

export function PresetSelector() {
  const { theme, setTheme } = useThemeConfig();
  const { t } = useI18n();

  const handlePreset = (value: string) => {
    setTheme({ ...theme, ...DEFAULT_THEME, preset: value as any });
  };

  return (
    <div className="flex flex-col gap-4">
      <Label>{t("appearance.theme.preset.label")}</Label>
      <Select value={theme.preset} onValueChange={(value) => handlePreset(value)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("appearance.theme.preset.placeholder")} />
        </SelectTrigger>
        <SelectContent align="end">
          {THEMES.map((theme) => (
            <SelectItem key={theme.name} value={theme.value}>
              <div className="flex shrink-0 gap-1">
                {theme.colors.map((color, key) => (
                  <span
                    key={key}
                    className="size-2 rounded-full"
                    style={{ backgroundColor: color }}></span>
                ))}
              </div>
              {theme.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
