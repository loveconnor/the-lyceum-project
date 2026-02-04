"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { SIDEBAR_ITEMS } from "@/lib/settings";
import { useUserSettings } from "@/components/providers/settings-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useI18n } from "@/components/providers/i18n-provider";

const displayFormSchema = z.object({
  sidebarItems: z
    .array(z.string())
    .refine((value) => value.some((item) => item), {
      message: "You have to select at least one item."
    })
});

type DisplayFormValues = z.infer<typeof displayFormSchema>;

export default function Page() {
  const { settings, saveSettings, isSaving } = useUserSettings();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues: {
      sidebarItems: settings.display.sidebarItems
    }
  });

  useEffect(() => {
    form.reset({
      sidebarItems: settings.display.sidebarItems
    });
  }, [form, settings]);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function onSubmit(data: DisplayFormValues) {
    try {
      await saveSettings({
        display: {
          sidebarItems: data.sidebarItems
        }
      });
      toast.success(t("display.toast.success"));
    } catch (error: any) {
      toast.error(error.message || t("display.toast.error"));
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="sidebarItems"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">{t("display.sidebar.label")}</FormLabel>
                    <FormDescription>{t("display.sidebar.description")}</FormDescription>
                  </div>
                  {SIDEBAR_ITEMS.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name="sidebarItems"
                      render={({ field }) => {
                        return (
                          <FormItem key={item.id} className="flex flex-row items-start space-x-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, item.id])
                                    : field.onChange(
                                        field.value?.filter((value) => value !== item.id)
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{t(item.labelKey)}</FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("display.savingButton") : t("display.updateButton")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
