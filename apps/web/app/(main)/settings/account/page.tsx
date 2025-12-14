"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { useUserSettings } from "@/components/providers/settings-provider";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CircleUserRoundIcon, Trash2Icon } from "lucide-react";

const languages = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Spanish", value: "es" },
  { label: "Portuguese", value: "pt" },
  { label: "Russian", value: "ru" },
  { label: "Japanese", value: "ja" },
  { label: "Korean", value: "ko" },
  { label: "Chinese", value: "zh" }
] as const;

const accountFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters."
    })
    .max(30, {
      message: "Name must not be longer than 30 characters."
    }),
  email: z.string().email("Please enter a valid email."),
  dob: z.date().optional(),
  language: z.string({
    required_error: "Please select a language."
  })
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function Page() {
  const { settings, saveSettings, isSaving } = useUserSettings();
  const [mounted, setMounted] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(
    settings.profile.avatarUrl ?? null
  );

  const [{ files }, { removeFile, openFileDialog, getInputProps }] = useFileUpload({
    accept: "image/*",
    initialFiles: settings.profile.avatarUrl
      ? [
          {
            name: "avatar",
            size: 0,
            type: "image/png",
            url: settings.profile.avatarUrl,
            id: "avatar"
          }
        ]
      : []
  });

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: settings.account.name || settings.profile.username,
      email: settings.profile.email,
      dob: settings.account.dob ? new Date(settings.account.dob) : undefined,
      language: settings.account.language || "en"
    }
  });

  useEffect(() => {
    form.reset({
      name: settings.account.name || settings.profile.username,
      email: settings.profile.email,
      dob: settings.account.dob ? new Date(settings.account.dob) : undefined,
      language: settings.account.language || "en"
    });
    setAvatarDataUrl(settings.profile.avatarUrl ?? null);
  }, [form, settings]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const file = files[0]?.file;
    if (file instanceof File) {
      const reader = new FileReader();
      reader.onload = () => setAvatarDataUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else if (files[0]?.preview) {
      setAvatarDataUrl(files[0].preview);
    }
  }, [files]);

  const avatarPreview = useMemo(
    () => avatarDataUrl || settings.profile.avatarUrl || null,
    [avatarDataUrl, settings.profile.avatarUrl]
  );

  if (!mounted) {
    return null;
  }

  async function onSubmit(data: AccountFormValues) {
    try {
      await saveSettings({
        account: {
          name: data.name,
          dob: data.dob ? data.dob.toISOString() : null,
          language: data.language
        },
        profile: {
          username: data.name,
          email: data.email,
          avatarUrl: avatarPreview
        }
      });
      toast.success("Account details updated");
    } catch (error: any) {
      toast.error(error.message || "Unable to update account details");
    }
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 align-top">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={`${avatarPreview ?? ""}`} />
                  <AvatarFallback>
                    <CircleUserRoundIcon className="opacity-45" />
                  </AvatarFallback>
                </Avatar>
                <div className="relative flex gap-2">
                  <Button type="button" onClick={openFileDialog} aria-haspopup="dialog">
                    {files[0]?.file ? "Change image" : "Upload image"}
                  </Button>
                  <input
                    {...getInputProps()}
                    className="sr-only"
                    aria-label="Upload image file"
                    tabIndex={-1}
                  />
                  {files[0]?.file && (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      onClick={() => removeFile(files[0]?.id)}>
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the name that will be displayed on your profile and in emails.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the email that appears on your profile and notifications.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of birth</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0"
                      align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Your date of birth is used to calculate your age.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Language</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}>
                          {field.value
                            ? languages.find((language) => language.value === field.value)?.label
                            : "Select language"}
                          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search language..." />
                        <CommandList>
                          <CommandEmpty>No language found.</CommandEmpty>
                          <CommandGroup>
                            {languages.map((language) => (
                              <CommandItem
                                value={language.label}
                                key={language.value}
                                onSelect={() => {
                                  form.setValue("language", language.value);
                                }}>
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    language.value === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {language.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    This is the language that will be used in the dashboard.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Update account"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
