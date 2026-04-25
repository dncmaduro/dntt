import { notFound } from "next/navigation";

import { RequestDetailView } from "@/features/payment-requests/components/request-detail-view";
import { requireRole } from "@/lib/auth/session";
import { getPaymentRequestDetail } from "@/features/payment-requests/queries";
import { APP_ROUTES } from "@/lib/constants";

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

  return (
    <RequestDetailView
      backHref={APP_ROUTES.requests}
      request={request}
      viewerRole={profile.role}
      viewerUserId={profile.id}
    />
  );
}
