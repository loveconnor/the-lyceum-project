import {
  Bell,
  Clock3,
  Compass,
  FlaskConical,
  LayoutDashboard,
  Link as LinkIcon,
  NotebookPen,
  Sparkles,
  Target,
  Users
} from "lucide-react";

export type SidebarItemId =
  | "ai_assistant"
  | "dashboard"
  | "learning_paths"
  | "labs"
  | "reflections"
  | "planner"
  | "relevance"
  | "community"
  | "start_lab"
  | "continue_reflection"
  | "view_goals"
  | "notifications";

export type UserSettings = {
  profile: {
    username: string;
    email: string;
    bio: string;
    urls: { value: string }[];
    avatarUrl?: string | null;
  };
  account: {
    name: string;
    dob: string | null;
    language: string;
  };
  appearance: {
    theme: "light" | "dark";
    font: "inter" | "manrope" | "system";
  };
  notifications: {
    type: "all" | "mentions" | "none";
    mobile: boolean;
    communication_emails: boolean;
    social_emails: boolean;
    marketing_emails: boolean;
    security_emails: boolean;
  };
  display: {
    sidebarItems: SidebarItemId[];
  };
};

export type SidebarItemDefinition = {
  id: SidebarItemId;
  label: string;
  icon: any;
  href?: string;
  group: "primary" | "quick_links";
};
// Commented out items are for after MVP
export const SIDEBAR_ITEMS: SidebarItemDefinition[] = [
  { id: "ai_assistant", label: "AI Assistant", icon: Sparkles, group: "primary", href: "/assistant" },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "primary", href: "/" },
  { id: "learning_paths", label: "Learning Paths", icon: Compass, group: "primary", href: "/paths" },
  { id: "labs", label: "Labs", icon: FlaskConical, group: "primary", href: "/labs" },
  { id: "reflections", label: "Reflections", icon: NotebookPen, group: "primary" },
  // { id: "planner", label: "Planner / Time Coach", icon: Clock3, group: "primary" },
  // { id: "relevance", label: "Relevance Explorer", icon: Target, group: "primary" },
  // { id: "community", label: "Community", icon: Users, group: "primary" },
  // { id: "notifications", label: "Notifications", icon: Bell, group: "primary", href: "/settings/notifications" },
  { id: "start_lab", label: "Start New Lab", icon: LinkIcon, group: "quick_links" },
  { id: "continue_reflection", label: "Continue Reflection", icon: LinkIcon, group: "quick_links" },
  // { id: "view_goals", label: "View Goals", icon: LinkIcon, group: "quick_links" }
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  profile: {
    username: "",
    email: "",
    bio: "",
    urls: [],
    avatarUrl: null
  },
  account: {
    name: "",
    dob: null,
    language: "en"
  },
  appearance: {
    theme: "light",
    font: "inter"
  },
  notifications: {
    type: "all",
    mobile: false,
    communication_emails: false,
    marketing_emails: false,
    social_emails: true,
    security_emails: true
  },
  display: {
    sidebarItems: SIDEBAR_ITEMS.map((item) => item.id)
  }
};

const sidebarIds = new Set(SIDEBAR_ITEMS.map((item) => item.id));

export function normalizeSidebarItems(items?: SidebarItemId[] | null) {
  if (!items || items.length === 0) {
    return [...DEFAULT_USER_SETTINGS.display.sidebarItems];
  }
  return Array.from(new Set(items.filter((id): id is SidebarItemId => sidebarIds.has(id))));
}

function mergeProfile(
  current: Partial<UserSettings["profile"]> | undefined,
  updates: Partial<UserSettings["profile"]> | undefined
): UserSettings["profile"] {
  const result = { ...DEFAULT_USER_SETTINGS.profile, ...current, ...updates };
  result.urls = (updates?.urls ?? current?.urls ?? DEFAULT_USER_SETTINGS.profile.urls).map((url) => ({
    value: url.value
  }));
  return result;
}

function mergeAccount(
  current: Partial<UserSettings["account"]> | undefined,
  updates: Partial<UserSettings["account"]> | undefined
): UserSettings["account"] {
  const result = { ...DEFAULT_USER_SETTINGS.account, ...current, ...updates };
  result.dob = updates?.dob ?? current?.dob ?? DEFAULT_USER_SETTINGS.account.dob;
  return result;
}

function mergeAppearance(
  current: Partial<UserSettings["appearance"]> | undefined,
  updates: Partial<UserSettings["appearance"]> | undefined
): UserSettings["appearance"] {
  return { ...DEFAULT_USER_SETTINGS.appearance, ...current, ...updates };
}

function mergeNotifications(
  current: Partial<UserSettings["notifications"]> | undefined,
  updates: Partial<UserSettings["notifications"]> | undefined
): UserSettings["notifications"] {
  return { ...DEFAULT_USER_SETTINGS.notifications, ...current, ...updates };
}

function mergeDisplay(
  current: Partial<UserSettings["display"]> | undefined,
  updates: Partial<UserSettings["display"]> | undefined
): UserSettings["display"] {
  const sidebarItems = normalizeSidebarItems(updates?.sidebarItems ?? current?.sidebarItems);
  return { sidebarItems };
}

export function mergeSettings(
  current?: Partial<UserSettings> | null,
  updates?: Partial<UserSettings> | null
): UserSettings {
  return {
    profile: mergeProfile(current?.profile, updates?.profile),
    account: mergeAccount(current?.account, updates?.account),
    appearance: mergeAppearance(current?.appearance, updates?.appearance),
    notifications: mergeNotifications(current?.notifications, updates?.notifications),
    display: mergeDisplay(current?.display, updates?.display)
  };
}

export function coerceSettings(value?: unknown): UserSettings {
  const current = (value ?? {}) as Partial<UserSettings>;
  return mergeSettings(current, {});
}
