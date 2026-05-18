"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NOTIFICATION_PREVIEW_LIMIT } from "@/features/notifications/constants";
import { useNotifications } from "@/features/notifications/components/notifications-provider";
import {
  formatNotificationTime,
  getNotificationTypeLabel,
  getNotificationPaymentRequestSummary,
  resolveNotificationHref,
} from "@/features/notifications/utils";
import { APP_ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const {
    error,
    isMarkingAllRead,
    markingNotificationId,
    markAllAsRead,
    markAsRead,
    notifications,
    unreadCount,
    userRole,
  } = useNotifications();
  const previewNotifications = notifications.slice(0, NOTIFICATION_PREVIEW_LIMIT);

  const handleNotificationClick = (notificationId: string) => {
    const notification = notifications.find((item) => item.id === notificationId);

    if (!notification) {
      return;
    }

    setOpen(false);
    startTransition(async () => {
      if (!notification.is_read) {
        const isMarked = await markAsRead(notification.id);

        if (!isMarked) {
          return;
        }
      }

      const href = resolveNotificationHref(notification, userRole);

      if (href) {
        router.push(href);
      }
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllAsRead();
    });
  };

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Thông báo"
          className="relative size-11 rounded-2xl border border-border bg-white/80 p-0 shadow-sm transition hover:bg-white"
          size="icon"
          variant="ghost"
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[26rem] p-0">
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Thông báo</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Tất cả đã đọc"}
            </p>
          </div>

          {unreadCount > 0 ? (
            <Button
              className="h-8 px-3 text-xs"
              disabled={isMarkingAllRead || isPending}
              onClick={handleMarkAllAsRead}
              type="button"
              variant="ghost"
            >
              {isMarkingAllRead ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : null}
              Đánh dấu tất cả đã đọc
            </Button>
          ) : null}
        </div>

        <DropdownMenuSeparator />

        {error && !previewNotifications.length ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            Không thể tải thông báo
          </div>
        ) : previewNotifications.length ? (
          <div className="max-h-[28rem] space-y-2 overflow-y-auto p-2">
            {previewNotifications.map((item) => {
                const summary = getNotificationPaymentRequestSummary(item);

                return (
                  <button
                    className={cn(
                      "w-full rounded-[1.25rem] border px-3 py-3 text-left transition-colors",
                      item.is_read
                        ? "border-border/70 bg-muted/15 hover:bg-muted/35"
                        : "border-primary/25 bg-primary/12 shadow-sm hover:bg-primary/18",
                    )}
                    disabled={isPending}
                    key={item.id}
                    onClick={() => handleNotificationClick(item.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <p className="font-semibold text-foreground">
                          {getNotificationTypeLabel(item.type)}
                        </p>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          {summary.requestTitle ? (
                            <p className="truncate">Tiêu đề: {summary.requestTitle}</p>
                          ) : null}
                          {summary.creator ? (
                            <p className="truncate">Người tạo: {summary.creator}</p>
                          ) : null}
                        </div>
                      </div>

                      {markingNotificationId === item.id ? (
                        <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatNotificationTime(item.created_at)}</span>
                      {item.is_read ? <span>Đã đọc</span> : null}
                    </div>
                  </button>
                );
              })}
          </div>
        ) : (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            Chưa có thông báo
          </div>
        )}

        <DropdownMenuSeparator />

        <div className="p-2">
          <Button asChild className="w-full" variant="ghost">
            <Link href={APP_ROUTES.notifications} onClick={() => setOpen(false)}>
              Xem tất cả
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
