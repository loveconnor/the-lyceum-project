"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import { useUserSettings } from "@/components/providers/settings-provider";

import { Button } from "@/components/ui/button";

export default function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { settings, saveSettings } = useUserSettings();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    // Persist the change to user settings
    try {
      await saveSettings({
        appearance: {
          ...settings.appearance,
          theme: newTheme as "light" | "dark" | "system"
        }
      });
    } catch (error) {
      console.error("Failed to persist theme change:", error);
    }
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      className="relative"
      onClick={toggleTheme}>
      {theme === "light" ? <SunIcon /> : <MoonIcon />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}