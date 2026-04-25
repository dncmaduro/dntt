import { notFound } from "next/navigation";

import { RequestDetailView } from "@/features/payment-requests/components/request-detail-view";
import { requireRole } from "@/lib/auth/session";
import { getPaymentRequestDetail } from "@/features/payment-requests/queries";
import { APP_ROUTES } from "@/lib/constants";

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

  return (
    <RequestDetailView
      backHref={APP_ROUTES.myRequests}
      request={request}
      viewerRole={profile.role}
      viewerUserId={profile.id}
    />
  );
}
