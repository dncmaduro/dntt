import { Download } from "lucide-react";

import { DataNavigationRegion } from "@/components/shared/data-loading-overlay";
import { PageIntro } from "@/components/shared/page-intro";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseFilterBar } from "@/features/payment-requests/components/expense-filter-bar";
import { ExpenseRequestList } from "@/features/payment-requests/components/expense-request-list";
import {
  getCategories,
  getExpenseRequestListPage,
  getSubCategories,
  parseListPage,
  parseExpenseFilters,
} from "@/features/payment-requests/queries";
import { requireRole } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/utils";

type ExpensesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  await requireRole(["accountant", "director"]);

  const resolvedSearchParams = await searchParams;
  const filters = await parseExpenseFilters(Promise.resolve(resolvedSearchParams));
  const page = parseListPage(resolvedSearchParams.page);
  const [categories, subCategories, requests] = await Promise.all([
    getCategories(),
    getSubCategories(),
    getExpenseRequestListPage({ filters, page }),
  ]);
  const totalAmount = requests.totalAmount ?? 0;
  const exportQuery = new URLSearchParams();

  (Object.entries(filters) as Array<[keyof typeof filters, string]>).forEach(
    ([key, value]) => {
      if (value && value !== "all") {
        exportQuery.set(key, value);
      }
    },
  );

  const exportHref = exportQuery.toString()
    ? `/expenses/export?${exportQuery.toString()}`
    : "/expenses/export";

  return (
    <div className="space-y-6">
      <PageIntro
        actions={
          <Button asChild>
            <a download href={exportHref}>
              <Download className="size-4" />
              Xuất DNTT
            </a>
          </Button>
        }
        title="Chi phí"
      />

      <PaginationControls
        page={requests.page}
        pageSize={requests.pageSize}
        totalItems={requests.totalItems}
        totalPages={requests.totalPages}
      />

      <ExpenseFilterBar
        categories={categories}
        filters={filters}
        subCategories={subCategories}
      />

      <DataNavigationRegion>
        <div className="space-y-6">
          <Card className="rounded-lg">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Tổng tiền</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatCurrency(totalAmount)}
              </p>
            </CardContent>
          </Card>

          <ExpenseRequestList items={requests.items} />
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
