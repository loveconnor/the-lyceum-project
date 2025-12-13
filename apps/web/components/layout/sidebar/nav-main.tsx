"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
} from "@/components/ui/sidebar";
import {
  ActivityIcon,
  ArchiveRestoreIcon,
  BadgeDollarSignIcon,
  BrainCircuitIcon,
  BrainIcon,
  Building2Icon,
  CalendarIcon,
  ChartBarDecreasingIcon,
  ChartPieIcon,
  ChevronRight,
  ClipboardCheckIcon,
  ClipboardMinusIcon,
  ComponentIcon,
  CookieIcon,
  FingerprintIcon,
  FolderDotIcon,
  FolderIcon,
  GaugeIcon,
  GraduationCapIcon,
  ImagesIcon,
  KeyIcon,
  MailIcon,
  MessageSquareIcon,
  ProportionsIcon,
  SettingsIcon,
  ShoppingBagIcon,
  SquareCheckIcon,
  SquareKanbanIcon,
  StickyNoteIcon,
  UserIcon,
  UsersIcon,
  WalletMinimalIcon,
  type LucideIcon,
  GithubIcon,
  RedoDotIcon,
  BrushIcon,
  CreditCardIcon,
  SpeechIcon,
  MessageSquareHeartIcon,
  BookAIcon,
  PuzzleIcon
} from "lucide-react";
import Link from "next/link";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type NavGroup = {
  title: string;
  items: NavItem;
};

type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  isComing?: boolean;
  isDataBadge?: string;
  isNew?: boolean;
  newTab?: boolean;
  items?: NavItem;
}[];

