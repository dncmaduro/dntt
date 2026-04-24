import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Button } from "@/components/ui/button";
import { RequestForm } from "@/features/payment-requests/components/request-form";
import {
  getCategories,
  getPaymentRequestDetail,
  getSubCategories,
} from "@/features/payment-requests/queries";
import { canManageOwnRequest } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { APP_ROUTES, type PaymentRequestStatus } from "@/lib/constants";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMyRequestPage({ params }: EditPageProps) {
  const profile = await requireRole(["employee", "accountant"]);
  const { id } = await params;
  const [request, categories, subCategories] = await Promise.all([
    getPaymentRequestDetail(id),
    getCategories(),
    getSubCategories(),
  ]);

  if (!request || request.user_id !== profile.id || request.is_deleted) {
    notFound();
  }

  const canEdit = canManageOwnRequest(
    profile.role,
    request.status as PaymentRequestStatus,
  );

  if (!canEdit) {
    notFound();
  }

  const detailHref = `${APP_ROUTES.myRequests}/${request.id}`;

  return (
    <div className="space-y-6">
      <PageIntro
        actions={
          <Button asChild variant="outline">
            <Link href={detailHref}>
              <ArrowLeft className="size-4" />
              Quay lại chi tiết
            </Link>
          </Button>
        }
        description="Cập nhật nội dung đề nghị và danh sách chứng từ trước khi gửi lại quy trình xử lý."
        eyebrow="Chỉnh sửa"
        title={request.title}
      />

      <RequestForm
        categories={categories}
        existingAttachments={request.attachments}
        existingPaymentQr={{
          fileName: request.payment_qr_name,
          fileType: request.payment_qr_type,
          signedUrl: request.payment_qr_signed_url,
        }}
        hasProfileQr={Boolean(request.owner?.qr_payment_url)}
        initialCreatorPaidBefore={!request.payment_qr_name}
        initialCategoryId={request.sub_category?.category_id ?? null}
        initialValues={{
          amount: request.amount ?? null,
          title: request.title,
          description: request.description ?? "",
          payment_date: request.payment_date,
          sub_category_id: request.sub_category_id ?? "",
        }}
        mode="edit"
        requestId={request.id}
        subCategories={subCategories}
      />
    </div>
  );
}
