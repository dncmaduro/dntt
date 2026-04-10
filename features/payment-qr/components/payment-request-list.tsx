"use client";

import { FileClock } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PaymentRequestItem } from "@/features/payment-qr/components/payment-request-item";
import type { PaymentQrRecentRequest } from "@/features/payment-qr/types";

export function PaymentRequestList({
  isLoading,
  isSubmitting,
  items,
  selectedIds,
  toggleRequest,
}: {
  isLoading: boolean;
  isSubmitting: boolean;
  items: PaymentQrRecentRequest[];
  selectedIds: string[];
  toggleRequest: (requestId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/10 px-4 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <FileClock className="size-5" />
        </div>
        <p className="mt-3 font-medium">Không có đề nghị chờ thanh toán</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Nhân sự đang chọn không còn đề nghị nào trong bộ lọc hiện tại.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((request) => (
        <PaymentRequestItem
          key={request.id}
          checked={selectedIds.includes(request.id)}
          disabled={isSubmitting}
          onToggle={() => toggleRequest(request.id)}
          request={request}
        />
      ))}
    </div>
  );
}
