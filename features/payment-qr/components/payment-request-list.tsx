"use client";

import { FileClock } from "lucide-react";

import { DataLoadingOverlay } from "@/components/shared/data-loading-overlay";
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
  if (!items.length) {
    return (
      <div
        aria-busy={isLoading || isSubmitting}
        className="relative flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 px-4 py-8 text-center"
      >
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileClock className="size-5" />
        </div>
        <p className="mt-3 font-medium">Không có đề nghị chờ thanh toán</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Không có đề nghị trong bộ lọc hiện tại.
        </p>
        <DataLoadingOverlay
          isLoading={isLoading || isSubmitting}
          label={isSubmitting ? "Đang cập nhật thanh toán" : undefined}
        />
      </div>
    );
  }

  return (
    <div
      aria-busy={isLoading || isSubmitting}
      className="relative space-y-3"
    >
      {items.map((request) => (
        <PaymentRequestItem
          key={request.id}
          checked={selectedIds.includes(request.id)}
          disabled={isSubmitting}
          onToggle={() => toggleRequest(request.id)}
          request={request}
        />
      ))}
      <DataLoadingOverlay
        isLoading={isLoading || isSubmitting}
        label={isSubmitting ? "Đang cập nhật thanh toán" : undefined}
      />
    </div>
  );
}
