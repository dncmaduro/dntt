"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LoaderCircle, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createPaymentRequestAction,
  updatePaymentRequestAction,
} from "@/features/payment-requests/actions";
import {
  MAX_ATTACHMENTS,
  paymentRequestFormSchema,
} from "@/features/payment-requests/schemas";
import {
  PaymentRequestQrUploadField,
  type PaymentRequestQrDraft,
} from "@/features/payment-requests/components/payment-request-qr-upload-field";
import type {
  AttachmentWithUrl,
  Category,
  SubCategory,
} from "@/features/payment-requests/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isImageMimeType } from "@/lib/utils";

type FormValues = z.infer<typeof paymentRequestFormSchema>;

type DraftFile = {
  id: string;
  file: File;
  previewUrl: string | null;
};

export function RequestForm({
  categories,
  subCategories,
  mode,
  requestId,
  initialValues,
  initialCategoryId,
  existingAttachments = [],
  existingPaymentQr,
}: {
  categories: Category[];
  subCategories: SubCategory[];
  mode: "create" | "edit";
  requestId?: string;
  initialValues?: Partial<FormValues>;
  initialCategoryId?: string | null;
  existingAttachments?: AttachmentWithUrl[];
  existingPaymentQr?: {
    fileName: string | null;
    fileType: string | null;
    signedUrl: string | null;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverErrors, setServerErrors] = useState<Record<string, string[] | undefined>>(
    {},
  );
  const [selectedFiles, setSelectedFiles] = useState<DraftFile[]>([]);
  const [retainedAttachments, setRetainedAttachments] =
    useState<AttachmentWithUrl[]>(existingAttachments);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [paymentQrDraft, setPaymentQrDraft] = useState<PaymentRequestQrDraft | null>(null);
  const [removeExistingPaymentQr, setRemoveExistingPaymentQr] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId ?? "");

  const form = useForm<FormValues>({
    resolver: zodResolver(paymentRequestFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      amount: initialValues?.amount ?? undefined,
      description: initialValues?.description ?? "",
      payment_date: initialValues?.payment_date ?? "",
      sub_category_id: initialValues?.sub_category_id ?? "",
    },
  });

  useEffect(() => {
    return () => {
      selectedFiles.forEach((draft) => {
        if (draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
      });

      if (paymentQrDraft?.previewUrl) {
        URL.revokeObjectURL(paymentQrDraft.previewUrl);
      }
    };
  }, [paymentQrDraft, selectedFiles]);

  const totalAttachments = retainedAttachments.length + selectedFiles.length;
  const availableSubCategories = useMemo(
    () =>
      selectedCategoryId
        ? subCategories.filter(
            (subCategory) => subCategory.category_id === selectedCategoryId,
          )
        : [],
    [selectedCategoryId, subCategories],
  );

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    const availableSlots = Math.max(MAX_ATTACHMENTS - totalAttachments, 0);
    const nextFiles = incoming.slice(0, availableSlots);

    if (incoming.length > availableSlots) {
      toast.error(`Chỉ có thể tải tối đa ${MAX_ATTACHMENTS} tệp.`);
    }

    const drafts = nextFiles.map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      previewUrl: isImageMimeType(file.type) ? URL.createObjectURL(file) : null,
    }));

    setSelectedFiles((current) => [...current, ...drafts]);
    event.target.value = "";
  };

  const removeDraftFile = (draftId: string) => {
    setSelectedFiles((current) => {
      const next = current.filter((draft) => draft.id !== draftId);
      const removed = current.find((draft) => draft.id === draftId);

      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      return next;
    });
  };

  const removeExistingAttachment = (attachmentId: string) => {
    setRetainedAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId),
    );
    setRemovedAttachmentIds((current) => [...current, attachmentId]);
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerErrors({});

    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("amount", values.amount == null ? "" : String(values.amount));
    formData.set("description", values.description ?? "");
    formData.set("payment_date", values.payment_date);
    formData.set("sub_category_id", values.sub_category_id);
    formData.set("removePaymentQr", removeExistingPaymentQr ? "true" : "false");

    selectedFiles.forEach((draft) => {
      formData.append("attachments", draft.file);
    });

    removedAttachmentIds.forEach((attachmentId) => {
      formData.append("removeAttachmentIds", attachmentId);
    });

    if (paymentQrDraft) {
      formData.set("payment_qr", paymentQrDraft.file);
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPaymentRequestAction(formData)
          : await updatePaymentRequestAction(requestId ?? "", formData);

      if (!result.success) {
        setServerErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Đã lưu đề nghị");
      const destination =
        mode === "create"
          ? `/my-requests/${result.data?.id}`
          : `/my-requests/${requestId}`;
      router.push(destination);
      router.refresh();
    });
  });

  const attachmentPreviewItems = useMemo(
    () => [
      ...retainedAttachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.file_name,
        type: attachment.file_type,
        previewUrl: attachment.signed_url,
        kind: "existing" as const,
      })),
      ...selectedFiles.map((draft) => ({
        id: draft.id,
        name: draft.file.name,
        type: draft.file.type,
        previewUrl: draft.previewUrl,
        kind: "new" as const,
      })),
    ],
    [retainedAttachments, selectedFiles],
  );

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle className="text-xl">Thông tin đề nghị</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <FieldLabel htmlFor="title" required>
              Tiêu đề
            </FieldLabel>
            <Input id="title" placeholder="Ví dụ: Thanh toán chi phí công tác" {...form.register("title")} />
            <FieldError error={form.formState.errors.title?.message || serverErrors.title?.[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Số tiền</Label>
            <Controller
              control={form.control}
              name="amount"
              render={({ field }) => (
                <CurrencyInput
                  id="amount"
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder="Ví dụ: 1.500.000"
                  value={field.value ?? null}
                />
              )}
            />
            <FieldError
              error={
                form.formState.errors.amount?.message ||
                serverErrors.amount?.[0]
              }
            />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="payment_date" required>
              Ngày thanh toán
            </FieldLabel>
            <Input id="payment_date" type="date" {...form.register("payment_date")} />
            <FieldError
              error={
                form.formState.errors.payment_date?.message ||
                serverErrors.payment_date?.[0]
              }
            />
          </div>

          <div className="space-y-2">
            <FieldLabel required>Danh mục</FieldLabel>
            <Select
              onValueChange={(value) => {
                const nextCategoryId = value;
                setSelectedCategoryId(nextCategoryId);
                form.setValue("sub_category_id", "", {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
              }}
              value={selectedCategoryId || undefined}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError
              error={
                form.formState.submitCount > 0 && !selectedCategoryId
                  ? "Vui lòng chọn danh mục"
                  : undefined
              }
            />
          </div>

          <div className="space-y-2">
            <FieldLabel required>Danh mục con</FieldLabel>
            <Controller
              control={form.control}
              name="sub_category_id"
              render={({ field }) => (
                <Select
                  disabled={!selectedCategoryId}
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục con" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubCategories.map((subCategory) => (
                      <SelectItem key={subCategory.id} value={subCategory.id}>
                        {subCategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError
              error={
                form.formState.errors.sub_category_id?.message ||
                serverErrors.sub_category_id?.[0]
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              placeholder="Trình bày ngắn gọn nội dung thanh toán, bối cảnh phát sinh, hoặc đầu mục chi phí."
              {...form.register("description")}
            />
            <FieldError
              error={
                form.formState.errors.description?.message ||
                serverErrors.description?.[0]
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>QR thanh toán</Label>
            <PaymentRequestQrUploadField
              disabled={isPending}
              error={serverErrors.payment_qr?.[0]}
              existingFileName={existingPaymentQr?.fileName}
              existingFileType={existingPaymentQr?.fileType}
              existingFileUrl={existingPaymentQr?.signedUrl}
              onChange={(nextValue) => {
                if (paymentQrDraft?.previewUrl) {
                  URL.revokeObjectURL(paymentQrDraft.previewUrl);
                }

                setPaymentQrDraft(nextValue);
              }}
              onErrorChange={(error) => {
                setServerErrors((current) => ({
                  ...current,
                  payment_qr: error ? [error] : undefined,
                }));
              }}
              onRemoveExistingChange={setRemoveExistingPaymentQr}
              removeExisting={removeExistingPaymentQr}
              value={paymentQrDraft}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle className="text-xl">
            Chứng từ đính kèm
            <RequiredMark className="ml-1" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-primary/30 bg-primary/5 px-5 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <UploadCloud className="size-6" />
            </div>
            <p className="mt-4 font-medium">Tải ảnh hóa đơn, biên lai hoặc PDF</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Tối đa {MAX_ATTACHMENTS} tệp, mỗi tệp không quá 10MB.
            </p>
            <input
              accept="image/*,application/pdf"
              className="hidden"
              multiple
              onChange={onFileChange}
              type="file"
            />
          </label>

          <FieldError error={serverErrors.attachments?.[0]} />

          {attachmentPreviewItems.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {attachmentPreviewItems.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-white/70"
                >
                  <div className="relative aspect-[4/3] bg-muted/45">
                    {item.previewUrl && isImageMimeType(item.type) ? (
                      <Image
                        alt={item.name}
                        className="object-cover"
                        fill
                        src={item.previewUrl}
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Paperclip className="size-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end p-4">
                    <Button
                      onClick={() =>
                        item.kind === "existing"
                          ? removeExistingAttachment(item.id)
                          : removeDraftFile(item.id)
                      }
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 px-5 py-6 text-sm text-muted-foreground">
              Chưa có tệp nào được chọn.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 rounded-[1.75rem] border border-border/70 bg-background/92 p-4 shadow-lg backdrop-blur-xl md:mb-8 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button onClick={() => router.back()} type="button" variant="ghost">
            Hủy
          </Button>
          <Button disabled={isPending} type="submit">
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {mode === "create" ? "Tạo đề nghị" : "Lưu thay đổi"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="text-sm text-destructive">{error}</p> : null;
}

function FieldLabel({
  children,
  required = false,
  ...props
}: React.ComponentProps<typeof Label> & {
  required?: boolean;
}) {
  return (
    <Label {...props}>
      {children}
      {required ? <RequiredMark className="ml-1" /> : null}
    </Label>
  );
}

function RequiredMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={className ?? "ml-1"}
    >
      *
    </span>
  );
}
