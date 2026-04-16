"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  MAX_PAYMENT_REQUEST_QR_SIZE_BYTES,
  paymentRequestQrImageSchema,
} from "@/features/payment-requests/schemas";
import { cn, isImageMimeType } from "@/lib/utils";

export type PaymentRequestQrDraft = {
  file: File;
  previewUrl: string;
};

export function PaymentRequestQrUploadField({
  disabled = false,
  error,
  existingFileName,
  existingFileType,
  existingFileUrl,
  onChange,
  onErrorChange,
  onRemoveExistingChange,
  removeExisting,
  value,
}: {
  disabled?: boolean;
  error?: string;
  existingFileName?: string | null;
  existingFileType?: string | null;
  existingFileUrl?: string | null;
  onChange: (nextValue: PaymentRequestQrDraft | null) => void;
  onErrorChange?: (error?: string) => void;
  onRemoveExistingChange: (nextValue: boolean) => void;
  removeExisting: boolean;
  value: PaymentRequestQrDraft | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const hasCurrentFile = Boolean(existingFileName && !removeExisting);

  const handleIncomingFile = (file?: File | null) => {
    if (!file) {
      return;
    }

    const parsedFile = paymentRequestQrImageSchema.safeParse(file);

    if (!parsedFile.success) {
      onErrorChange?.(
        parsedFile.error.issues[0]?.message ?? "Ảnh QR thanh toán không hợp lệ",
      );
      return;
    }

    onErrorChange?.(undefined);
    onRemoveExistingChange(false);
    onChange({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-[1.5rem] border border-dashed transition-colors px-5 py-6",
          isDragActive
            ? "border-primary/60 bg-primary/8"
            : "border-primary/25 bg-primary/5",
          disabled && "cursor-not-allowed opacity-70",
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
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-primary/10 text-primary">
            {value ? (
              <Image
                alt={value.file.name}
                className="size-14 object-cover"
                height={56}
                src={value.previewUrl}
                unoptimized
                width={56}
              />
            ) : hasCurrentFile && existingFileUrl && isImageMimeType(existingFileType) ? (
              <Image
                alt={existingFileName ?? "QR thanh toán"}
                className="size-14 object-cover"
                height={56}
                src={existingFileUrl}
                unoptimized
                width={56}
              />
            ) : (
              <UploadCloud className="size-6" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {value
                ? "Ảnh QR mới đã sẵn sàng"
                : hasCurrentFile
                  ? "Đang dùng QR thanh toán hiện tại"
                  : "Tải QR thanh toán cho đề nghị này"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {`Chỉ tải khi QR nhận tiền là của người khác, không phải QR của bạn. Chỉ chấp nhận ảnh, tối đa ${formatFileSize(MAX_PAYMENT_REQUEST_QR_SIZE_BYTES)}.`}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                className="h-10 px-3"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="secondary"
              >
                <ImagePlus className="size-4" />
                {value || hasCurrentFile ? "Chọn ảnh khác" : "Tải QR"}
              </Button>

              {value ? (
                <Button
                  className="h-10 px-3"
                  disabled={disabled}
                  onClick={() => {
                    onErrorChange?.(undefined);
                    onChange(null);
                  }}
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4 text-destructive" />
                  Xóa ảnh mới
                </Button>
              ) : null}

              {hasCurrentFile ? (
                <Button
                  className="h-10 px-3"
                  disabled={disabled}
                  onClick={() => {
                    onErrorChange?.(undefined);
                    onRemoveExistingChange(true);
                  }}
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4 text-destructive" />
                  Xóa QR hiện tại
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
