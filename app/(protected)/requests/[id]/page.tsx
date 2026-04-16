import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentGallery } from "@/features/payment-requests/components/attachment-gallery";
import { PaymentConfirmationCard } from "@/features/payment-requests/components/payment-confirmation-card";
import { ReviewPanel } from "@/features/payment-requests/components/review-panel";
import { RequestTimeline } from "@/features/payment-requests/components/request-timeline";
import { StatusBadge } from "@/features/payment-requests/components/status-badge";
import {
  canMarkAsPaid,
  canReviewAccounting,
} from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { getPaymentRequestDetail } from "@/features/payment-requests/queries";
import { getProfileQrPreviewUrl } from "@/features/profile/queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { PaymentRequestStatus } from "@/lib/constants";

type ReviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RequestReviewDetailPage({
  params,
}: ReviewDetailPageProps) {
  const profile = await requireRole(["accountant", "director"]);
  const { id } = await params;
  const request = await getPaymentRequestDetail(id);

  if (!request || request.is_deleted) {
    notFound();
  }

  const ownerQrPreviewUrl = await getProfileQrPreviewUrl(request.owner?.qr_payment_url);

  const allowAccountingReview = canReviewAccounting(
    profile.role,
    request.status as PaymentRequestStatus,
  );
  const allowMarkPaid = canMarkAsPaid(
    profile.role,
    request.status as PaymentRequestStatus,
  );

  return (
    <div className="space-y-6">
      <PageIntro
        actions={
          <Button asChild variant="secondary">
            <Link href="/requests">Quay lại danh sách</Link>
          </Button>
        }
        description="Xem đầy đủ hồ sơ, chứng từ và thực hiện thao tác duyệt hoặc xác nhận thanh toán theo quyền hiện tại."
        eyebrow="Chi tiết xử lý"
        title={request.title}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle>Thông tin đề nghị</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <InfoItem label="Người tạo đề nghị">
                <p className="font-medium">{request.owner?.full_name ?? request.user_id}</p>
              </InfoItem>
              <InfoItem label="Trạng thái">
                <StatusBadge status={request.status as PaymentRequestStatus} />
              </InfoItem>
              <InfoItem label="Ngày thanh toán">
                <span className="font-medium">{formatDate(request.payment_date)}</span>
              </InfoItem>
              <InfoItem label="Số tiền">
                <span className="font-medium">{formatCurrency(request.amount)}</span>
              </InfoItem>
              <InfoItem label="Mô tả">
                <p className="leading-6 text-muted-foreground">
                  {request.description || "Không có mô tả"}
                </p>
              </InfoItem>
              <InfoItem className="md:col-span-2" label="QR thanh toán">
                {request.payment_qr_signed_url || ownerQrPreviewUrl ? (
                  <div className="space-y-3">
                    <div className="w-full max-w-[23rem] overflow-hidden rounded-[1.25rem] border border-border/70 bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={request.payment_qr_name ?? "QR người tạo đề nghị"}
                        className="h-auto w-full object-contain"
                        src={request.payment_qr_signed_url ?? ownerQrPreviewUrl ?? ""}
                      />
                    </div>
                    <div>
                      <a
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                        href={request.payment_qr_signed_url ?? ownerQrPreviewUrl ?? "#"}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Xem tệp
                        <ExternalLink className="size-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Chưa cập nhật</span>
                )}
              </InfoItem>
              {request.accounting_note ? (
                <InfoItem label="Ghi chú kế toán">
                  <p className="leading-6 text-muted-foreground">
                    {request.accounting_note}
                  </p>
                </InfoItem>
              ) : null}
            </CardContent>
          </Card>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Chứng từ đính kèm</h2>
            <AttachmentGallery attachments={request.attachments} />
          </section>
        </div>

        <div className="space-y-6">
          <ReviewPanel
            allowAccountingReview={allowAccountingReview}
            requestId={request.id}
          />

          <PaymentConfirmationCard
            canConfirmPayment={allowMarkPaid}
            isPaid={request.status === "paid"}
            paidAt={request.paid_at}
            paymentBillName={request.payment_bill_name}
            paymentBillType={request.payment_bill_type}
            paymentBillUrl={request.payment_bill_signed_url}
            paymentReference={request.payment_reference}
            requestId={request.id}
          />

          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle>Lịch sử xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestTimeline logs={request.logs} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-3xl bg-muted/35 p-4 md:col-span-1 ${className ?? ""}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 min-w-0 text-sm [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}
