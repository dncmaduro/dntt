"use client";

import { useTransition } from "react";
import { BellRing, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markNotificationAsReadAction } from "@/features/notifications/actions";
import { formatDateTime } from "@/lib/utils";
import type { NotificationItem } from "@/features/payment-requests/types";

export function NotificationList({
  items,
  detailHrefBase,
}: {
  items: NotificationItem[];
  detailHrefBase: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!items.length) {
    return (
      <EmptyState
        action={null}
        description="Bạn chưa có thông báo nào trong hệ thống."
        icon={BellRing}
        title="Không có thông báo"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <Card key={item.id} className="rounded-[1.75rem]">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <button
              className="min-w-0 text-left"
              onClick={() =>
                startTransition(async () => {
                  if (!item.is_read) {
                    const result = await markNotificationAsReadAction(item.id);

                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                  }

                  router.push(
                    item.entity_id
                      ? `${detailHrefBase}/${item.entity_id}`
                      : "/notifications",
                  );
                  router.refresh();
                })
              }
              type="button"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{item.title}</p>
                {!item.is_read ? <Badge>Mới</Badge> : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.body}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {formatDateTime(item.created_at)}
              </p>
            </button>

            {!item.is_read ? (
              <Button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await markNotificationAsReadAction(item.id);

                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }

                    router.refresh();
                  })
                }
                type="button"
                variant="secondary"
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                Đánh dấu đã đọc
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
