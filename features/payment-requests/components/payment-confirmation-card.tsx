"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, LoaderCircle, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { confirmPaymentRequestPaidAction } from "@/features/payment-requests/actions";
import {
  PaymentBillUploadField,
  type PaymentBillDraft,
} from "@/features/payment-requests/components/payment-bill-upload-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime, generatePaymentReference, isImageMimeType } from "@/lib/utils";

export function PaymentConfirmationCard({
  canConfirmPayment,
  isPaid,
  paidAt,
  paymentBillName,
  paymentBillType,
  paymentBillUrl,
  paymentReference,
  requestId,
}: {
  canConfirmPayment: boolean;
  isPaid: boolean;
  paidAt?: string | null;
  paymentBillName?: string | null;
  paymentBillType?: string | null;
  paymentBillUrl?: string | null;
  paymentReference?: string | null;
  requestId: string;
}) {
  const router = useRouter();
  const [draftBill, setDraftBill] = useState<PaymentBillDraft | null>(null);
  const [draftReference, setDraftReference] = useState("");
  const [billError, setBillError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (draftBill?.previewUrl) {
        URL.revokeObjectURL(draftBill.previewUrl);
      }
    };
  }, [draftBill]);

  if (!canConfirmPayment && !isPaid) {
    return null;
  }

  const replaceDraftBill = (nextBill: PaymentBillDraft | null) => {
    if (draftBill?.previewUrl) {
      URL.revokeObjectURL(draftBill.previewUrl);
    }

    setDraftBill(nextBill);
    setBillError(undefined);
    setDraftReference(nextBill ? generatePaymentReference() : "");
  };

  const confirmPayment = async () => {
    if (!draftBill) {
      setBillError("Vui lòng tải lên bill thanh toán trước khi xác nhận");
      return;
    }

    setBillError(undefined);
    setIsSubmitting(true);

    try {
      const reference = draftReference || generatePaymentReference();
      const formData = new FormData();
      formData.set("requestId", requestId);
      formData.set("payment_reference", reference);
      formData.set("payment_bill", draftBill.file);

      const result = await confirmPaymentRequestPaidAction(formData);

      if (!result.success) {
        setBillError(result.fieldErrors?.payment_bill?.[0]);
        toast.error(result.error);
        return;
      }

      replaceDraftBill(null);
      setDraftReference("");
      toast.success(result.message ?? "Đã xác nhận thanh toán");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPaid && !canConfirmPayment) {
    return (
      <Card className="rounded-[2rem]">
        <CardHeader>
          <CardTitle className="text-xl">Thông tin thanh toán</CardTitle>
          <CardDescription>
            Đề nghị này đã hoàn tất chi trả và được lưu bill thanh toán riêng.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <PaymentInfoItem label="Thời gian thanh toán">
              <span className="font-medium">{formatDateTime(paidAt)}</span>
            </PaymentInfoItem>
            <PaymentInfoItem label="Mã tham chiếu">
              <span className="font-medium">{paymentReference || "--"}</span>
            </PaymentInfoItem>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-white/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">Bill thanh toán</p>
              {paymentBillUrl ? (
                <Button asChild size="sm" variant="outline">
                  <a href={paymentBillUrl} rel="noreferrer" target="_blank">
                    <ExternalLink className="size-4" />
                    Xem bill
                  </a>
                </Button>
              ) : null}
            </div>

            {paymentBillUrl && isImageMimeType(paymentBillType) ? (
              <div className="mt-4 relative aspect-[4/3] overflow-hidden rounded-[1.25rem] border border-border/70 bg-muted/30">
                <Image
                  alt={paymentBillName || "Bill thanh toán"}
                  className="object-cover"
                  fill
                  src={paymentBillUrl}
                  unoptimized
                />
              </div>
            ) : (
              <div className="mt-4 rounded-[1.25rem] border border-dashed border-border/80 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                {paymentBillUrl
                  ? "Bill đã được lưu. Dùng nút “Xem bill” để mở chi tiết."
                  : "Chưa tải được bản xem trước của bill thanh toán."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle className="text-xl">Xác nhận thanh toán</CardTitle>
        <CardDescription>
          Tải lên đúng 1 ảnh bill thanh toán cho đề nghị này trước khi xác nhận.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <PaymentBillUploadField
          disabled={isSubmitting}
          error={billError}
          onChange={replaceDraftBill}
          onErrorChange={setBillError}
          value={draftBill}
        />

        <div className="space-y-2 hidden">
          <Label htmlFor="payment-reference-preview">Mã tham chiếu thanh toán</Label>
          <Input
            id="payment-reference-preview"
            placeholder="Sẽ tự tạo sau khi chọn ảnh bill"
            readOnly
            value={draftReference}
          />
        </div>

        <Button disabled={isSubmitting} onClick={confirmPayment} type="button">
          {isSubmitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ReceiptText className="size-4" />
          )}
          Xác nhận đã thanh toán
        </Button>
      </CardContent>
    </Card>
  );
}

function PaymentInfoItem({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-[1.5rem] border border-border/70 bg-white/70 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 min-w-0 text-sm [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}
