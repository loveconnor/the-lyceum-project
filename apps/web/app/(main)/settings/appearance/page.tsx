"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useTheme } from "next-themes";
import { useUserSettings } from "@/components/providers/settings-provider";
import {
  PresetSelector,
  SidebarModeSelector,
  ThemeScaleSelector,
  ColorModeSelector,
  ContentLayoutSelector,
  ThemeRadiusSelector,
  ResetThemeButton
} from "@/components/theme-customizer";
import { useI18n } from "@/components/providers/i18n-provider";

const appearanceFormSchema = z.object({
  font: z.enum(["inter", "geist", "system"], {
    invalid_type_error: "Select a font",
    required_error: "Please select a font."
  })
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

export default function Page() {
  const { setTheme } = useTheme();
  const { settings, saveSettings, isSaving } = useUserSettings();
  const { t } = useI18n();

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      font: settings.appearance.font
    }
  });

  useEffect(() => {
    form.reset({
      font: settings.appearance.font
    });
  }, [form, settings.appearance.font]);

  const handleFontChange = (value: string) => {
    document.body.setAttribute("data-font", value);
  };

  async function onSubmit(data: AppearanceFormValues) {
    try {
      await saveSettings({
        appearance: {
            ...settings.appearance,
            font: data.font
        }
      });
      
      toast.success(t("appearance.toast.success"));
    } catch (error: any) {
      toast.error(error.message || t("appearance.toast.error"));
    }
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="font"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("appearance.font.label")}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      handleFontChange(value);
                      field.onChange(value);
                    }}
                    value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("appearance.font.placeholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="inter">{t("appearance.font.option.inter")}</SelectItem>
                      <SelectItem value="geist">{t("appearance.font.option.geist")}</SelectItem>
                      <SelectItem value="system">{t("appearance.font.option.system")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>{t("appearance.font.description")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
               <div>
                 <div className="mb-4">
                   <h3 className="text-lg font-medium">{t("appearance.theme.title")}</h3>
                   <p className="text-sm text-muted-foreground">{t("appearance.theme.description")}</p>
                 </div>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                   <PresetSelector />
                   <ThemeScaleSelector />
                   <ThemeRadiusSelector />
                   <ColorModeSelector />
                   <ContentLayoutSelector />
                   <SidebarModeSelector />
                 </div>
                 <ResetThemeButton />
               </div>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("appearance.savingButton") : t("appearance.updateButton")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
