"use client";

import { useState, useTransition } from "react";
import { BellRing, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNotifications } from "@/features/notifications/components/notifications-provider";
import type { NotificationFilter } from "@/features/notifications/types";
import {
  formatNotificationTime,
  getNotificationTypeLabel,
  getNotificationPaymentRequestSummary,
  resolveNotificationHref,
} from "@/features/notifications/utils";
import { cn } from "@/lib/utils";

export function NotificationList() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
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
  const visibleNotifications =
    activeFilter === "unread"
      ? notifications.filter((item) => !item.is_read)
      : notifications;

  if (error && !notifications.length) {
    return (
      <Card className="rounded-[1.75rem] border-dashed">
        <CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
          Không thể tải thông báo
        </CardContent>
      </Card>
    );
  }

  if (!visibleNotifications.length) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-border bg-background p-1">
            <Button
              className="rounded-full"
              onClick={() => setActiveFilter("all")}
              size="sm"
              type="button"
              variant={activeFilter === "all" ? "default" : "ghost"}
            >
              Tất cả
            </Button>
            <Button
              className="rounded-full"
              onClick={() => setActiveFilter("unread")}
              size="sm"
              type="button"
              variant={activeFilter === "unread" ? "default" : "ghost"}
            >
              Chưa đọc
            </Button>
          </div>

          {unreadCount > 0 ? (
            <Button
              disabled={isMarkingAllRead || isPending}
              onClick={() =>
                startTransition(async () => {
                  await markAllAsRead();
                })
              }
              size="sm"
              type="button"
              variant="outline"
            >
              {isMarkingAllRead ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Đánh dấu tất cả đã đọc
            </Button>
          ) : null}
        </div>

        <EmptyState
          action={null}
          description={
            activeFilter === "unread" ? "Không có thông báo chưa đọc" : "Chưa có thông báo"
          }
          icon={BellRing}
          title="Thông báo"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-background p-1">
          <Button
            className="rounded-full"
            onClick={() => setActiveFilter("all")}
            size="sm"
            type="button"
            variant={activeFilter === "all" ? "default" : "ghost"}
          >
            Tất cả
          </Button>
          <Button
            className="rounded-full"
            onClick={() => setActiveFilter("unread")}
            size="sm"
            type="button"
            variant={activeFilter === "unread" ? "default" : "ghost"}
          >
            Chưa đọc
          </Button>
        </div>

        {unreadCount > 0 ? (
          <Button
            disabled={isMarkingAllRead || isPending}
            onClick={() =>
              startTransition(async () => {
                await markAllAsRead();
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            {isMarkingAllRead ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            Đánh dấu tất cả đã đọc
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4">
        {visibleNotifications.map((item) => {
          const summary = getNotificationPaymentRequestSummary(item);

          return (
            <Card
              className={cn(
                "rounded-[1.75rem] border transition-colors",
                item.is_read
                  ? "border-border/70"
                  : "border-primary/15 bg-primary/[0.035]",
              )}
              key={item.id}
            >
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() =>
                    startTransition(async () => {
                      if (!item.is_read) {
                        const isMarked = await markAsRead(item.id);

                        if (!isMarked) {
                          return;
                        }
                      }

                      const href = resolveNotificationHref(item, userRole);

                      if (href) {
                        router.push(href);
                      }
                    })
                  }
                  type="button"
                >
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      {getNotificationTypeLabel(item.type)}
                    </p>

                    <div className="space-y-1 text-sm leading-6 text-muted-foreground">
                      {summary.requestTitle ? (
                        <p>Tiêu đề: {summary.requestTitle}</p>
                      ) : null}
                      {summary.creator ? (
                        <p>Người tạo: {summary.creator}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatNotificationTime(item.created_at)}</span>
                    {item.is_read ? <span>Đã đọc</span> : null}
                  </div>
                </button>

                {!item.is_read ? (
                  <Button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await markAsRead(item.id);
                      })
                    }
                    type="button"
                    variant="secondary"
                  >
                    {markingNotificationId === item.id ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : null}
                    Đánh dấu đã đọc
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