export const navItems: NavGroup[] = [
  {
    title: "Dashboards",
    items: [
      {
        title: "Classic Dashboard",
        href: "/dashboard/default",
        icon: ChartPieIcon
      },
      {
        title: "E-commerce",
        href: "#",
        icon: ShoppingBagIcon,
        items: [
          { title: "Dashboard", href: "/dashboard/ecommerce" },
          { title: "Product List", href: "/dashboard/pages/products" },
          { title: "Product Detail", href: "/dashboard/pages/products/1" },
          { title: "Add Product", href: "/dashboard/pages/products/create" },
          { title: "Order List", href: "/dashboard/pages/orders" },
          { title: "Order Detail", href: "/dashboard/pages/orders/detail" }
        ]
      },
      {
        title: "Payment Dashboard",
        href: "/dashboard/payment",
        icon: CreditCardIcon,
        items: [
          { title: "Dashboard", href: "/dashboard/payment" },
          { title: "Transactions", href: "/dashboard/payment/transactions" }
        ]
      },
      {
        title: "Hotel Dashboard",
        href: "/dashboard/hotel",
        icon: Building2Icon,
        items: [
          { title: "Dashboard", href: "/dashboard/hotel" },
          { title: "Bookings", href: "/dashboard/hotel/bookings" }
        ]
      },
      {
        title: "Project Management",
        href: "/dashboard/project-management",
        icon: FolderDotIcon,
        items: [
          { title: "Dashboard", href: "/dashboard/project-management" },
          { title: "Project List", href: "/dashboard/project-list" }
        ]
      },
      { title: "Sales", href: "/dashboard/sales", icon: BadgeDollarSignIcon },
      { title: "CRM", href: "/dashboard/crm", icon: ChartBarDecreasingIcon },
      {
        title: "Website Analytics",
        href: "/dashboard/website-analytics",
        icon: GaugeIcon
      },
      {
        title: "File Manager",
        href: "/dashboard/file-manager",
        icon: FolderIcon
      },
      { title: "Crypto", href: "/dashboard/crypto", icon: WalletMinimalIcon },
      { title: "Academy/School", href: "/dashboard/academy", icon: GraduationCapIcon },
      { title: "Hospital Management", href: "/dashboard/hospital-management", icon: ActivityIcon },
      {
        title: "Finance Dashboard",
        href: "/dashboard/finance",
        icon: WalletMinimalIcon
      }
    ]
  },
  {
    title: "Apps",
    items: [
      {
        title: "Kanban",
        href: "/dashboard/apps/kanban",
        icon: SquareKanbanIcon
      },
      { title: "Notes", href: "/dashboard/apps/notes", icon: StickyNoteIcon, isDataBadge: "8" },
      { title: "Chats", href: "/dashboard/apps/chat", icon: MessageSquareIcon, isDataBadge: "5" },
      {
        title: "Social Media",
        href: "/dashboard/apps/social-media",
        icon: MessageSquareHeartIcon,
        isNew: true
      },
      { title: "Mail", href: "/dashboard/apps/mail", icon: MailIcon },
      {
        title: "Todo List App",
        href: "/dashboard/apps/todo-list-app",
        icon: SquareCheckIcon
      },
      {
        title: "Tasks",
        href: "/dashboard/apps/tasks",
        icon: ClipboardCheckIcon
      },
      { title: "Calendar", href: "/dashboard/apps/calendar", icon: CalendarIcon },
      {
        title: "File Manager",
        href: "/dashboard/apps/file-manager",
        icon: ArchiveRestoreIcon,
        isNew: true
      },
      { title: "Api Keys", href: "/dashboard/apps/api-keys", icon: KeyIcon },
      { title: "POS App", href: "/dashboard/apps/pos-system", icon: CookieIcon },
      { title: "Courses", href: "/dashboard/apps/courses", icon: BookAIcon, isComing: true }
    ]
  },
  {
    title: "AI Apps",
    items: [
      { title: "AI Chat", href: "/dashboard/apps/ai-chat", icon: BrainIcon },
      {
        title: "AI Chat V2",
        href: "/dashboard/apps/ai-chat-v2",
        icon: BrainCircuitIcon,
        isNew: true
      },
      {
        title: "Image Generator",
        href: "/dashboard/apps/ai-image-generator",
        icon: ImagesIcon
      },
      {
        title: "Text to Speech",
        href: "/dashboard/apps/text-to-speech",
        icon: SpeechIcon,
        isComing: true
      }
    ]
  },
  {
    title: "Pages",
    items: [
      {
        title: "Users List",
        href: "/dashboard/pages/users",
        icon: UsersIcon
      },
      {
        title: "Profile",
        href: "/dashboard/pages/profile",
        icon: UserIcon
      },
      {
        title: "Profile V2",
        href: "/dashboard/pages/user-profile",
        icon: UserIcon
      },
      {
        title: "Onboarding Flow",
        href: "/dashboard/pages/onboarding-flow",
        icon: RedoDotIcon
      },
      {
        title: "Empty States",
        href: "/dashboard/pages/empty-states/01",
        icon: BrushIcon,
        items: [
          { title: "Empty States 01", href: "/dashboard/pages/empty-states/01" },
          { title: "Empty States 02", href: "/dashboard/pages/empty-states/02" },
          { title: "Empty States 03", href: "/dashboard/pages/empty-states/03" }
        ]
      },
      {
        title: "Settings",
        href: "/dashboard/pages/settings",
        icon: SettingsIcon,
        items: [
          { title: "Profile", href: "/dashboard/pages/settings" },
          { title: "Account", href: "/dashboard/pages/settings/account" },
          { title: "Billing", href: "/dashboard/pages/settings/billing" },
          { title: "Appearance", href: "/dashboard/pages/settings/appearance" },
          { title: "Notifications", href: "/dashboard/pages/settings/notifications" },
          { title: "Display", href: "/dashboard/pages/settings/display" }
        ]
      },
      {
        title: "Pricing",
        href: "#",
        icon: BadgeDollarSignIcon,
        items: [
          { title: "Column Pricing", href: "/dashboard/pages/pricing/column" },
          { title: "Table Pricing", href: "/dashboard/pages/pricing/table" },
          { title: "Single Pricing", href: "/dashboard/pages/pricing/single" }
        ]
      },
      {
        title: "Authentication",
        href: "/",
        icon: FingerprintIcon,
        items: [
          { title: "Login v1", href: "/dashboard/login/v1" },
          { title: "Login v2", href: "/dashboard/login/v2" },
          { title: "Register v1", href: "/dashboard/register/v1" },
          { title: "Register v2", href: "/dashboard/register/v2" },
          { title: "Forgot Password", href: "/dashboard/forgot-password" }
        ]
      },
      {
        title: "Error Pages",
        href: "/",
        icon: FingerprintIcon,
        items: [
          { title: "404", href: "/dashboard/pages/error/404" },
          { title: "500", href: "/dashboard/pages/error/500" },
          { title: "403", href: "/dashboard/pages/error/403" }
        ]
      }
    ]
  },
  {
    title: "Others",
    items: [
      {
        title: "Widgets",
        href: "#",
        icon: PuzzleIcon,
        items: [
          { title: "Fitness", href: "/dashboard/widgets/fitness" },
          { title: "E-commerce", href: "/dashboard/widgets/ecommerce" },
          { title: "Analytics", href: "/dashboard/widgets/analytics" }
        ]
      },
      {
        title: "Download Shadcn UI Kit",
        href: "/pricing",
        icon: ClipboardMinusIcon,
        newTab: true
      },
      {
        title: "Components",
        href: "/components",
        icon: ComponentIcon,
        newTab: true
      },
      {
        title: "Blocks",
        href: "/blocks",
        icon: ComponentIcon,
        newTab: true
      },
      {
        title: "Templates",
        href: "/templates",
        icon: ProportionsIcon,
        newTab: true
      },
      {
        title: "Github",
        href: "https://github.com/bundui",
        icon: GithubIcon,
        newTab: true
      }
    ]
  }
];

