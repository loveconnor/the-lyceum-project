"use client";

import React, { useEffect, useState } from "react";
import { CommandIcon, SearchIcon, Compass, FlaskConical, LayoutDashboard, Sparkles, BookOpen, Loader2, Settings, MessageSquare, Bell, Palette, User, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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
import { Badge } from "@/components/ui/badge";

type SearchItem = {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string;
};

type SearchGroup = {
  title: string;
  items: SearchItem[];
};

const navigationItems: SearchItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "AI Assistant", href: "/assistant", icon: Sparkles },
  { label: "Learning Paths", href: "/paths", icon: Compass },
  { label: "Labs", href: "/labs", icon: FlaskConical },
  { label: "Settings", href: "/settings", icon: Settings },
];

const settingsItems: SearchItem[] = [
  { label: "Account Settings", href: "/settings/account", icon: User, description: "Manage your profile and account details" },
  { label: "Appearance", href: "/settings/appearance", icon: Palette, description: "Customize theme and font preferences" },
  { label: "Notifications", href: "/settings/notifications", icon: Bell, description: "Configure learning reminders and alerts" },
  { label: "Display", href: "/settings/display", icon: Settings, description: "Customize sidebar and layout options" },
];

export default function Search() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paths, setPaths] = useState<SearchItem[]>([]);
  const [labs, setLabs] = useState<SearchItem[]>([]);
  const [chats, setChats] = useState<SearchItem[]>([]);
  const [isMac, setIsMac] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Detect if user is on Mac
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));
  }, []);

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

  // Load paths and labs when dialog opens
  useEffect(() => {
    if (open) {
      loadSearchableContent();
    }
  }, [open]);

  async function loadSearchableContent() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load learning paths
      const { data: pathsData } = await supabase
        .from('learning_paths')
        .select('id, title, description, status, topics')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (pathsData) {
        setPaths(pathsData.map(p => ({
          label: p.title,
          href: `/paths/${p.id}`,
          description: p.description || undefined,
          badge: p.status === 'completed' ? 'Completed' : p.status === 'in-progress' ? 'In Progress' : undefined,
          icon: Compass
        })));
      }

      // Load labs
      const { data: labsData } = await supabase
        .from('labs')
        .select('id, title, description, status, difficulty')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (labsData) {
        setLabs(labsData.map(l => ({
          label: l.title,
          href: `/labs/${l.id}`,
          description: l.description || undefined,
          badge: l.difficulty || undefined,
          icon: FlaskConical
        })));
      }

      // Load chats
      const { data: chatsData } = await supabase
        .from('assistant_chats')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (chatsData) {
        setChats(chatsData.map(c => ({
          label: c.title || 'Untitled Chat',
          href: `/assistant?chat=${c.id}`,
          description: `Created ${new Date(c.created_at).toLocaleDateString()}`,
          icon: MessageSquare
        })));
      }
    } catch (error) {
      console.error('Error loading searchable content:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter items based on search query
  const hasQuery = searchQuery.trim().length > 0;
  
  const filteredNavigation = navigationItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSettings = hasQuery ? settingsItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const filteredPaths = hasQuery ? paths.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const filteredLabs = hasQuery ? labs.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const filteredChats = hasQuery ? chats.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const searchGroups: SearchGroup[] = [
    ...(filteredNavigation.length > 0 ? [{
      title: "Navigation",
      items: filteredNavigation
    }] : []),
    ...(filteredSettings.length > 0 ? [{
      title: "Settings",
      items: filteredSettings
    }] : []),
    ...(filteredPaths.length > 0 ? [{
      title: "Learning Paths",
      items: filteredPaths
    }] : []),
    ...(filteredLabs.length > 0 ? [{
      title: "Labs",
      items: filteredLabs
    }] : []),
    ...(filteredChats.length > 0 ? [{
      title: "Chats",
      items: filteredChats
    }] : [])
  ];

  return (
    <div className="lg:flex-1">
      <div className="relative hidden max-w-sm flex-1 lg:block">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          className="h-9 w-full cursor-pointer rounded-md border pr-4 pl-10 text-sm shadow-xs"
          placeholder="Search paths, labs, chats, settings..."
          type="search"
          onFocus={() => setOpen(true)}
        />
        <div className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm bg-zinc-200 p-1 font-mono text-xs font-medium sm:flex dark:bg-neutral-700">
          {isMac ? (
            <>
              <CommandIcon className="size-3" />
              <span>K</span>
            </>
          ) : (
            <>
              <span>Ctrl</span>
              <span>K</span>
            </>
          )}
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
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
        </VisuallyHidden>
        <CommandInput 
          placeholder="Search paths, labs, chats, settings..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : searchGroups.length === 0 ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            searchGroups.map((group, groupIndex) => (
              <React.Fragment key={group.title}>
                <CommandGroup heading={group.title}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.href}
                      onSelect={() => {
                        setOpen(false);
                        setSearchQuery("");
                        router.push(item.href);
                      }}
                      className="flex items-start gap-2 py-3"
                    >
                      {item.icon && <item.icon className="mt-0.5 h-4 w-4 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {groupIndex < searchGroups.length - 1 && <CommandSeparator />}
              </React.Fragment>
            ))
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
