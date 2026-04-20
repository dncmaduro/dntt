import { PageIntro } from "@/components/shared/page-intro";
import { RequestFilterBar } from "@/features/payment-requests/components/request-filter-bar";
import { ReviewRequestList } from "@/features/payment-requests/components/review-request-list";
import {
  getCategories,
  getEmployeesForFilter,
  getRequestList,
  getSubCategories,
  parseRequestFilters,
} from "@/features/payment-requests/queries";
import { APP_ROUTES } from "@/lib/constants";
import { requireRole } from "@/lib/auth/session";

type RequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const profile = await requireRole(["accountant", "director"]);
  const [filters, categories, creators, subCategories] = await Promise.all([
    parseRequestFilters(searchParams),
    getCategories(),
    getEmployeesForFilter(),
    getSubCategories(),
  ]);
  const requests = await getRequestList({
    filters,
    scope: "all",
    userId: profile.id,
  });

  return (
    <div className="space-y-6">
      <PageIntro
        description="Theo dõi toàn bộ đề nghị trên hệ thống, lọc theo người tạo và xử lý theo đúng vai trò của bạn."
        eyebrow="Duyệt hồ sơ"
        title="Tất cả đề nghị thanh toán"
      />

      <RequestFilterBar
        categories={categories}
        creators={creators}
        filters={filters}
        showCreator
        subCategories={subCategories}
      />

      <ReviewRequestList
        currentRole={profile.role}
        detailHrefBase={APP_ROUTES.requests}
        emptyDescription="Không có đề nghị nào khớp với bộ lọc đang áp dụng."
        items={requests}
        showOwner
      />
    </div>
  );
}
