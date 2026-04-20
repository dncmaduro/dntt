import Link from "next/link";
import { CalendarDays, FolderSearch, WalletCards } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ExpenseRequestListItem } from "@/features/payment-requests/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function ExpenseRequestList({
  items,
}: {
  items: ExpenseRequestListItem[];
}) {
  if (!items.length) {
    return (
      <EmptyState
        action={null}
        description="Không có đề nghị nào khớp với bộ lọc đang áp dụng."
        icon={FolderSearch}
        title="Chưa có chi phí phù hợp"
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-[2rem] border border-border/70 bg-white/75 md:block">
        <table className="min-w-full divide-y divide-border/70">
          <thead className="bg-muted/35">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-5 py-4 font-medium">Tiêu đề</th>
              <th className="px-5 py-4 font-medium">Người đề nghị</th>
              <th className="px-5 py-4 font-medium">Số tiền</th>
              <th className="px-5 py-4 font-medium">Ngày</th>
              <th className="px-5 py-4 font-medium">Danh mục</th>
              <th className="px-5 py-4 font-medium">Danh mục con</th>
              <th className="px-5 py-4 font-medium">Trạng thái thanh toán</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {items.map((item) => {
              const isPaid = item.status === "paid";

              return (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="px-5 py-4">
                    <Link className="block space-y-1" href={`/requests/${item.id}`}>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="line-clamp-1 text-muted-foreground">
                        {item.description || "Không có mô tả"}
                      </p>
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {item.owner?.full_name ?? item.user_id}
                  </td>
                  <td className="px-5 py-4 font-medium">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {formatDate(item.paid_at ?? item.payment_date)}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {item.category?.name ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {item.sub_category?.name ?? "—"}
                  </td>
                  <td className="px-5 py-4">
                    <PaymentStateBadge isPaid={isPaid} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {items.map((item) => {
          const isPaid = item.status === "paid";

          return (
            <Card key={item.id} className="rounded-[1.75rem]">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/requests/${item.id}`}>
                      <p className="line-clamp-2 font-semibold">{item.title}</p>
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.description || "Không có mô tả"}
                    </p>
                  </div>
                  <PaymentStateBadge isPaid={isPaid} />
                </div>

                <div className="grid gap-3 rounded-3xl bg-muted/40 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Người đề nghị</span>
                    <span className="text-right font-medium">
                      {item.owner?.full_name ?? item.user_id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <WalletCards className="size-4" />
                      Số tiền
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="size-4" />
                      Ngày
                    </span>
                    <span className="font-medium">
                      {formatDate(item.paid_at ?? item.payment_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Danh mục</span>
                    <span className="text-right font-medium">
                      {item.category?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Danh mục con</span>
                    <span className="text-right font-medium">
                      {item.sub_category?.name ?? "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function PaymentStateBadge({ isPaid }: { isPaid: boolean }) {
  return (
    <Badge
      className={
        isPaid
          ? "border-teal-200 bg-teal-50 text-teal-700 ring-teal-100"
          : "border-amber-200 bg-amber-50 text-amber-700 ring-amber-100"
      }
      variant="outline"
    >
      {isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
    </Badge>
  );
}
