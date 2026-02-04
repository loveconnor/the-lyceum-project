import { BellIcon, BookOpen, Target, FlaskConical } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Notification, getNotificationIcon, getNotificationColor } from "@/types/notifications";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/i18n-provider";

const Notifications = () => {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  async function loadNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!mounted) {
    return (
      <Button size="icon" variant="ghost" className="relative">
        <BellIcon />
      </Button>
    );
  }

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="relative">
          <>
            <BellIcon className={cn(unreadCount > 0 && "animate-tada")} />
            {unreadCount > 0 && (
              <span className="bg-destructive absolute end-0 top-0 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={isMobile ? "center" : "end"} className="ms-4 w-96 p-0">
        <DropdownMenuLabel className="bg-background dark:bg-muted sticky top-0 z-10 p-0">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="font-medium">{t("notifications.dropdown.title")}</div>
            {unreadCount > 0 && (
              <span className="text-muted-foreground text-xs">
                {t("notifications.dropdown.unread", { count: unreadCount })}
              </span>
            )}
          </div>
        </DropdownMenuLabel>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {t("notifications.dropdown.loading")}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <BellIcon className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">{t("notifications.dropdown.empty.title")}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {t("notifications.dropdown.empty.subtitle")}
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => !item.is_read && markAsRead(item.id)}
                className={cn(
                  "group flex cursor-pointer items-start gap-3 rounded-none border-b px-4 py-3 transition-colors",
                  !item.is_read && "bg-muted/30"
                )}
              >
                <div className="flex-none pt-0.5">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    item.type === 'learning_reminder' && "bg-blue-100 dark:bg-blue-900/30",
                    item.type === 'path_completion' && "bg-green-100 dark:bg-green-900/30",
                    item.type === 'lab_completion' && "bg-green-100 dark:bg-green-900/30",
                    item.type === 'module_completion' && "bg-purple-100 dark:bg-purple-900/30",
                    item.type === 'streak_milestone' && "bg-orange-100 dark:bg-orange-900/30"
                  )}>
                    <span className="text-lg">{getNotificationIcon(item.type)}</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm leading-tight">
                      {item.title}
                    </div>
                    {!item.is_read && (
                      <div className="flex-shrink-0">
                        <span className="bg-primary block size-2 rounded-full" />
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs leading-relaxed">
                    {item.message}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1 text-[10px] mt-0.5">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Notifications;
