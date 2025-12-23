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

const notificationsFormSchema = z.object({
  learning_reminders: z.boolean().default(true),
  path_milestones: z.boolean().default(true),
  lab_milestones: z.boolean().default(true),
  email_enabled: z.boolean().default(true)
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

export default function Page() {
  const { settings, saveSettings, isSaving } = useUserSettings();

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
      toast.success("Notification preferences updated");
    } catch (error: any) {
      toast.error(error.message || "Unable to update notification preferences");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            Learning Notifications
          </CardTitle>
          <CardDescription>
            Manage when and how you receive notifications about your learning progress. 
            Notifications are designed to be minimal and focused on helping you stay consistent.
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
                          Learning Reminders
                        </FormLabel>
                        <FormDescription>
                          Get gentle reminders to continue your learning paths when you haven't 
                          studied in a few days. Example: "You haven't continued Introduction to Integrals in 3 days."
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
                          Learning Path Milestones
                        </FormLabel>
                        <FormDescription>
                          Celebrate when you complete a learning path or are close to finishing. 
                          Example: "You completed JavaScript Fundamentals!" or "You're one lab away from completing this path."
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
                          Lab & Module Completions
                        </FormLabel>
                        <FormDescription>
                          Get notified when you complete labs or modules within your learning paths. 
                          Positive reinforcement for your progress.
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
                <h3 className="mb-4 text-lg font-medium">Delivery Method</h3>
                <FormField
                  control={form.control}
                  name="email_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Email Notifications</FormLabel>
                        <FormDescription>
                          Receive notification emails at your registered email address. 
                          Emails will only be sent for the notification types you've enabled above.
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
                {isSaving ? "Saving..." : "Save Preferences"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">About Lyceum Notifications</h4>
            <p className="text-muted-foreground text-sm">
              Our notification system is designed to support your learning journey without becoming 
              a distraction. Notifications are:
            </p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>Sparse and meaningful - only when it matters</li>
              <li>Focused on your progress and consistency</li>
              <li>Never about social activity or non-learning events</li>
              <li>Delivered primarily via email for a calm experience</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
