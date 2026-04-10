"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_PAYMENT_BILL_SIZE_BYTES, paymentBillImageSchema } from "@/features/payment-requests/schemas";
import { cn } from "@/lib/utils";

export type PaymentBillDraft = {
  file: File;
  previewUrl: string;
};

export function PaymentBillUploadField({
  compact = false,
  disabled = false,
  error,
  helperText,
  onChange,
  onErrorChange,
  value,
}: {
  compact?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  onChange: (nextValue: PaymentBillDraft | null) => void;
  onErrorChange?: (error?: string) => void;
  value: PaymentBillDraft | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleIncomingFile = (file?: File | null) => {
    if (!file) {
      return;
    }

    const parsedFile = paymentBillImageSchema.safeParse(file);

    if (!parsedFile.success) {
      onErrorChange?.(
        parsedFile.error.issues[0]?.message ?? "Ảnh bill thanh toán không hợp lệ",
      );
      return;
    }

    onErrorChange?.(undefined);
    onChange({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-[1.5rem] border border-dashed transition-colors",
          isDragActive
            ? "border-primary/60 bg-primary/8"
            : "border-primary/25 bg-primary/5",
          disabled && "cursor-not-allowed opacity-70",
          compact ? "px-4 py-4 sm:px-5 sm:py-5" : "px-5 py-6",
        )}
        onDragEnter={(event) => {
          event.preventDefault();

          if (!disabled) {
            setIsDragActive(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragActive(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();

          if (!disabled) {
            setIsDragActive(true);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragActive(false);

          if (!disabled) {
            handleIncomingFile(event.dataTransfer.files?.[0]);
          }
        }}
      >
        <div className={cn("flex gap-4", compact ? "items-start gap-3" : "items-center") }>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-primary sm:size-14">
            {value ? (
              <div className="relative size-12 overflow-hidden rounded-3xl sm:size-14">
                <Image
                  alt={value.file.name}
                  className="object-cover"
                  fill
                  src={value.previewUrl}
                  unoptimized
                />
              </div>
            ) : (
              <UploadCloud className="size-6" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {value ? "Ảnh bill đã sẵn sàng" : "Kéo thả bill vào đây hoặc chọn từ thiết bị"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {helperText ??
                `Chỉ chấp nhận ảnh. Tối đa ${formatFileSize(MAX_PAYMENT_BILL_SIZE_BYTES)}.`}
            </p>

            {value ? (
              <div className="mt-2">
                <p className="line-clamp-1 text-sm font-medium">{value.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(value.file.size)}
                </p>
              </div>
            ) : null}

            <div className={cn("mt-4 flex flex-wrap gap-3", compact ? "mt-3" : "")}>
              <Button
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="secondary"
                className={compact ? "h-10 px-3" : undefined}
              >
                <ImagePlus className="size-4" />
                {value ? "Chọn ảnh khác" : "Tải bill"}
              </Button>

              {value ? (
                <Button
                  disabled={disabled}
                  onClick={() => {
                    onErrorChange?.(undefined);
                    onChange(null);
                  }}
                  type="button"
                  variant="ghost"
                  className={compact ? "h-10 px-3" : undefined}
                >
                  <Trash2 className="size-4 text-destructive" />
                  Xóa ảnh
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            handleIncomingFile(event.target.files?.[0]);
            event.target.value = "";
          }}
          type="file"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function formatFileSize(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))}KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)}MB`;
}
