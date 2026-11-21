import { PageIntro } from "@/components/shared/page-intro";
import { DataNavigationRegion } from "@/components/shared/data-loading-overlay";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { RequestFilterBar } from "@/features/payment-requests/components/request-filter-bar";
import { ReviewRequestList } from "@/features/payment-requests/components/review-request-list";
import {
  getCategories,
  getEmployeesForFilter,
  getRequestListPage,
  getSubCategories,
  parseListPage,
  parseRequestFilters,
} from "@/features/payment-requests/queries";
import { APP_ROUTES } from "@/lib/constants";
import { requireRole } from "@/lib/auth/session";

type RequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const profile = await requireRole(["accountant", "director"]);
  const resolvedSearchParams = await searchParams;
  const filters = await parseRequestFilters(Promise.resolve(resolvedSearchParams));
  const page = parseListPage(resolvedSearchParams.page);
  const [categories, creators, subCategories, requests] = await Promise.all([
    getCategories(),
    getEmployeesForFilter(),
    getSubCategories(),
    getRequestListPage({
      filters,
      page,
      scope: "all",
      userId: profile.id,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageIntro
        description="Lọc theo người tạo, trạng thái và thời gian."
        title="Tất cả đề nghị thanh toán"
      />

      <PaginationControls
        page={requests.page}
        pageSize={requests.pageSize}
        totalItems={requests.totalItems}
        totalPages={requests.totalPages}
      />

      <RequestFilterBar
        categories={categories}
        creators={creators}
        filters={filters}
        showCreator
        subCategories={subCategories}
      />

      <DataNavigationRegion>
        <div className="space-y-4">
          <ReviewRequestList
            currentRole={profile.role}
            detailHrefBase={APP_ROUTES.requests}
            emptyDescription="Không có đề nghị nào khớp với bộ lọc đang áp dụng."
            items={requests.items}
            showOwner
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
