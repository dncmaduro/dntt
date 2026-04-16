import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, PencilLine } from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentGallery } from "@/features/payment-requests/components/attachment-gallery";
import { DeleteRequestButton } from "@/features/payment-requests/components/delete-request-button";
import { RequestTimeline } from "@/features/payment-requests/components/request-timeline";
import { StatusBadge } from "@/features/payment-requests/components/status-badge";
import { getProfileQrPreviewUrl } from "@/features/profile/queries";
import {
  canManageOwnRequest,
  canSoftDeleteOwnRequest,
} from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { getPaymentRequestDetail } from "@/features/payment-requests/queries";
import { APP_ROUTES, type PaymentRequestStatus } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

type DetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MyRequestDetailPage({
  params,
}: DetailPageProps) {
  const profile = await requireRole(["employee", "accountant"]);
  const { id } = await params;
  const request = await getPaymentRequestDetail(id);

  if (!request || request.user_id !== profile.id || request.is_deleted) {
    notFound();
  }
  const ownerQrPreviewUrl = request.payment_qr_signed_url
    ? null
    : await getProfileQrPreviewUrl(request.owner?.qr_payment_url ?? null);
  const paymentQrPreviewUrl = request.payment_qr_signed_url ?? ownerQrPreviewUrl;
  const paymentQrName = request.payment_qr_signed_url
    ? request.payment_qr_name ?? "QR thanh toán"
    : "QR thanh toán mặc định";
  const requesterName = request.owner?.full_name ?? request.user_id;

  const detailHref = `${APP_ROUTES.myRequests}/${request.id}`;
  const editHref = `${detailHref}/edit`;

  const canEdit = canManageOwnRequest(
    profile.role,
    request.status as PaymentRequestStatus,
  );
  const canDelete = canSoftDeleteOwnRequest(
    profile.role,
    request.status as PaymentRequestStatus,
  );

  return (
    <div className="space-y-6">
      <PageIntro
        actions={
          <div className="flex flex-wrap gap-3">
            {canEdit ? (
              <Button asChild variant="secondary">
                <Link href={editHref}>
                  <PencilLine className="size-4" />
                  Chỉnh sửa
                </Link>
              </Button>
            ) : null}
            {canDelete ? <DeleteRequestButton requestId={request.id} /> : null}
          </div>
        }
        description="Theo dõi nội dung hồ sơ, chứng từ đính kèm và lịch sử xử lý theo thời gian."
        eyebrow="Chi tiết"
        title={request.title}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle>Thông tin đề nghị</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <InfoItem label="Người đề nghị">
              <span className="font-medium">{requesterName}</span>
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

        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle>Lịch sử xử lý</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestTimeline logs={request.logs} />
          </CardContent>
        </Card>
      </div>

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
