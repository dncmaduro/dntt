import { Download } from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseFilterBar } from "@/features/payment-requests/components/expense-filter-bar";
import { ExpenseRequestList } from "@/features/payment-requests/components/expense-request-list";
import {
  getCategories,
  getExpenseRequestList,
  getSubCategories,
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
  const [filters, categories, subCategories] = await Promise.all([
    parseExpenseFilters(Promise.resolve(resolvedSearchParams)),
    getCategories(),
    getSubCategories(),
  ]);
  const requests = await getExpenseRequestList({ filters });
  const totalAmount = requests.reduce(
    (total, request) => total + (request.amount ?? 0),
    0,
  );
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
        description="Theo dõi chi phí theo danh mục, danh mục con, tháng và trạng thái thanh toán."
        eyebrow="Chi phí"
        title="Chi phí"
      />

      <ExpenseFilterBar
        categories={categories}
        filters={filters}
        subCategories={subCategories}
      />

      <Card className="rounded-[1.75rem]">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Tổng tiền</p>
          <p className="mt-2 text-3xl font-semibold">
            {formatCurrency(totalAmount)}
          </p>
        </CardContent>
      </Card>

      <ExpenseRequestList items={requests} />
    </div>
  );
}
