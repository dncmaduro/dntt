'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Info,
  LoaderCircle,
  Paperclip,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  createPaymentRequestAction,
  updatePaymentRequestAction,
} from '@/features/payment-requests/actions';
import {
  MAX_ATTACHMENTS,
  paymentRequestFormSchema,
} from '@/features/payment-requests/schemas';
import {
  PaymentRequestQrUploadField,
  type PaymentRequestQrDraft,
} from '@/features/payment-requests/components/payment-request-qr-upload-field';
import type {
  AttachmentWithUrl,
  Category,
  SubCategory,
} from '@/features/payment-requests/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { isImageMimeType } from '@/lib/utils';

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
  initialCreatorPaidBefore = true,
  initialCategoryId,
  existingAttachments = [],
  existingPaymentQr,
  hasProfileQr = false,
}: {
  categories: Category[];
  subCategories: SubCategory[];
  mode: 'create' | 'edit';
  requestId?: string;
  initialValues?: Partial<FormValues>;
  initialCreatorPaidBefore?: boolean;
  initialCategoryId?: string | null;
  existingAttachments?: AttachmentWithUrl[];
  existingPaymentQr?: {
    fileName: string | null;
    fileType: string | null;
    signedUrl: string | null;
  };
  hasProfileQr?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverErrors, setServerErrors] = useState<
    Record<string, string[] | undefined>
  >({});
  const [selectedFiles, setSelectedFiles] = useState<DraftFile[]>([]);
  const [retainedAttachments, setRetainedAttachments] =
    useState<AttachmentWithUrl[]>(existingAttachments);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>(
    [],
  );
  const [paymentQrDraft, setPaymentQrDraft] =
    useState<PaymentRequestQrDraft | null>(null);
  const [removeExistingPaymentQr, setRemoveExistingPaymentQr] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialCategoryId ?? '',
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(paymentRequestFormSchema),
    defaultValues: {
      title: initialValues?.title ?? '',
      amount: initialValues?.amount ?? undefined,
      description: initialValues?.description ?? '',
      payment_date: initialValues?.payment_date ?? null,
      creator_paid_before:
        initialValues?.creator_paid_before ?? initialCreatorPaidBefore,
      sub_category_id: initialValues?.sub_category_id ?? '',
    },
  });
  const creatorPaidBefore = useWatch({
    control: form.control,
    name: 'creator_paid_before',
  });
  const paymentDateValue = useWatch({
    control: form.control,
    name: 'payment_date',
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

  useEffect(() => {
    if (!creatorPaidBefore) {
      form.setValue('payment_date', null, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [creatorPaidBefore, form]);

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
    event.target.value = '';
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

    const hasAvailableQr = Boolean(
      paymentQrDraft ||
      (!removeExistingPaymentQr && existingPaymentQr?.fileName) ||
      hasProfileQr,
    );

    if (!values.creator_paid_before && !hasAvailableQr) {
      const message =
        'Vui lòng cung cấp QR thanh toán để kế toán có thể chuyển khoản cho đề nghị này.';

      setServerErrors((current) => ({
        ...current,
        payment_qr: [message],
      }));
      toast.error(message);
      return;
    }

    const formData = new FormData();
    formData.set('title', values.title);
    formData.set('amount', values.amount == null ? '' : String(values.amount));
    formData.set('description', values.description ?? '');
    if (values.creator_paid_before && values.payment_date) {
      formData.set('payment_date', values.payment_date);
    }
    formData.set(
      'creator_paid_before',
      values.creator_paid_before ? 'true' : 'false',
    );
    formData.set('sub_category_id', values.sub_category_id);
    formData.set('removePaymentQr', removeExistingPaymentQr ? 'true' : 'false');

    selectedFiles.forEach((draft) => {
      formData.append('attachments', draft.file);
    });

    removedAttachmentIds.forEach((attachmentId) => {
      formData.append('removeAttachmentIds', attachmentId);
    });

    if (paymentQrDraft) {
      formData.set('payment_qr', paymentQrDraft.file);
    }

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createPaymentRequestAction(formData)
          : await updatePaymentRequestAction(requestId ?? '', formData);

      if (!result.success) {
        setServerErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? 'Đã lưu đề nghị');
      const destination =
        mode === 'create'
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
        kind: 'existing' as const,
      })),
      ...selectedFiles.map((draft) => ({
        id: draft.id,
        name: draft.file.name,
        type: draft.file.type,
        previewUrl: draft.previewUrl,
        kind: 'new' as const,
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
            <Input
              id="title"
              placeholder="Ví dụ: Thanh toán chi phí công tác"
              {...form.register('title')}
            />
            <FieldError
              error={
                form.formState.errors.title?.message || serverErrors.title?.[0]
              }
            />
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

          <div className="space-y-2 md:col-span-2">
            <FieldLabelWithTooltip
              htmlFor="creator_paid_before"
              tooltip="Nếu bạn đã tự thanh toán trước khoản này, hãy bật lựa chọn để nhập ngày thanh toán. Nếu chưa, hãy tắt lựa chọn và cung cấp QR để bộ phận kế toán chuyển khoản."
            >
              Trạng thái thanh toán
            </FieldLabelWithTooltip>
            <label className="flex items-start gap-3 rounded-[1.5rem] border border-border/70 bg-white/75 px-4 py-4">
              <input
                className="mt-1 size-4 accent-[var(--color-primary)]"
                type="checkbox"
                {...form.register('creator_paid_before')}
              />
              <span className="space-y-1">
                <span className="block font-medium text-foreground">
                  Tôi đã thanh toán trước khoản này
                </span>
                <span className="block text-sm leading-6 text-muted-foreground">
                  Bật nếu bạn cần hoàn ứng. Tắt nếu kế toán sẽ thanh toán bằng
                  QR.
                </span>
              </span>
            </label>
          </div>

          {creatorPaidBefore ? (
            <div className="space-y-2">
              <FieldLabel htmlFor="payment_date" required>
                Ngày thanh toán
              </FieldLabel>
              <Input
                id="payment_date"
                type="date"
                {...form.register('payment_date')}
                value={paymentDateValue ?? ''}
              />
              <FieldError
                error={
                  form.formState.errors.payment_date?.message ||
                  serverErrors.payment_date?.[0]
                }
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <FieldLabel required>Danh mục</FieldLabel>
            <Select
              onValueChange={(value) => {
                const nextCategoryId = value;
                setSelectedCategoryId(nextCategoryId);
                form.setValue('sub_category_id', '', {
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
                  ? 'Vui lòng chọn danh mục'
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
            <FieldLabel htmlFor="description" required>
              Mô tả
            </FieldLabel>
            <Textarea
              id="description"
              placeholder="Trình bày ngắn gọn nội dung thanh toán, bối cảnh phát sinh, hoặc đầu mục chi phí."
              {...form.register('description')}
            />
            <FieldError
              error={
                form.formState.errors.description?.message ||
                serverErrors.description?.[0]
              }
            />
          </div>

          {!creatorPaidBefore ? (
            <div className="space-y-2 md:col-span-2">
              <FieldLabelWithTooltip
                tooltip={
                  hasProfileQr
                    ? 'Nếu không tải QR riêng cho đề nghị này, hệ thống sẽ tiếp tục dùng QR mặc định trong hồ sơ của bạn.'
                    : 'Tải QR khi bộ phận kế toán cần chuyển khoản theo mã QR cho đề nghị này.'
                }
              >
                QR thanh toán
              </FieldLabelWithTooltip>
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
          ) : null}
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
            <p className="mt-4 font-medium">
              Tải ảnh hóa đơn, biên lai hoặc PDF
            </p>
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
                        item.kind === 'existing'
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
            {mode === 'create' ? 'Tạo đề nghị' : 'Lưu thay đổi'}
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

function FieldLabelWithTooltip({
  children,
  tooltip,
  required = false,
  ...props
}: React.ComponentProps<typeof Label> & {
  tooltip: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <FieldLabel required={required} {...props}>
        {children}
      </FieldLabel>
      <InfoTooltip content={tooltip} />
    </div>
  );
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        aria-label="Xem giải thích"
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        type="button"
      >
        <Info className="size-4" />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-border/70 bg-background px-3 py-2 text-xs leading-5 text-muted-foreground opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {content}
      </span>
    </span>
  );
}

function RequiredMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={className ?? 'ml-1'}>
      *
    </span>
  );
}
