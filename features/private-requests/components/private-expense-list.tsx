import Link from "next/link";
import { FolderSearch } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import type { PrivateExpenseRequestListItem } from "@/features/private-requests/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function PrivateExpenseList({
  items,
}: {
  items: PrivateExpenseRequestListItem[];
}) {
  if (!items.length) {
    return (
      <EmptyState
        action={null}
        description="Không có DNTT riêng nào khớp với bộ lọc đang áp dụng."
        icon={FolderSearch}
        title="Chưa có chi phí phù hợp"
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <table className="min-w-full divide-y divide-border/70">
          <thead className="bg-muted/35">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-5 py-4 font-medium">Tiêu đề</th>
              <th className="px-5 py-4 font-medium">Người tạo</th>
              <th className="px-5 py-4 font-medium">Danh mục</th>
              <th className="px-5 py-4 font-medium">Ngày phát sinh</th>
              <th className="px-5 py-4 font-medium">Số tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {items.map((item) => (
              <tr className="hover:bg-muted/20" key={item.id}>
                <td className="px-5 py-4">
                  <Link href={`/private-requests/${item.id}`}>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 line-clamp-1 text-muted-foreground">
                      {item.description || "—"}
                    </p>
                  </Link>
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {item.owner?.full_name ?? item.user_id}
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium">{item.category?.name ?? "—"}</p>
                  <p className="text-muted-foreground">
                    {item.sub_category?.name ?? "—"}
                  </p>
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {formatDate(item.payment_date)}
                </td>
                <td className="px-5 py-4 font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {items.map((item) => (
          <Card className="rounded-lg" key={item.id}>
            <CardContent className="space-y-4 p-5">
              <Link href={`/private-requests/${item.id}`}>
                <p className="line-clamp-2 font-semibold">{item.title}</p>
              </Link>
              <div className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Người tạo</span>
                  <span className="text-right font-medium">
                    {item.owner?.full_name ?? item.user_id}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Ngày phát sinh</span>
                  <span className="font-medium">{formatDate(item.payment_date)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Số tiền</span>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
