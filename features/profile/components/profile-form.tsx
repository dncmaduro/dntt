"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  LoaderCircle,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateProfileAction } from "@/features/profile/actions";
import {
  MAX_PROFILE_QR_SIZE_BYTES,
  profileDetailsSchema,
  profileQrImageSchema,
  type ProfileDetailsValues,
} from "@/features/profile/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DraftQrImage = {
  file: File;
  previewUrl: string;
};

export function ProfileForm({
  defaultValues,
  currentQrImageUrl,
  hasCurrentQr,
}: {
  defaultValues: ProfileDetailsValues;
  currentQrImageUrl: string | null;
  hasCurrentQr: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverErrors, setServerErrors] = useState<Record<string, string[] | undefined>>(
    {},
  );
  const [draftQrImage, setDraftQrImage] = useState<DraftQrImage | null>(null);
  const [qrImageError, setQrImageError] = useState<string>();
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileDetailsValues>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  useEffect(() => {
    return () => {
      if (draftQrImage?.previewUrl) {
        URL.revokeObjectURL(draftQrImage.previewUrl);
      }
    };
  }, [draftQrImage]);

  const clearDraftQrImage = () => {
    setDraftQrImage((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });
    setQrImageError(undefined);
  };

  const handleIncomingFile = (file?: File | null) => {
    if (!file) {
      return;
    }

    const parsedFile = profileQrImageSchema.safeParse(file);

    if (!parsedFile.success) {
      clearDraftQrImage();
      setQrImageError(
        parsedFile.error.issues[0]?.message ?? "Ảnh QR không hợp lệ",
      );
      return;
    }

    setServerErrors((current) => ({ ...current, qr_image: undefined }));
    setQrImageError(undefined);
    setDraftQrImage((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return {
        file,
        previewUrl: URL.createObjectURL(file),
      };
    });
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleIncomingFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerErrors({});

    if (qrImageError) {
      toast.error(qrImageError);
      return;
    }

    const formData = new FormData();
    formData.set("full_name", values.full_name);

    if (draftQrImage?.file) {
      formData.set("qr_image", draftQrImage.file);
    }

    startTransition(async () => {
      const result = await updateProfileAction(formData);

      if (!result.success) {
        setServerErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      form.reset(values);
      clearDraftQrImage();
      toast.success(result.message ?? "Đã cập nhật hồ sơ");
      router.refresh();
    });
  });

  const previewImageUrl = draftQrImage?.previewUrl ?? currentQrImageUrl;
  const previewLabel = draftQrImage
    ? "Ảnh mới đã chọn"
    : hasCurrentQr
      ? "Ảnh QR hiện tại"
      : "Chưa có ảnh QR";
  const qrFieldError = qrImageError || serverErrors.qr_image?.[0];

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle className="text-xl">Thông tin cá nhân</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="full_name">Họ và tên</Label>
            <Input
              id="full_name"
              placeholder="Nguyễn Văn A"
              {...form.register("full_name")}
            />
            <FieldError
              error={
                form.formState.errors.full_name?.message ||
                serverErrors.full_name?.[0]
              }
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="rounded-[1.75rem] border border-border/70 bg-white/75 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Ảnh QR thanh toán</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Tải 1 ảnh QR rõ nét. Hệ thống chỉ upload khi bạn bấm lưu.
                  </p>
                </div>
                <div className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  Tối đa {formatFileSize(MAX_PROFILE_QR_SIZE_BYTES)}
                </div>
              </div>

              <div
                className={`mt-4 rounded-[1.5rem] border border-dashed px-5 py-8 text-center transition-colors ${
                  isDragActive
                    ? "border-primary/60 bg-primary/8"
                    : "border-primary/25 bg-primary/5"
                }`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                  handleIncomingFile(event.dataTransfer.files?.[0]);
                }}
              >
                <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <UploadCloud className="size-6" />
                </div>
                <p className="mt-4 font-medium">Kéo thả ảnh vào đây hoặc chọn từ thiết bị</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Hỗ trợ PNG, JPG, WEBP và các định dạng ảnh phổ biến khác.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Button onClick={openFilePicker} type="button" variant="secondary">
                    <ImagePlus className="size-4" />
                    {draftQrImage || hasCurrentQr ? "Chọn ảnh khác" : "Tải ảnh QR"}
                  </Button>
                  {draftQrImage ? (
                    <Button
                      onClick={clearDraftQrImage}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4 text-destructive" />
                      Xóa ảnh đã chọn
                    </Button>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                  type="file"
                />
              </div>

              <FieldError error={qrFieldError} />

              {draftQrImage ? (
                <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                  <p className="text-sm font-medium">Sẵn sàng lưu ảnh mới</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {draftQrImage.file.name} • {formatFileSize(draftQrImage.file.size)}
                  </p>
                </div>
              ) : hasCurrentQr ? (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Nếu không chọn ảnh mới, hệ thống sẽ giữ nguyên ảnh QR hiện tại.
                </p>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Bạn chưa có ảnh QR nào trong hồ sơ.
                </p>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-border/70 bg-white/75 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{previewLabel}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {draftQrImage
                      ? "Xem trước ảnh trước khi lưu vào hồ sơ."
                      : hasCurrentQr
                        ? "Ảnh này đang được kế toán sử dụng để đối soát."
                        : "Chưa cập nhật ảnh QR"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex min-h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 p-6">
                {previewImageUrl ? (
                  <div className="relative aspect-square w-full max-w-72 overflow-hidden rounded-[1.25rem] border border-border/70 bg-white shadow-sm">
                    <Image
                      alt="Ảnh QR thanh toán"
                      className="object-contain p-4"
                      fill
                      src={previewImageUrl}
                      unoptimized
                    />
                  </div>
                ) : hasCurrentQr ? (
                  <p className="max-w-xs text-center text-sm leading-6 text-muted-foreground">
                    Đã có ảnh QR trong hệ thống nhưng hiện chưa tải được bản xem trước.
                  </p>
                ) : (
                  <p className="max-w-xs text-center text-sm leading-6 text-muted-foreground">
                    Chưa cập nhật ảnh QR
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null;
}

function formatFileSize(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(0)}MB`;
  }

  return `${Math.ceil(value / 1024)}KB`;
}
