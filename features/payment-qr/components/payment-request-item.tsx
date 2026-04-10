"use client";

import Image from "next/image";
import { Info, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/features/payment-requests/components/status-badge";
import type { PaymentQrRecentRequest } from "@/features/payment-qr/types";
import { type PaymentRequestStatus } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

export function PaymentRequestItem({
  request,
  checked,
  disabled,
  onToggle,
}: {
  request: PaymentQrRecentRequest;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-2.5 transition-colors ${
        checked
          ? "border-primary/50 bg-primary/5"
          : "border-border/70 bg-white hover:border-primary/30"
      } ${disabled ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <input
          checked={checked}
          className="mt-1.5 size-4 shrink-0 accent-[var(--color-primary)]"
          disabled={disabled}
          onChange={onToggle}
          type="checkbox"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium leading-6">{request.title}</p>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <p>Tạo lúc {formatDate(request.created_at)}</p>
                <p>Ngày thanh toán {formatDate(request.payment_date)}</p>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {formatCurrency(request.amount)}
                </p>
                <StatusBadge status={request.status as PaymentRequestStatus} />
              </div>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="h-10 shrink-0 rounded-2xl px-4"
                  disabled={disabled}
                  onClick={(event) => event.stopPropagation()}
                  type="button"
                  variant="outline"
                >
                  <Info className="size-4" />
                  Xem chi tiết
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{request.title}</DialogTitle>
                  <DialogDescription>
                    Chi tiết đề nghị thanh toán và minh chứng kèm theo.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 md:grid-cols-2">
                  <DetailTile label="Mã đề nghị" value={`#${request.id}`} />
                  <DetailTile label="Trạng thái" value={<StatusBadge status={request.status as PaymentRequestStatus} />} />
                  <DetailTile label="Ngày tạo" value={formatDate(request.created_at)} />
                  <DetailTile label="Ngày thanh toán" value={formatDate(request.payment_date)} />
                  <DetailTile label="Số tiền" value={formatCurrency(request.amount)} />
                  <DetailTile
                    label="Minh chứng"
                    value={
                      request.attachment_preview_url ? (
                        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                          <Image
                            alt={`Minh chứng của ${request.title}`}
                            className="object-cover"
                            fill
                            src={request.attachment_preview_url}
                            unoptimized
                          />
                        </div>
                      ) : request.attachment_file_name ? (
                        "Có minh chứng nhưng chưa tạo được ảnh xem trước"
                      ) : (
                        "Không có"
                      )
                    }
                  />
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <StickyNote className="size-4 text-muted-foreground" />
                    Ghi chú
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {request.note?.trim() ? request.note : "Không có ghi chú bổ sung"}
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {request.attachment_file_name ? (
            <p className="mt-1 text-xs text-muted-foreground">Có minh chứng đính kèm</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailTile({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/80 p-3">
      <p className="text-sm font-medium text-foreground/70">{label}</p>
      <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
