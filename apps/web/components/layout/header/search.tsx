"use client";

import React, { useEffect, useState } from "react";
import { CommandIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
type SearchItem = {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type SearchGroup = {
  title: string;
  items: SearchItem[];
};

const searchGroups: SearchGroup[] = [
  {
    title: "Navigation",
    items: [
      { label: "Dashboard", href: "/" },
      { label: "Learning Paths", href: "/learning-paths" },
      { label: "Labs", href: "/labs" },
      { label: "Reflections", href: "/reflections" },
      { label: "Planner / Time Coach", href: "/planner" },
      { label: "Relevance Explorer", href: "/relevance-explorer" },
      { label: "Community", href: "/community" },
      { label: "Instructor", href: "/instructor" }
    ]
  },
  {
    title: "Quick Links",
    items: [
      { label: "Start New Lab", href: "/labs/new" },
      { label: "Continue Reflection", href: "/reflections/continue" },
      { label: "View Goals", href: "/goals" }
    ]
  }
];

export default function Search() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="lg:flex-1">
      <div className="relative hidden max-w-sm flex-1 lg:block">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          className="h-9 w-full cursor-pointer rounded-md border pr-4 pl-10 text-sm shadow-xs"
          placeholder="Search..."
          type="search"
          onFocus={() => setOpen(true)}
        />
        <div className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm bg-zinc-200 p-1 font-mono text-xs font-medium sm:flex dark:bg-neutral-700">
          <CommandIcon className="size-3" />
          <span>k</span>
        </div>
      </div>
      <div className="block lg:hidden">
        <Button size="icon" variant="ghost" onClick={() => setOpen(true)}>
          <SearchIcon />
        </Button>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle></DialogTitle>
          </DialogHeader>
        </VisuallyHidden>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {searchGroups.map((group, groupIndex) => (
            <React.Fragment key={group.title}>
              <CommandGroup heading={group.title}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.href}
                    onSelect={() => {
                      setOpen(false);
                      router.push(item.href);
                    }}>
                    {item.icon && <item.icon className="mr-2" />}
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {groupIndex < searchGroups.length - 1 && <CommandSeparator />}
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
