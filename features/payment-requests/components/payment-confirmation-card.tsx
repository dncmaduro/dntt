"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmPaymentRequestPaidAction } from "@/features/payment-requests/actions";
import { PaymentBillGallery } from "@/features/payment-requests/components/payment-bill-gallery";
import {
  PaymentBillUploadField,
  type PaymentBillDraft,
} from "@/features/payment-requests/components/payment-bill-upload-field";
import { MAX_PAYMENT_BILLS } from "@/features/payment-requests/schemas";
import type { PaymentBillWithUrl } from "@/features/payment-requests/types";
import { formatDateTime, generatePaymentReference } from "@/lib/utils";

export function PaymentConfirmationCard({
  canConfirmPayment,
  currentPaymentBills,
  isPaid,
  paidAt,
  paymentReference,
  requestId,
}: {
  canConfirmPayment: boolean;
  currentPaymentBills: PaymentBillWithUrl[];
  isPaid: boolean;
  paidAt?: string | null;
  paymentReference?: string | null;
  requestId: string;
}) {
  const router = useRouter();
  const [draftBills, setDraftBills] = useState<PaymentBillDraft[]>([]);
  const [draftReference, setDraftReference] = useState("");
  const [billError, setBillError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const draftBillPreviewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    draftBillPreviewUrlsRef.current = draftBills.map((bill) => bill.previewUrl);
  }, [draftBills]);

  useEffect(() => {
    return () => {
      draftBillPreviewUrlsRef.current.forEach((previewUrl) => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      });
    };
  }, []);

  if (!canConfirmPayment && !isPaid) {
    return null;
  }

  const remainingBillSlots = Math.max(
    MAX_PAYMENT_BILLS - currentPaymentBills.length,
    0,
  );

  const replaceDraftBills = (nextBills: PaymentBillDraft[]) => {
    const nextBillIds = new Set(nextBills.map((bill) => bill.id));

    draftBills.forEach((bill) => {
      if (!nextBillIds.has(bill.id) && bill.previewUrl) {
        URL.revokeObjectURL(bill.previewUrl);
      }
    });

    setDraftBills(nextBills);
    setBillError(undefined);
    setDraftReference(nextBills.length ? generatePaymentReference() : "");
  };

  const confirmPayment = async () => {
    if (!draftBills.length) {
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

      draftBills.forEach((bill) => {
        formData.append("payment_bills", bill.file);
      });

      const result = await confirmPaymentRequestPaidAction(formData);

      if (!result.success) {
        setBillError(result.fieldErrors?.payment_bills?.[0]);
        toast.error(result.error);
        return;
      }

      replaceDraftBills([]);
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
          <CardDescription>Danh sách bill thanh toán đã lưu cho đề nghị này.</CardDescription>
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

          <div className="space-y-3">
            <p className="font-medium">Bill thanh toán</p>
            <PaymentBillGallery paymentBills={currentPaymentBills} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle className="text-xl">Xác nhận thanh toán</CardTitle>
        <CardDescription>Tải từ 1 đến tối đa 5 bill cho đề nghị này.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {currentPaymentBills.length ? (
          <div className="space-y-3">
            <p className="font-medium">Bill đã lưu</p>
            <PaymentBillGallery paymentBills={currentPaymentBills} />
          </div>
        ) : null}

        <PaymentBillUploadField
          disabled={isSubmitting || remainingBillSlots === 0}
          error={billError}
          maxFiles={remainingBillSlots}
          onChange={replaceDraftBills}
          onErrorChange={setBillError}
          value={draftBills}
        />

        <div className="space-y-2 hidden">
          <Label htmlFor="payment-reference-preview">Mã tham chiếu thanh toán</Label>
          <Input
            id="payment-reference-preview"
            placeholder="Sẽ tự tạo sau khi chọn bill"
            readOnly
            value={draftReference}
          />
        </div>

        <Button
          disabled={isSubmitting || remainingBillSlots === 0}
          onClick={confirmPayment}
          type="button"
        >
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
