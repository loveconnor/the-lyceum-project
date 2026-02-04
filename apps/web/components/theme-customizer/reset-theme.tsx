"use client";

import { useThemeConfig } from "@/components/active-theme";
import { Button } from "@/components/ui/button";
import { DEFAULT_THEME } from "@/lib/themes";
import { useI18n } from "@/components/providers/i18n-provider";

export function ResetThemeButton() {
  const { setTheme } = useThemeConfig();
  const { t } = useI18n();

  const resetThemeHandle = () => {
    setTheme(DEFAULT_THEME);
  };

  return (
    <Button variant="destructive" className="mt-4 w-full" onClick={resetThemeHandle}>
      {t("appearance.theme.reset")}
    </Button>
  );
}
