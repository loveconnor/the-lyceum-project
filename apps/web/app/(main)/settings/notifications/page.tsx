"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useUserSettings } from "@/components/providers/settings-provider";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BellIcon, BookOpen, Target, Award } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";

const notificationsFormSchema = z.object({
  learning_reminders: z.boolean().default(true),
  path_milestones: z.boolean().default(true),
  lab_milestones: z.boolean().default(true),
  email_enabled: z.boolean().default(true)
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

export default function Page() {
  const { settings, saveSettings, isSaving } = useUserSettings();
  const { t } = useI18n();

  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      learning_reminders: settings.notifications.learning_reminders,
      path_milestones: settings.notifications.path_milestones,
      lab_milestones: settings.notifications.lab_milestones,
      email_enabled: settings.notifications.email_enabled
    }
  });

  useEffect(() => {
    form.reset({
      learning_reminders: settings.notifications.learning_reminders,
      path_milestones: settings.notifications.path_milestones,
      lab_milestones: settings.notifications.lab_milestones,
      email_enabled: settings.notifications.email_enabled
    });
  }, [form, settings]);

  async function onSubmit(data: NotificationsFormValues) {
    try {
      await saveSettings({
        notifications: data
      });
      toast.success(t("settings.notifications.toast.success"));
    } catch (error: any) {
      toast.error(error.message || t("settings.notifications.toast.error"));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            {t("settings.notifications.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.notifications.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="learning_reminders"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {t("settings.notifications.learningReminders.label")}
                        </FormLabel>
                        <FormDescription>
                          {t("settings.notifications.learningReminders.description")}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="path_milestones"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          {t("settings.notifications.pathMilestones.label")}
                        </FormLabel>
                        <FormDescription>
                          {t("settings.notifications.pathMilestones.description")}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lab_milestones"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          {t("settings.notifications.labMilestones.label")}
                        </FormLabel>
                        <FormDescription>
                          {t("settings.notifications.labMilestones.description")}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="mb-4 text-lg font-medium">{t("settings.notifications.delivery.title")}</h3>
                <FormField
                  control={form.control}
                  name="email_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t("settings.notifications.email.label")}</FormLabel>
                        <FormDescription>
                          {t("settings.notifications.email.description")}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? t("settings.notifications.savingButton") : t("settings.notifications.saveButton")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("settings.notifications.about.title")}</h4>
            <p className="text-muted-foreground text-sm">
              {t("settings.notifications.about.description")}
            </p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("settings.notifications.about.list1")}</li>
              <li>{t("settings.notifications.about.list2")}</li>
              <li>{t("settings.notifications.about.list3")}</li>
              <li>{t("settings.notifications.about.list4")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
