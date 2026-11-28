"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { FileText, LoaderCircle, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createPrivatePaymentRequestAction } from "@/features/private-requests/actions";
import {
  MAX_ATTACHMENTS,
  privatePaymentRequestFormSchema,
} from "@/features/private-requests/schemas";
import type { Category, SubCategory } from "@/features/private-requests/types";
import { APP_ROUTES } from "@/lib/constants";
import { isImageMimeType } from "@/lib/utils";

type FormValues = z.infer<typeof privatePaymentRequestFormSchema>;

type DraftFile = {
  id: string;
  file: File;
  previewUrl: string | null;
};

export function PrivateRequestForm({
  categories,
  subCategories,
}: {
  categories: Category[];
  subCategories: SubCategory[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverErrors, setServerErrors] = useState<
    Record<string, string[] | undefined>
  >({});
  const [selectedFiles, setSelectedFiles] = useState<DraftFile[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(privatePaymentRequestFormSchema),
    defaultValues: {
      title: "",
      amount: undefined,
      description: "",
      payment_date: null,
      sub_category_id: "",
    },
  });

  useEffect(() => {
    return () => {
      selectedFiles.forEach((draft) => {
        if (draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
      });
    };
  }, [selectedFiles]);

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
    const availableSlots = Math.max(MAX_ATTACHMENTS - selectedFiles.length, 0);
    const nextFiles = incoming.slice(0, availableSlots);

    if (incoming.length > availableSlots) {
      toast.error(`Chỉ có thể tải tối đa ${MAX_ATTACHMENTS} tệp.`);
    }

    setSelectedFiles((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        previewUrl: isImageMimeType(file.type)
          ? URL.createObjectURL(file)
          : null,
      })),
    ]);
    event.target.value = "";
  };

  const removeDraftFile = (draftId: string) => {
    setSelectedFiles((current) => {
      const removed = current.find((draft) => draft.id === draftId);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return current.filter((draft) => draft.id !== draftId);
    });
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerErrors({});
    const formData = new FormData();
    formData.set("title", values.title);
    formData.set("amount", values.amount == null ? "" : String(values.amount));
    formData.set("description", values.description);
    formData.set("payment_date", values.payment_date ?? "");
    formData.set("sub_category_id", values.sub_category_id);
    selectedFiles.forEach((draft) => formData.append("attachments", draft.file));

    startTransition(async () => {
      const result = await createPrivatePaymentRequestAction(formData);

      if (!result.success) {
        setServerErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Đã tạo DNTT riêng");
      router.push(`${APP_ROUTES.privateDashboard}/${result.data?.id}`);
      router.refresh();
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl">Thông tin DNTT riêng</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <FieldLabel htmlFor="private-title" required>
              Tiêu đề
            </FieldLabel>
            <Input
              id="private-title"
              placeholder="Ví dụ: Chi phí tiếp khách"
              {...form.register("title")}
            />
            <FieldError
              error={form.formState.errors.title?.message || serverErrors.title?.[0]}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="private-amount">Số tiền</FieldLabel>
            <Controller
              control={form.control}
              name="amount"
              render={({ field }) => (
                <CurrencyInput
                  id="private-amount"
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  placeholder="Ví dụ: 1.500.000"
                  value={field.value ?? null}
                />
              )}
            />
            <FieldError error={form.formState.errors.amount?.message} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="private-payment-date">Ngày phát sinh</FieldLabel>
            <Input
              id="private-payment-date"
              type="date"
              {...form.register("payment_date")}
            />
            <FieldError error={form.formState.errors.payment_date?.message} />
          </div>

          <div className="space-y-2">
            <FieldLabel required>Danh mục</FieldLabel>
            <NativeSelect
              aria-label="Danh mục"
              onChange={(event) => {
                setSelectedCategoryId(event.target.value);
                form.setValue("sub_category_id", "", {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              value={selectedCategoryId}
            >
              <option value="">Chọn danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <FieldLabel required>Danh mục con</FieldLabel>
            <Controller
              control={form.control}
              name="sub_category_id"
              render={({ field }) => (
                <NativeSelect
                  aria-label="Danh mục con"
                  disabled={!selectedCategoryId}
                  onChange={field.onChange}
                  value={field.value || ""}
                >
                  <option value="">Chọn danh mục con</option>
                  {availableSubCategories.map((subCategory) => (
                    <option key={subCategory.id} value={subCategory.id}>
                      {subCategory.name}
                    </option>
                  ))}
                </NativeSelect>
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
            <FieldLabel htmlFor="private-description" required>
              Mô tả
            </FieldLabel>
            <Textarea
              id="private-description"
              placeholder="Mô tả nội dung khoản chi."
              {...form.register("description")}
            />
            <FieldError
              error={
                form.formState.errors.description?.message ||
                serverErrors.description?.[0]
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl">
            Chứng từ đính kèm <RequiredMark />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-primary/30 bg-primary/5 px-5 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UploadCloud className="size-6" />
            </div>
            <p className="mt-4 font-medium">Tải ảnh hóa đơn, biên lai hoặc PDF</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Tối đa {MAX_ATTACHMENTS} tệp, mỗi tệp không quá 10MB.
            </p>
            <input
              accept="image/*,application/pdf"
              className="hidden"
              disabled={isPending}
              multiple
              onChange={onFileChange}
              type="file"
            />
          </label>
          <FieldError error={serverErrors.attachments?.[0]} />

          {selectedFiles.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {selectedFiles.map((draft) => (
                <div
                  className="overflow-hidden rounded-lg border border-border bg-card"
                  key={draft.id}
                >
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted/45">
                    {draft.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={draft.file.name}
                        className="h-full w-full object-cover"
                        src={draft.previewUrl}
                      />
                    ) : (
                      <FileText className="size-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <Paperclip className="size-4 shrink-0" />
                      <span className="truncate">{draft.file.name}</span>
                    </span>
                    <Button
                      onClick={() => removeDraftFile(draft.id)}
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
            <div className="rounded-lg border border-border bg-muted/25 px-5 py-6 text-sm text-muted-foreground">
              Chưa có tệp nào được chọn.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button onClick={() => router.back()} type="button" variant="ghost">
          Hủy
        </Button>
        <Button disabled={isPending} type="submit">
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Tạo DNTT riêng
        </Button>
      </div>
    </form>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? (
    <p className="text-sm text-destructive" role="alert">
      {error}
    </p>
  ) : null;
}

function FieldLabel({
  children,
  required = false,
  ...props
}: React.ComponentProps<typeof Label> & { required?: boolean }) {
  return (
    <Label {...props}>
      {children}
      {required ? <RequiredMark /> : null}
    </Label>
  );
}

function RequiredMark() {
  return <span className="ml-1" aria-hidden="true">*</span>;
}
