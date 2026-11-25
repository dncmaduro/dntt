import { DataNavigationRegion } from "@/components/shared/data-loading-overlay";
import { PageIntro } from "@/components/shared/page-intro";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { PrivateRequestFilterBar } from "@/features/private-requests/components/private-request-filter-bar";
import { PrivateRequestList } from "@/features/private-requests/components/private-request-list";
import {
  getCategories,
  getPrivateRequestCreators,
  getPrivateRequestListPage,
  getSubCategories,
  parsePrivateRequestFilters,
} from "@/features/private-requests/queries";
import { APP_ROUTES } from "@/lib/constants";
import { requireRole } from "@/lib/auth/session";

type PrivateRequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrivateRequestsPage({
  searchParams,
}: PrivateRequestsPageProps) {
  await requireRole(["accountant", "director"]);
  const resolvedSearchParams = await searchParams;
  const filters = await parsePrivateRequestFilters(
    Promise.resolve(resolvedSearchParams),
  );
  const pageValue = Number(resolvedSearchParams.page);
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const [categories, creators, subCategories, requests] = await Promise.all([
    getCategories(),
    getPrivateRequestCreators(),
    getSubCategories(),
    getPrivateRequestListPage({ filters, page }),
  ]);

  return (
    <div className="space-y-6">
      <PageIntro title="Tất cả DNTT riêng" />
      <PaginationControls
        page={requests.page}
        pageSize={requests.pageSize}
        totalItems={requests.totalItems}
        totalPages={requests.totalPages}
      />
      <PrivateRequestFilterBar
        categories={categories}
        creators={creators}
        filters={filters}
        subCategories={subCategories}
      />
      <DataNavigationRegion>
        <div className="space-y-4">
          <PrivateRequestList
            detailHrefBase={APP_ROUTES.privateDashboard}
            emptyDescription="Không có DNTT riêng nào khớp với bộ lọc đang áp dụng."
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
