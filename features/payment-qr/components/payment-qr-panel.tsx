"use client";

import Image from "next/image";
import { Expand, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROLE_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { SelectedEmployeePaymentQr } from "@/features/payment-qr/types";

export function PaymentQrPanel({
  employee,
  selectedCount,
  selectedTotalAmount,
}: {
  employee: SelectedEmployeePaymentQr;
  selectedCount?: number;
  selectedTotalAmount?: number;
}) {
  const hasQrPreview = Boolean(employee.qr_preview_url);
  const hasSavedQr = Boolean(employee.qr_payment_url);
  const hasSelection = Boolean(selectedCount && selectedCount > 0);
  const displayAmount = hasSelection
    ? selectedTotalAmount ?? 0
    : employee.unpaid_requests.total_amount;
  const displayCount = hasSelection
    ? selectedCount ?? 0
    : employee.unpaid_requests.total_items;

  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-white/80 p-5 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">QR thanh toán</p>
          <h2 className="text-2xl font-semibold leading-tight">
            {employee.full_name ?? "Chưa cập nhật họ tên"}
          </h2>
          <p className="text-sm text-muted-foreground">{ROLE_LABELS[employee.role]}</p>
        </div>
      </div>

      <div className="mt-5 flex min-h-[12rem] items-center justify-center lg:min-h-[18rem]">
        {hasQrPreview ? (
          <div className="space-y-3">
            <Dialog>
              <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-[1.5rem] border border-border/70 bg-white shadow-sm">
                <DialogTrigger asChild>
                  <Button
                    className="absolute right-3 top-3 z-10 bg-white/95 shadow-sm hover:bg-white"
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <Expand className="size-4" />
                    Phóng to QR
                  </Button>
                </DialogTrigger>
                <Image
                  alt={`QR thanh toán của ${employee.full_name ?? "nhân sự"}`}
                  className="object-contain p-4"
                  fill
                  loading="eager"
                  src={employee.qr_preview_url ?? ""}
                  unoptimized
                />
              </div>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{employee.full_name ?? "QR thanh toán"}</DialogTitle>
                  <DialogDescription>Mở lớn mã QR để thao tác chuyển khoản nhanh hơn.</DialogDescription>
                </DialogHeader>
                <div className="flex min-h-[65vh] items-center justify-center rounded-[1.75rem] border border-border/70 bg-muted/15 p-6">
                  <div className="relative aspect-square w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-border/70 bg-white shadow-sm">
                    <Image
                      alt={`QR thanh toán của ${employee.full_name ?? "nhân sự"}`}
                      className="object-contain p-6"
                      fill
                      src={employee.qr_preview_url ?? ""}
                      unoptimized
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="rounded-[1.25rem] border border-border/70 bg-white/85 px-4 py-3 text-center shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Số tiền cần chuyển
              </p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(displayAmount)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {displayCount} {hasSelection ? "đề nghị đang chọn" : "đề nghị đang chờ thanh toán"}
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <QrCode className="size-6" />
            </div>
            <p className="mt-4 text-lg font-semibold">
              {hasSavedQr ? "Chưa tải được bản xem trước của mã QR" : "Nhân sự này chưa cập nhật mã QR"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {hasSavedQr
                ? "Hồ sơ đã có mã QR nhưng hệ thống chưa tạo được liên kết xem trước. Hãy tải lại trang hoặc kiểm tra lại QR trong hồ sơ nhân sự."
                : "Yêu cầu nhân sự cập nhật ảnh QR trong hồ sơ trước khi thực hiện chi trả."}
            </p>
            <div className="mt-5 rounded-[1.25rem] border border-border/70 bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Số tiền cần chuyển
              </p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(displayAmount)}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
