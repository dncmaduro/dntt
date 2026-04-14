import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilLine } from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentGallery } from "@/features/payment-requests/components/attachment-gallery";
import { DeleteRequestButton } from "@/features/payment-requests/components/delete-request-button";
import { RequestTimeline } from "@/features/payment-requests/components/request-timeline";
import { StatusBadge } from "@/features/payment-requests/components/status-badge";
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
