import Link from "next/link";

import { DataNavigationRegion } from "@/components/shared/data-loading-overlay";
import { PageIntro } from "@/components/shared/page-intro";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Button } from "@/components/ui/button";
import { RequestFilterBar } from "@/features/payment-requests/components/request-filter-bar";
import { RequestList } from "@/features/payment-requests/components/request-list";
import {
  getCategories,
  getRequestListPage,
  getSubCategories,
  parseListPage,
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
  const resolvedSearchParams = await searchParams;
  const filters = await parseRequestFilters(Promise.resolve(resolvedSearchParams));
  const page = parseListPage(resolvedSearchParams.page);
  const [categories, subCategories, requests] = await Promise.all([
    getCategories(),
    getSubCategories(),
    getRequestListPage({
      filters,
      page,
      scope: "mine",
      userId: profile.id,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageIntro
        actions={
          <Button asChild>
            <Link href={APP_ROUTES.newRequest}>Tạo đề nghị</Link>
          </Button>
        }
        title="DNTT của tôi"
      />

      <PaginationControls
        page={requests.page}
        pageSize={requests.pageSize}
        totalItems={requests.totalItems}
        totalPages={requests.totalPages}
      />

      <RequestFilterBar
        categories={categories}
        filters={filters}
        subCategories={subCategories}
      />

      <DataNavigationRegion>
        <div className="space-y-4">
          <RequestList
            detailHrefBase={APP_ROUTES.myRequests}
            emptyDescription="Tạo đề nghị mới để theo dõi tại đây."
            items={requests.items}
          />
          <PaginationControls
            className="mb-10"
            page={requests.page}
            pageSize={requests.pageSize}
            totalItems={requests.totalItems}
            totalPages={requests.totalPages}
          />
        </div>
      </DataNavigationRegion>
    </div>
  );
}