export function NavMain() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  return (
    <>
      {navItems.map((nav) => (
        <SidebarGroup key={nav.title}>
          <SidebarGroupLabel>{nav.title}</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {nav.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {Array.isArray(item.items) && item.items.length > 0 ? (
                    <>
                      <div className="hidden group-data-[collapsible=icon]:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton tooltip={item.title}>
                              {item.icon && <item.icon />}
                              <span>{item.title}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side={isMobile ? "bottom" : "right"}
                            align={isMobile ? "end" : "start"}
                            className="min-w-48 rounded-lg">
                            <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                            {item.items?.map((item) => (
                              <DropdownMenuItem
                                className="hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10! active:bg-[var(--primary)]/10!"
                                asChild
                                key={item.title}>
                                <a href={item.href}>{item.title}</a>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Collapsible
                        className="group/collapsible block group-data-[collapsible=icon]:hidden"
                        defaultOpen={!!item.items.find((s) => s.href === pathname)}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            asChild
                            className="hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10">
                            <span className="flex w-full items-center gap-2">
                              {item.icon && <item.icon />}
                              <span>{item.title}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </span>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item?.items?.map((subItem, key) => (
                              <SidebarMenuSubItem key={key}>
                                <SidebarMenuSubButton
                                  className="hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                                  isActive={pathname === subItem.href}
                                  asChild>
                                  <Link href={subItem.href} target={subItem.newTab ? "_blank" : ""}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  ) : (
                    <SidebarMenuButton
                      className="hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                      isActive={pathname === item.href}
                      tooltip={item.title}
                      asChild>
                      <Link href={item.href} target={item.newTab ? "_blank" : ""}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                  {!!item.isComing && (
                    <SidebarMenuBadge className="peer-hover/menu-button:text-foreground opacity-50">
                      Coming
                    </SidebarMenuBadge>
                  )}
                  {!!item.isNew && (
                    <SidebarMenuBadge className="border border-green-400 text-green-600 peer-hover/menu-button:text-green-600">
                      New
                    </SidebarMenuBadge>
                  )}
                  {!!item.isDataBadge && (
                    <SidebarMenuBadge className="peer-hover/menu-button:text-foreground">
                      {item.isDataBadge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
