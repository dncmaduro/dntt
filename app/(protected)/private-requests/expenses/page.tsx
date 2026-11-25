import { DataNavigationRegion } from "@/components/shared/data-loading-overlay";
import { PageIntro } from "@/components/shared/page-intro";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Card, CardContent } from "@/components/ui/card";
import { PrivateExpenseExportButton } from "@/features/private-requests/components/private-expense-export-button";
import { PrivateExpenseFilterBar } from "@/features/private-requests/components/private-expense-filter-bar";
import { PrivateExpenseList } from "@/features/private-requests/components/private-expense-list";
import {
  getCategories,
  getPrivateExpenseRequestListPage,
  getSubCategories,
  parsePrivateExpenseFilters,
} from "@/features/private-requests/queries";
import { APP_ROUTES } from "@/lib/constants";
import { requireRole } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/utils";

type PrivateExpensesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrivateExpensesPage({
  searchParams,
}: PrivateExpensesPageProps) {
  const profile = await requireRole(["accountant", "director"]);
  const resolvedSearchParams = await searchParams;
  const filters = await parsePrivateExpenseFilters(
    Promise.resolve(resolvedSearchParams),
  );
  const pageValue = Number(resolvedSearchParams.page);
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const [categories, subCategories, requests] = await Promise.all([
    getCategories(),
    getSubCategories(),
    getPrivateExpenseRequestListPage({ filters, page }),
  ]);
  const exportQuery = new URLSearchParams();
  if (filters.category) exportQuery.set("category", filters.category);
  if (filters.sub_category) exportQuery.set("sub_category", filters.sub_category);
  if (filters.month) exportQuery.set("month", filters.month);
  const exportHref = exportQuery.toString()
    ? `${APP_ROUTES.privateExpenseExport}?${exportQuery}`
    : APP_ROUTES.privateExpenseExport;

  return (
    <div className="space-y-6">
      <PageIntro
        actions={
          profile.role === "accountant" ? (
            <PrivateExpenseExportButton href={exportHref} />
          ) : null
        }
        title="Chi phí DNTT riêng"
      />
      <PaginationControls
        page={requests.page}
        pageSize={requests.pageSize}
        totalItems={requests.totalItems}
        totalPages={requests.totalPages}
      />
      <PrivateExpenseFilterBar
        categories={categories}
        filters={filters}
        subCategories={subCategories}
      />
      <DataNavigationRegion>
        <div className="space-y-6">
          <Card className="rounded-lg">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Tổng chi phí</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatCurrency(requests.totalAmount ?? 0)}
              </p>
            </CardContent>
          </Card>
          <PrivateExpenseList items={requests.items} />
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
