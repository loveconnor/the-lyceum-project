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
      
      toast.success("Appearance updated");
    } catch (error: any) {
      toast.error(error.message || "Unable to update appearance");
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
                  <FormLabel>Font</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      handleFontChange(value);
                      field.onChange(value);
                    }}
                    value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="geist">Geist</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Set the font you want to use in the dashboard.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
               <div>
                 <div className="mb-4">
                   <h3 className="text-lg font-medium">Theme Customization</h3>
                   <p className="text-sm text-muted-foreground">Customize the look and feel of the workspace.</p>
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
              {isSaving ? "Saving..." : "Update preferences"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
