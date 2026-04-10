"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export function PaymentSelectionSummary({
  disabled,
  isSubmitting,
  onConfirm,
  selectedCount,
  selectedTotalAmount,
}: {
  disabled: boolean;
  onConfirm: () => void;
  selectedCount: number;
  selectedTotalAmount: number;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur md:fixed md:right-6 md:bottom-6 md:z-50 md:mt-0 md:w-full md:max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-semibold">Đã chọn {selectedCount} đề nghị</p>
          <p className="text-muted-foreground">Số tiền cần chuyển {formatCurrency(selectedTotalAmount)}</p>
        </div>

        <Button disabled={disabled || isSubmitting} onClick={onConfirm} type="button">
          {isSubmitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Xác nhận đã thanh toán
        </Button>
      </div>
    </div>
  );
}
