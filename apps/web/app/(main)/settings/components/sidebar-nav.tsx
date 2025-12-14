"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  ContrastIcon,
  CreditCardIcon,
  PaletteIcon,
  ShieldIcon,
  UserIcon
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const sidebarNavItems = [
  {
    title: "Account",
    href: "/settings/account",
    icon: ShieldIcon
  },
  /*{
    title: "Billing",
    href: "/settings/billing",
    icon: CreditCardIcon
  }*/
  {
    title: "Appearance",
    href: "/settings/appearance",
    icon: PaletteIcon
  },
  {
    title: "Notifications",
    href: "/settings/notifications",
    icon: BellIcon
  },
  {
    title: "Display",
    href: "/settings/display",
    icon: ContrastIcon
  }
];

export function SidebarNav() {
  const pathname = usePathname();

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
                {item.title}
              </Link>
            </Button>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}
