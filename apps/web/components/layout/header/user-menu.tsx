import { BadgeCheck, Bell, ChevronRightIcon, CreditCard, LogOut, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { useUserProfile } from "@/components/providers/user-provider";
import { getInitials } from "@/lib/user-profile";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function UserMenu() {
  const user = useUserProfile();
  const router = useRouter();
  const supabase = createClient();
  const initials = getInitials(user?.name, user?.email);
  const avatarSrc = user?.avatarUrl ?? "/images/avatars/01.png";
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar>
          <AvatarImage src={avatarSrc} alt={user?.name ?? "User avatar"} />
          <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-60" align="end">
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar>
              <AvatarImage src={avatarSrc} alt={user?.name ?? "User avatar"} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user?.name}</span>
              <span className="text-muted-foreground truncate text-xs">{user?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="https://shadcnuikit.com/pricing" target="_blank">
              <Sparkles /> Upgrade to Pro
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BadgeCheck />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
        <div className="bg-muted mt-1.5 rounded-md border">
          <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Credits</h4>
              <div className="text-muted-foreground flex cursor-pointer items-center text-sm">
                <span>5 left</span>
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </div>
            </div>
            <Progress value={40} indicatorColor="bg-primary" />
            <div className="text-muted-foreground flex items-center text-sm">
              Daily credits used first
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
