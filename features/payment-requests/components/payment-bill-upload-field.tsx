"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { FileImage, ImagePlus, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  MAX_PAYMENT_BILL_SIZE_BYTES,
  MAX_PAYMENT_BILLS,
  paymentBillImageSchema,
} from "@/features/payment-requests/schemas";
import { cn } from "@/lib/utils";

export type PaymentBillDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

export function PaymentBillUploadField({
  compact = false,
  disabled = false,
  error,
  helperText,
  maxFiles = MAX_PAYMENT_BILLS,
  onChange,
  onErrorChange,
  value,
}: {
  compact?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  maxFiles?: number;
  onChange: (nextValue: PaymentBillDraft[]) => void;
  onErrorChange?: (error?: string) => void;
  value: PaymentBillDraft[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const firstDraft = value[0] ?? null;

  const removeDraft = (draftId: string) => {
    const removedDraft = value.find((draft) => draft.id === draftId);

    if (removedDraft?.previewUrl) {
      URL.revokeObjectURL(removedDraft.previewUrl);
    }

    onErrorChange?.(undefined);
    onChange(value.filter((draft) => draft.id !== draftId));
  };

  const handleIncomingFiles = (incomingFiles?: FileList | File[] | null) => {
    const files = Array.from(incomingFiles ?? []);

    if (!files.length) {
      return;
    }

    const remainingSlots = Math.max(maxFiles - value.length, 0);

    if (!remainingSlots) {
      onErrorChange?.(`Chỉ được tải tối đa ${maxFiles} bill thanh toán`);
      return;
    }

    if (files.length > remainingSlots) {
      onErrorChange?.(`Chỉ được tải tối đa ${maxFiles} bill thanh toán`);
    }

    const nextDrafts: PaymentBillDraft[] = [];

    for (const file of files.slice(0, remainingSlots)) {
      const parsedFile = paymentBillImageSchema.safeParse(file);

      if (!parsedFile.success) {
        nextDrafts.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
        onErrorChange?.(
          parsedFile.error.issues[0]?.message ?? "Ảnh bill thanh toán không hợp lệ",
        );
        return;
      }

      nextDrafts.push({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    onErrorChange?.(undefined);
    onChange([...value, ...nextDrafts]);
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
            handleIncomingFiles(event.dataTransfer.files);
          }
        }}
      >
        <div className={cn("flex gap-4", compact ? "items-start gap-3" : "items-center")}>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-primary sm:size-14">
            {firstDraft ? (
              <div className="relative size-12 overflow-hidden rounded-3xl sm:size-14">
                <Image
                  alt={firstDraft.file.name}
                  className="object-cover"
                  fill
                  src={firstDraft.previewUrl}
                  unoptimized
                />
              </div>
            ) : (
              <UploadCloud className="size-6" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {value.length
                ? `Đã chọn ${value.length}/${maxFiles} bill`
                : "Kéo thả bill vào đây hoặc chọn từ thiết bị"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {helperText ??
                `Chỉ chấp nhận ảnh. Tối đa ${formatFileSize(MAX_PAYMENT_BILL_SIZE_BYTES)} mỗi bill.`}
            </p>

            <div className={cn("mt-4 flex flex-wrap gap-3", compact ? "mt-3" : "")}>
              <Button
                className={compact ? "h-10 px-3" : undefined}
                disabled={disabled || value.length >= maxFiles}
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="secondary"
              >
                <ImagePlus className="size-4" />
                {value.length ? "Thêm bill" : "Tải bill"}
              </Button>

              {value.length ? (
                <Button
                  className={compact ? "h-10 px-3" : undefined}
                  disabled={disabled}
                  onClick={() => {
                    value.forEach((draft) => {
                      if (draft.previewUrl) {
                        URL.revokeObjectURL(draft.previewUrl);
                      }
                    });
                    onErrorChange?.(undefined);
                    onChange([]);
                  }}
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4 text-destructive" />
                  Xóa tất cả
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
          multiple={maxFiles > 1}
          onChange={(event) => {
            handleIncomingFiles(event.target.files);
            event.target.value = "";
          }}
          type="file"
        />
      </div>

      {value.length ? (
        <div className="grid gap-3">
          {value.map((draft) => (
            <div
              key={draft.id}
              className="flex items-center gap-3 rounded-[1.25rem] border border-border/70 bg-white/70 p-3"
            >
              <div className="relative size-14 overflow-hidden rounded-2xl bg-muted">
                <Image
                  alt={draft.file.name}
                  className="object-cover"
                  fill
                  src={draft.previewUrl}
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{draft.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(draft.file.size)}
                </p>
              </div>
              <Button
                className={compact ? "h-9 px-3" : undefined}
                disabled={disabled}
                onClick={() => removeDraft(draft.id)}
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-4 text-destructive" />
                Xóa
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileImage className="size-4" />
          Chưa có bill nào được chọn
        </div>
      )}

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
