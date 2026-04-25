import Link from "next/link";
import { ExternalLink, PencilLine } from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentGallery } from "@/features/payment-requests/components/attachment-gallery";
import { DeleteRequestButton } from "@/features/payment-requests/components/delete-request-button";
import { PaymentBillGallery } from "@/features/payment-requests/components/payment-bill-gallery";
import { PaymentConfirmationCard } from "@/features/payment-requests/components/payment-confirmation-card";
import { RequestTimeline } from "@/features/payment-requests/components/request-timeline";
import { ReviewPanel } from "@/features/payment-requests/components/review-panel";
import { StatusBadge } from "@/features/payment-requests/components/status-badge";
import { getProfileQrPreviewUrl } from "@/features/profile/queries";
import type {
  PaymentRequestDetail,
} from "@/features/payment-requests/types";
import {
  canDeleteRequest,
  canManageOwnRequest,
  canMarkAsPaid,
  canReviewAccounting,
  canUndoAccountingReview,
} from "@/lib/auth/permissions";
import { APP_ROUTES, type PaymentRequestStatus, type UserRole } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function RequestDetailView({
  backHref,
  request,
  viewerRole,
  viewerUserId,
}: {
  backHref: string;
  request: PaymentRequestDetail;
  viewerRole: UserRole;
  viewerUserId: string;
}) {
  const ownerQrPreviewUrl = request.payment_qr_signed_url
    ? null
    : await getProfileQrPreviewUrl(request.owner?.qr_payment_url ?? null);
  const paymentQrPreviewUrl = request.payment_qr_signed_url ?? ownerQrPreviewUrl;
  const paymentQrName = request.payment_qr_signed_url
    ? request.payment_qr_name ?? "QR thanh toán"
    : "QR thanh toán mặc định";
  const requesterName = request.owner?.full_name ?? request.user_id;
  const isOwner = request.user_id === viewerUserId;

  const requestStatus = request.status as PaymentRequestStatus;
  const canEdit = isOwner && canManageOwnRequest(viewerRole, requestStatus);
  const canDelete = canDeleteRequest({
    isOwner,
    role: viewerRole,
    status: requestStatus,
  });
  const allowAccountingReview = canReviewAccounting(viewerRole, requestStatus);
  const allowUndoAccountingReview = canUndoAccountingReview(
    viewerRole,
    requestStatus,
  );
  const allowMarkPaid = canMarkAsPaid(viewerRole, requestStatus);

  const editHref = `${APP_ROUTES.myRequests}/${request.id}/edit`;

  return (
    <div className="space-y-6">
      <PageIntro
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href={backHref}>Quay lại danh sách</Link>
            </Button>
            {canEdit ? (
              <Button asChild variant="secondary">
                <Link href={editHref}>
                  <PencilLine className="size-4" />
                  Chỉnh sửa
                </Link>
              </Button>
            ) : null}
            {canDelete ? (
              <DeleteRequestButton
                redirectHref={backHref}
                requestId={request.id}
              />
            ) : null}
          </div>
        }
        description="Xem hồ sơ, chứng từ, lịch sử xử lý và thực hiện thao tác theo quyền hiện tại."
        eyebrow="Chi tiết đề nghị"
        title={request.title}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle>Thông tin đề nghị</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <InfoItem label="Người đề nghị">
                <p className="font-medium">{requesterName}</p>
              </InfoItem>
              <InfoItem label="Trạng thái">
                <StatusBadge status={requestStatus} />
              </InfoItem>
              <InfoItem label="Ngày thanh toán">
                <span className="font-medium">{formatDate(request.payment_date)}</span>
              </InfoItem>
              <InfoItem label="Số tiền">
                <span className="font-medium">{formatCurrency(request.amount)}</span>
              </InfoItem>
              <InfoItem label="Danh mục">
                <span className="font-medium">{request.category?.name ?? "—"}</span>
              </InfoItem>
              <InfoItem label="Danh mục con">
                <span className="font-medium">{request.sub_category?.name ?? "—"}</span>
              </InfoItem>
              <InfoItem label="Mô tả">
                <p className="leading-6 text-muted-foreground">
                  {request.description || "Không có mô tả"}
                </p>
              </InfoItem>
              <InfoItem className="md:col-span-2" label="QR thanh toán">
                {paymentQrPreviewUrl ? (
                  <div className="space-y-3">
                    <div className="w-full max-w-[23rem] overflow-hidden rounded-[1.25rem] border border-border/70 bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={paymentQrName}
                        className="h-auto w-full object-contain"
                        src={paymentQrPreviewUrl}
                      />
                    </div>
                    <div>
                      <a
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                        href={paymentQrPreviewUrl}
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
        </div>

        <div className="space-y-6">
          <ReviewPanel
            allowAccountingReview={allowAccountingReview}
            allowUndoAccountingReview={allowUndoAccountingReview}
            requestId={request.id}
          />

          <PaymentConfirmationCard
            canConfirmPayment={allowMarkPaid}
            currentPaymentBills={request.payment_bills}
            isPaid={request.status === "paid"}
            paidAt={request.paid_at}
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

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Bill thanh toán</h2>
        <PaymentBillGallery paymentBills={request.payment_bills} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Chứng từ đính kèm</h2>
        <AttachmentGallery attachments={request.attachments} />
      </section>
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
