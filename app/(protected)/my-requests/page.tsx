import Link from "next/link";

import { PageIntro } from "@/components/shared/page-intro";
import { Button } from "@/components/ui/button";
import { RequestFilterBar } from "@/features/payment-requests/components/request-filter-bar";
import { RequestList } from "@/features/payment-requests/components/request-list";
import {
  getCategories,
  getRequestList,
  getSubCategories,
  parseRequestFilters,
} from "@/features/payment-requests/queries";
import { APP_ROUTES } from "@/lib/constants";
import { requireRole } from "@/lib/auth/session";

type MyRequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MyRequestsPage({
  searchParams,
}: MyRequestsPageProps) {
  const profile = await requireRole(["employee", "accountant"]);
  const [filters, categories, subCategories] = await Promise.all([
    parseRequestFilters(searchParams),
    getCategories(),
    getSubCategories(),
  ]);
  const requests = await getRequestList({
    filters,
    scope: "mine",
    userId: profile.id,
  });

  return (
    <div className="space-y-6">
      <PageIntro
        actions={
          <Button asChild>
            <Link href={APP_ROUTES.newRequest}>Tạo đề nghị</Link>
          </Button>
        }
        description="Quản lý các đề nghị thanh toán do bạn tạo, theo dõi trạng thái và chỉnh sửa khi được phép."
        eyebrow="Cá nhân"
        title="DNTT của tôi"
      />

      <RequestFilterBar
        categories={categories}
        filters={filters}
        subCategories={subCategories}
      />

      <RequestList
        detailHrefBase={APP_ROUTES.myRequests}
        emptyDescription="Tạo đề nghị mới để bắt đầu theo dõi quá trình hoàn ứng trên hệ thống."
        items={requests}
      />
    </div>
  );
}
