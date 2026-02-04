"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  ContrastIcon,
  CreditCardIcon,
  HeartIcon,
  PaletteIcon,
  ShieldIcon,
  UserIcon
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";

const sidebarNavItems = [
  {
    titleKey: "settings.nav.account",
    href: "/settings/account",
    icon: ShieldIcon
  },
  /*{
    title: "Billing",
    href: "/settings/billing",
    icon: CreditCardIcon
  }*/
  {
    titleKey: "settings.nav.interests",
    href: "/settings/interests",
    icon: HeartIcon
  },
  {
    titleKey: "settings.nav.appearance",
    href: "/settings/appearance",
    icon: PaletteIcon
  },
  {
    titleKey: "settings.nav.notifications",
    href: "/settings/notifications",
    icon: BellIcon
  },
  {
    titleKey: "settings.nav.display",
    href: "/settings/display",
    icon: ContrastIcon
  }
];

export function SidebarNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <Card className="py-0">
      <CardContent className="p-2">
        <nav className="flex flex-col space-y-0.5 space-x-2 lg:space-x-0">
          {sidebarNavItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className={cn(
                "hover:bg-muted justify-start",
                pathname === item.href ? "bg-muted hover:bg-muted" : ""
              )}
              asChild>
              <Link href={item.href}>
                {item.icon && <item.icon />}
                {t(item.titleKey)}
              </Link>
            </Button>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}
