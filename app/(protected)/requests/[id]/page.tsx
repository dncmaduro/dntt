import Link from "next/link";
import { notFound } from "next/navigation";

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
              <InfoItem label="Người tạo">
                <p className="font-medium">{request.owner?.full_name ?? "--"}</p>
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
              <InfoItem label="QR thanh toán">
                {ownerQrPreviewUrl ? (
                  <a
                    className="font-medium text-primary"
                    href={ownerQrPreviewUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Mở ảnh QR
                  </a>
                ) : (
                  <span className="text-muted-foreground">Chưa cập nhật</span>
                )}
              </InfoItem>
              <InfoItem label="Mô tả">
                <p className="leading-6 text-muted-foreground">
                  {request.description || "Không có mô tả"}
                </p>
              </InfoItem>
              <InfoItem label="Ghi chú">
                <p className="leading-6 text-muted-foreground">
                  {request.note || "Không có ghi chú"}
                </p>
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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-3xl bg-muted/35 p-4 md:col-span-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 min-w-0 text-sm [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}
