import { notFound } from "next/navigation";

import { PrivateRequestDetailView } from "@/features/private-requests/components/private-request-detail-view";
import { getPrivateRequestDetail } from "@/features/private-requests/queries";
import { APP_ROUTES } from "@/lib/constants";
import { requireRole } from "@/lib/auth/session";

export default async function PrivateRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["accountant", "director"]);
  const { id } = await params;
  const request = await getPrivateRequestDetail(id);

  if (!request) {
    notFound();
  }

  return (
    <PrivateRequestDetailView
      backHref={APP_ROUTES.privateRequests}
      request={request}
    />
  );
}
